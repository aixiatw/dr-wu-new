export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    // 密碼保護 /admin/ 路徑
    if (pathname.startsWith('/admin')) {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) {
        return new Response('Unauthorized', {
          status: 401,
          headers: { 'WWW-Authenticate': 'Basic realm="Protected Area"' },
        });
      }
      
      const [scheme, credentials] = authHeader.split(' ');
      if (scheme !== 'Basic' || credentials !== 'YWRtaW46RHdXdTIwMjU=') {
        return new Response('Forbidden', { status: 403 });
      }
    }

    if (pathname === '/api/content') {
      return handleContentApi(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleContentApi(request, env) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  if (request.method === 'GET') {
    if (!checkAuth(request, env)) return json({ error: 'Unauthorized' }, 401, cors);
    const data = await env.CONTENT.get('site_content');
    return new Response(data ?? 'null', { headers: { 'Content-Type': 'application/json', ...cors } });
  }
  if (request.method === 'PUT') {
    if (!checkAuth(request, env)) return json({ error: 'Unauthorized' }, 401, cors);
    await env.CONTENT.put('site_content', await request.text());
    return json({ ok: true }, 200, cors);
  }
  return json({ error: 'Method Not Allowed' }, 405, cors);
}

function checkAuth(request, env) {
  return (request.headers.get('Authorization') ?? '') === 'Bearer ' + (env.ADMIN_PASSWORD || '');
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...extra } });
}