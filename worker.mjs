export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname, method } = url;

    // 密碼保護：訪問 /admin/ 路徑需要驗證
    if (pathname.startsWith('/admin')) {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) {
        return new Response('Unauthorized', {
          status: 401,
          headers: {
            'WWW-Authenticate': 'Basic realm="Protected Area"',
          },
        });
      }
      
      const [scheme, credentials] = authHeader.split(' ');
      if (scheme !== 'Basic' || credentials !== 'YXp4Y3Zibm0xNjg6YXp4Y3Zibm0xNjg=') {
        return new Response('Forbidden', {
          status: 403,
        });
      }
    }

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    if (pathname === '/api/content') {
      return handleContentApi(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleContentApi(request, env) {
  const cors = corsHeaders();

  if (request.method === 'GET') {
    if (!checkAuth(request, env)) {
      return json({ error: 'Unauthorized' }, 401, cors);
    }
    try {
      const data = await env.CONTENT.get('site_content');
      return new Response(data ?? 'null', {
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    } catch (e) {
      return json({ error: 'KV read failed' }, 500, cors);
    }
  }

  if (request.method === 'PUT') {
    if (!checkAuth(request, env)) {
      return json({ error: 'Unauthorized' }, 401, cors);
    }
    try {
      const body = await request.text();
      JSON.parse(body);
      await env.CONTENT.put('site_content', body);
      return json({ ok: true, saved: new Date().toISOString() }, 200, cors);
    } catch (e) {
      return json({ error: e instanceof SyntaxError ? 'Invalid JSON' : 'KV write failed' }, 500, cors);
    }
  }

  return json({ error: 'Method Not Allowed' }, 405, cors);
}

function checkAuth(request, env) {
  const adminPassword = env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  return (request.headers.get('Authorization') ?? '') === 'Bearer ' + adminPassword;
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}