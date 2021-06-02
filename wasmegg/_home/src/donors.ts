type FixedLengthArray<T, L extends number> = [T, ...T[]] & { length: L };

export const donors: FixedLengthArray<string, 8> = [
  'DhrMekmek',
  'M* A*',
  'Pete Tycoon',
  '420gold#2928',
  'b***5',
  'l***a',
  'blacketj',
  'W1Z4RD#8721',
];
