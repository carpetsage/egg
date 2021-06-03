type FixedLengthArray<T, L extends number> = [T, ...T[]] & { length: L };

export const donors: FixedLengthArray<string, 10> = [
  'DhrMekmek',
  'CW_Mikey',
  'Pete Tycoon',
  'WhaiFuji#4379',
  'Vijay',
  '420gold#2928',
  'bombbomb345',
  'l***a',
  'blacketj',
  'W1Z4RD#8721',
];
