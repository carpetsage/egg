type FixedLengthArray<T, L extends number> = [T, ...T[]] & { length: L };

export const donors: FixedLengthArray<string, 1> = [
    "kjkawa"
];
