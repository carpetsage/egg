type FixedLengthArray<T, L extends number> = [T, ...T[]] & { length: L };

export const donors: FixedLengthArray<string, 5> = [
  "kjkawa",
  "Owen#0805",
  "synthparadox",
  "kok-kakarott",
  "lorgle",
];
