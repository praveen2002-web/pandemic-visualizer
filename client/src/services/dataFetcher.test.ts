import { describe, it, expect, vi } from 'vitest';
import { normalizeCountry } from './dataFetcher';
import { ebolaFetcher } from './ebolaFetcher';

describe('normalizeCountry', () => {
  const base = { country: 'France', countryInfo: { iso2: 'FR' }, cases: 0, deaths: 0, recovered: 0, active: 0, tests: 0, population: 0 };

  it('gives 0% fatality when there are zero cases', () => {
    expect(normalizeCountry(base)?.fatalityRate).toBe(0);
  });

  it('rounds fatality rate to one decimal', () => {
    expect(normalizeCountry({ ...base, cases: 300, deaths: 1 })?.fatalityRate).toBe(0.3);
  });

  it('skips rows with no ISO code instead of guessing one', () => {
    expect(normalizeCountry({ ...base, country: 'MS Zaandam', countryInfo: {} })).toBeNull();
  });
});

describe('ebolaFetcher', () => {
  it('skips null-case rows and rows with no ISO code', async () => {
    const rows = [
      { country: 'Guinea', countryInfo: { iso2: 'GN' }, cases: 10, deaths: 5, recovered: null, active: null },
      { country: 'Nowhere', countryInfo: null, cases: 3, deaths: 1, recovered: null, active: null },
      { country: 'Mali', countryInfo: { iso2: 'ML' }, cases: null, deaths: null, recovered: null, active: null },
    ];
    vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => rows }));
    const result = await ebolaFetcher.fetchEbolaCountries();
    expect(Object.keys(result)).toEqual(['GN']);
    expect(result.GN.fatalityRate).toBe(50);
    expect(result.GN.active).toBe(5);
  });
});
