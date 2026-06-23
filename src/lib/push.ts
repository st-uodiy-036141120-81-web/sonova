/** Convert VAPID public key (base64url) to Uint8Array for PushManager */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function getVapidPublicKey(): string | undefined {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  return key?.trim() || undefined;
}
