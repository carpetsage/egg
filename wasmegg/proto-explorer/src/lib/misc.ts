// [min, max)
function randomRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min) + min);
}

export function randomEiUserId(): string {
  return `EI${randomRange(1e15, 1e16)}`;
}
