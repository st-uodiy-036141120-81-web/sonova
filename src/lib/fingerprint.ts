/** Client-side audio fingerprint: SHA-256 of file + sampled PCM peaks */
export async function computeAudioFingerprint(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const fullHash = await crypto.subtle.digest('SHA-256', buffer);
  const fullHex = bufToHex(fullHash);

  try {
    const ctx = new AudioContext();
    const decoded = await ctx.decodeAudioData(buffer.slice(0));
    const ch = decoded.getChannelData(0);
    const samples = 64;
    const step = Math.floor(ch.length / samples);
    let peaks = '';
    for (let i = 0; i < samples; i++) {
      peaks += Math.round(Math.abs(ch[i * step] ?? 0) * 1000).toString(36);
    }
    await ctx.close();
    const peakHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(peaks));
    return `${fullHex.slice(0, 16)}-${bufToHex(peakHash).slice(0, 16)}`;
  } catch {
    return fullHex.slice(0, 32);
  }
}

function bufToHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
