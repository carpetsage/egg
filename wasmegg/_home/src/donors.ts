type FixedLengthArray<T, L extends number> = [T, ...T[]] & { length: L };

export const donors: FixedLengthArray<string, 17> = [
  'DhrMekmek',
  'CW_Mikey',
  'Pete Tycoon',
  'Zulima',
  'KCCKirby#5225',
  'E* S*',
  'WhaiFuji#4379',
  'Vijay',
  '420gold#2928',
  'bombbomb345',
  'l***a',
  'DelaqueESN',
  'forty2#9911',
  'blacketj',
  'calvin1719',
  'W1Z4RD#8721',
  'Professor',
];
