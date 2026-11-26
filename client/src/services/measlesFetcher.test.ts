import { describe, it, expect } from 'vitest';
import { parseMeaslesCsv, addMeaslesDeaths } from './measlesFetcher';

describe('addMeaslesDeaths', () => {
  const header = 'entity,code,year,cases_static,deaths';
  const us = (): Parameters<typeof addMeaslesDeaths>[0] => ({ US: { country: 'United States', countryCode: 'US', cases: 1 } });

  it('totals recorded deaths, skipping blank years and unknown codes', () => {
    const countries = us();
    const csv = [header, 'United States,USA,1919,10,7', 'United States,USA,2022,5,0', 'United States,USA,2023,59,', 'World,OWID_WRL,2020,1,99'].join('\n');
    expect(addMeaslesDeaths(countries, csv, { USA: 'US' })).toEqual({ totalDeaths: 7, deathsCoverage: 'United States only, 1919-2022' });
    expect(countries.US.deaths).toBe(7);
  });

  it('leaves deaths undefined when the file is unavailable', () => {
    const countries = us();
    expect(addMeaslesDeaths(countries, '', { USA: 'US' })).toEqual({ totalDeaths: 0 });
    expect(countries.US.deaths).toBeUndefined();
  });
});

describe('parseMeaslesCsv', () => {
  const csv = [
    'entity,code,year,measles__number_of_reported_cases',
    'Afghanistan,AFG,2022,100',
    'Afghanistan,AFG,2024,300',
    'Afghanistan,AFG,2023,200',
    '"Bonaire, Sint Eustatius and Saba",BES,2024,5',
    'World,OWID_WRL,2024,999999',
    'Africa,,2024,5000',
  ].join('\n');

  it('keeps the latest year per country and skips aggregates and unknown codes', () => {
    const { countries, latestYear } = parseMeaslesCsv(csv, { AFG: 'AF' });
    expect(countries).toEqual({ AF: { country: 'Afghanistan', countryCode: 'AF', cases: 300 } });
    expect(latestYear).toBe(2024);
  });

  it('handles quoted names containing commas', () => {
    expect(parseMeaslesCsv(csv, { BES: 'BQ' }).countries.BQ.country).toBe('Bonaire, Sint Eustatius and Saba');
  });
});
