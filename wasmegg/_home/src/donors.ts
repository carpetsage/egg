type FixedLengthArray<T, L extends number> = [T, ...T[]] & { length: L };

export const donors: FixedLengthArray<string, 20> = [
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
  'laura',
  'DelaqueESN',
  'forty2#9911',
  'blacketj',
  'K9Confetti',
  'calvin1719',
  'W1Z4RD#8721',
  'Professor',
  'aloe-scotch#2563',
  'BobSki778',
];
