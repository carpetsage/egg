export class ImpossibleError extends Error {
  constructor(message: string) {
    super(`the impossible happened, please contact the developer of this tool: ${message}`);
  }
}

export function range(n: number): number[] {
  return [...Array(n).keys()];
}

export function newArray<T>(length: number, initializer: (i: number) => T): T[] {
  return range(length).map(i => initializer(i));
}

export function notNull<T>(x: T | null): x is T {
  return x !== null;
}
