import { describe, it, expect, vi } from 'vitest';
import { normalizeCountry, normalizeHistorical, normalizeVaccinations } from './dataFetcher';
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

describe('normalizeVaccinations', () => {
  it('uses the latest available fully vaccinated percentage and maps by ISO3', () => {
    const result = normalizeVaccinations([
      {
        iso_code: 'FRA',
        data: [
          { date: '2021-06-01', people_fully_vaccinated_per_hundred: 20 },
          { date: '2021-07-01', people_fully_vaccinated_per_hundred: 55.5 },
        ],
      },
    ]);

    expect(result.FRA).toBe(55.5);
  });

  it('falls back to the people-vaccinated percentage when full-vaccination data is absent', () => {
    const result = normalizeVaccinations([
      {
        iso_code: 'NOR',
        data: [{ date: '2021-07-01', people_vaccinated_per_hundred: 72 }],
      },
    ]);

    expect(result.NOR).toBe(72);
  });
});

describe('normalizeHistorical', () => {
  it('sorts historical dates and converts cumulative totals to daily values', () => {
    const result = normalizeHistorical([
      {
        country: 'France',
        timeline: {
          cases: { '1/3/21': 125, '1/1/21': 100, '1/2/21': 110 },
          deaths: { '1/3/21': 12, '1/1/21': 10, '1/2/21': 11 },
        },
      },
    ]);

    expect(result.france.dates).toEqual(['1/1/21', '1/2/21', '1/3/21']);
    expect(result.france.dailyCases).toEqual([0, 10, 15]);
    expect(result.france.dailyDeaths).toEqual([0, 1, 1]);
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
