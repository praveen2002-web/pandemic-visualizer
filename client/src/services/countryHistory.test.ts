import { describe, it, expect } from 'vitest';
import {
  buildSeries,
  cumulativeToDaily,
  covidHistory,
  measlesHistory,
  staticHistory,
  regionMatches,
  matchRegions,
  yearRange,
} from './countryHistory';
import { normalizeHistorical } from './dataFetcher';
import { parseMeaslesSeries } from './measlesFetcher';

const meta = { dataSource: 'example.org', lastUpdated: '2025-01-01' };

describe('cumulative conversion', () => {
  it('counts the first value and clamps negative corrections', () => {
    const daily = cumulativeToDaily({ '1/2/20': 10, '1/1/20': 4, '1/3/20': 8 });
    expect(daily.map(d => d.value)).toEqual([4, 6, 0]);
  });

  it('sums by month and year', () => {
    const s = buildSeries({ '12/31/20': 5, '1/1/21': 9, '2/1/21': 12 }, { '12/31/20': 1, '1/1/21': 1, '2/1/21': 3 });
    expect(s.years).toEqual([2020, 2021]);
    expect(s.annual).toEqual([
      { year: 2020, cases: 5, deaths: 1 },
      { year: 2021, cases: 7, deaths: 2 },
    ]);
    expect(s.monthly?.[2021].map(m => m.cases)).toEqual([4, 3]);
  });
});

describe('province summing', () => {
  it('adds rows that share a country instead of overwriting', () => {
    const row = (n: number) => ({ country: 'Canada', timeline: { cases: { '1/1/20': n, '1/2/20': n * 2 }, deaths: {} } });
    expect(normalizeHistorical([row(1), row(10)]).canada.dailyCases).toEqual([0, 11]);
  });
});

describe('region matching', () => {
  it('ignores accents and punctuation and uses aliases', () => {
    expect(regionMatches('quebec', ['Québec'])).toBe(true);
    expect(regionMatches('inner mongolia', ['Nei Mongol'])).toBe(true);
    expect(regionMatches('Ontario', ['x|Ontario'])).toBe(true);
    expect(regionMatches('Ontario', ['Alberta', null])).toBe(false);
  });
});

describe('shape assignment', () => {
  it('does not give a shape to a region because of an alternate name another shape owns', () => {
    const regions = [{ name: 'Washington' }, { name: 'District of Columbia' }];
    const matched = matchRegions(regions, [
      { name: 'District of Columbia', alternates: ['Washington'] },
      { name: 'Washington' },
      { name: 'Old name', alternates: ['Washington'] },
    ]);
    expect(matched.map(r => r?.name)).toEqual(['District of Columbia', 'Washington', undefined]);
  });
});

describe('year range', () => {
  it('is sorted, unique and keeps gaps', () => {
    expect(yearRange([{ year: 2020 }, { year: 2001 }, { year: 2020 }])).toEqual([2001, 2020]);
  });
});

describe('empty data', () => {
  it.each([
    ['covid', covidHistory(null)],
    ['measles', measlesHistory([])],
    ['ebola', staticHistory(undefined, meta)],
    ['westnile', staticHistory({ dataNotes: null }, meta)],
  ])('%s has no years or invented rows', (_, history) => {
    expect(history.years).toEqual([]);
    expect(history.annual).toEqual([]);
    expect(history.regions).toBeUndefined();
  });
});

describe('optional yearly data', () => {
  it('reads a timeline from a static record', () => {
    const h = staticHistory({ timeline: { '2015': { cases: 2 }, '2014': { cases: 9, deaths: 1 } } }, meta);
    expect(h.years).toEqual([2014, 2015]);
    expect(h.annual[1].deaths).toBeUndefined();
  });

  it('keeps every measles year and leaves blank deaths missing', () => {
    const series = parseMeaslesSeries(
      'entity,code,year,n\nIndia,IND,2020,5\nIndia,IND,2021,7',
      'entity,code,year,cases_static,deaths\nIndia,IND,2020,5,2\nIndia,IND,2021,7,',
      { IND: 'IN' }
    );
    expect(series.IN).toEqual([{ year: 2020, cases: 5, deaths: 2 }, { year: 2021, cases: 7 }]);
  });
});
