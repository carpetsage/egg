import { describe, expect, it } from 'vitest';

import { parseTankIds, serializeTankIds } from './tank-ids';

describe('parseTankIds / serializeTankIds', () => {
  it('round-trips a single id (legacy format)', () => {
    expect(parseTankIds('afx1')).toEqual(['afx1']);
    expect(serializeTankIds(['afx1'])).toBe('afx1');
    expect(serializeTankIds(parseTankIds('afx1'))).toBe('afx1');
  });

  it('round-trips multiple ids', () => {
    expect(parseTankIds('afx1,afx2,afx3')).toEqual(['afx1', 'afx2', 'afx3']);
    expect(serializeTankIds(['afx1', 'afx2', 'afx3'])).toBe('afx1,afx2,afx3');
  });

  it('dedups while preserving first-occurrence order', () => {
    expect(parseTankIds('afx1,afx2,afx1,afx3,afx2')).toEqual(['afx1', 'afx2', 'afx3']);
  });

  it('trims whitespace around each id', () => {
    expect(parseTankIds(' afx1 , afx2,  afx3 ')).toEqual(['afx1', 'afx2', 'afx3']);
  });

  it('filters empty entries from stray commas', () => {
    expect(parseTankIds('afx1,,afx2,')).toEqual(['afx1', 'afx2']);
    expect(parseTankIds(',,,')).toEqual([]);
  });

  it('returns [] for empty/undefined/null input', () => {
    expect(parseTankIds(undefined)).toEqual([]);
    expect(parseTankIds(null)).toEqual([]);
    expect(parseTankIds('')).toEqual([]);
  });

  it('serializes an empty array back to an empty string', () => {
    expect(serializeTankIds([])).toBe('');
  });
});
