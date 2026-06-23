/** Extract waveform peaks from audio file for real visualization */
export async function extractWaveformPeaks(file: File, bars = 64): Promise<number[]> {
  const buffer = await file.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(buffer.slice(0));
    const ch = decoded.getChannelData(0);
    const block = Math.floor(ch.length / bars);
    const peaks: number[] = [];
    for (let i = 0; i < bars; i++) {
      let max = 0;
      const start = i * block;
      for (let j = 0; j < block; j++) {
        max = Math.max(max, Math.abs(ch[start + j] ?? 0));
      }
      peaks.push(Math.round(max * 1000) / 1000);
    }
    return peaks;
  } finally {
    await ctx.close();
  }
}
