export function fitTreeZoom(width: number, height: number, availableWidth: number, availableHeight: number): number {
  if (![width, height, availableWidth, availableHeight].every((value) => Number.isFinite(value) && value > 0)) return 1;
  const scale = Math.min(1, availableWidth / width, availableHeight / height);
  // Round down so the last row and rightmost card stay inside the viewport.
  return Math.max(0.001, Math.floor(scale * 1000) / 1000);
}
