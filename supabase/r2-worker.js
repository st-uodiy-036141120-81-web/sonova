/**
 * Cloudflare Worker for R2 uploads (deploy separately)
 * Bind R2 bucket as env.MEDIA, set ALLOWED_ORIGIN
 */
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN ?? '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const form = await request.formData();
    const file = form.get('file');
    const path = form.get('path');
    const bucket = form.get('bucket');
    if (!file || !path) return new Response('Missing file/path', { status: 400 });

    const key = `${bucket}/${path}`;
    await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } });

    const url = `${env.PUBLIC_BASE_URL}/${key}`;
    return new Response(JSON.stringify({ url }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN ?? '*',
      },
    });
  },
};
