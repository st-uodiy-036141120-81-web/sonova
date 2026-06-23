import { supabase } from './supabase';

const CDN_BASE = import.meta.env.VITE_CDN_BASE_URL as string | undefined;
const R2_UPLOAD_URL = import.meta.env.VITE_R2_UPLOAD_URL as string | undefined;

/** Rewrite storage URL through CDN if configured */
export function cdnUrl(url: string): string {
  if (!CDN_BASE) return url;
  try {
    const u = new URL(url);
    return `${CDN_BASE.replace(/\/$/, '')}${u.pathname}`;
  } catch {
    return url;
  }
}

export async function uploadFile(bucket: 'avatars' | 'songs', path: string, file: File): Promise<string> {
  if (R2_UPLOAD_URL) {
    const form = new FormData();
    form.append('file', file);
    form.append('path', path);
    form.append('bucket', bucket);
    const res = await fetch(R2_UPLOAD_URL, { method: 'POST', body: form });
    if (!res.ok) throw new Error('R2 upload failed');
    const { url } = (await res.json()) as { url: string };
    return cdnUrl(url);
  }

  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: bucket === 'avatars' });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return cdnUrl(data.publicUrl);
}
