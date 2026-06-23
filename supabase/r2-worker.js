/**
 * Cloudflare Worker for R2 uploads (deploy separately)
 * Bind R2 bucket as env.MEDIA, set ALLOWED_ORIGIN + SUPABASE_URL + SUPABASE_ANON_KEY
 */
async function verifySupabaseUser(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: env.SUPABASE_ANON_KEY,
    },
  });
  if (!res.ok) return null;
  return res.json();
}

function corsHeaders(env) {
  const origin = env.ALLOWED_ORIGIN;
  if (!origin) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(env);

    if (request.method === 'OPTIONS') {
      if (!env.ALLOWED_ORIGIN) return new Response('Forbidden', { status: 403 });
      return new Response(null, { headers: cors });
    }
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const user = await verifySupabaseUser(request, env);
    if (!user?.id) return new Response('Unauthorized', { status: 401 });

    const form = await request.formData();
    const file = form.get('file');
    const path = form.get('path');
    const bucket = form.get('bucket');
    if (!file || !path || typeof path !== 'string') {
      return new Response('Missing file/path', { status: 400 });
    }
    if (bucket !== 'avatars' && bucket !== 'songs') {
      return new Response('Invalid bucket', { status: 400 });
    }

    const segments = path.split('/').filter(Boolean);
    const uid = user.id;
    const allowed =
      (bucket === 'avatars' && segments[0] === uid) ||
      (bucket === 'songs' &&
        (segments[0] === uid ||
          segments[0] === 'comments' && segments[1] === uid ||
          segments[0] === 'voice' && segments[1] === uid ||
          segments.length >= 1));

    if (!allowed) return new Response('Forbidden path', { status: 403 });

    const key = `${bucket}/${path}`;
    await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } });

    const url = `${env.PUBLIC_BASE_URL}/${key}`;
    return new Response(JSON.stringify({ url }), {
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  },
};
