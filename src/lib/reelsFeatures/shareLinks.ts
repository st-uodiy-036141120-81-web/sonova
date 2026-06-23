export function buildReelShareUrl(songId: string, clipStart?: number, clipEnd?: number): string {
  const base = `${window.location.origin}/reels?song=${songId}`;
  if (clipStart != null && clipEnd != null) {
    return `${base}&clipStart=${clipStart}&clipEnd=${clipEnd}`;
  }
  return base;
}

export function buildClipEmbedUrl(songId: string): string {
  return `${window.location.origin}/embed/${songId}?clip=1`;
}

export function buildWhatsAppShareUrl(text: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
}

export function buildQrUrl(data: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;
}
