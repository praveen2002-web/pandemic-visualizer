/**
 * Per-country history for the dashboard. Never estimates: a missing value stays missing.
 */
import type { CountryHistory, PandemicType, YearlyTimeline } from '@/types/pandemic';
import { measlesFetcher, type MeaslesYear } from './measlesFetcher';
import { ebolaFetcher } from './ebolaFetcher';
import { westNileFetcher } from './westNileFetcher';

const DISEASE_SH = 'https://disease.sh/v3/covid-19';
const COVID_SOURCE = { name: 'JHU CSSE via disease.sh', url: 'https://disease.sh' };
const NOT_REGIONS = /princess|zaandam|repatriat|unknown|recovered/i;

type Cumulative = Record<string, number>; // 'M/D/YY' -> running total
type Region = NonNullable<CountryHistory['regions']>[number];

export interface Daily {
  year: number;
  month: number;
  day: number;
  value: number;
}

/** Running totals to new-per-day figures. Downward corrections are clamped to 0. */
export function cumulativeToDaily(cumulative: Cumulative): Daily[] {
  const points = Object.entries(cumulative)
    .map(([date, total]) => {
      // accepts 'M/D/YY' (JHU) and 'YYYY-MM-DD' (NYT)
      const iso = date.includes('-');
      const [a, b, c] = date.split(iso ? '-' : '/').map(Number);
      const [year, month, day] = iso ? [a, b, c] : [2000 + c, a, b];
      return { year, month, day, total };
    })
    .filter(p => Number.isFinite(p.total) && Number.isFinite(p.year))
    .sort((x, y) => x.year - y.year || x.month - y.month || x.day - y.day);

  return points.map((p, i) => ({
    year: p.year,
    month: p.month,
    day: p.day,
    value: Math.max(0, p.total - (i === 0 ? 0 : points[i - 1].total)),
  }));
}

export function buildSeries(
  cases: Cumulative,
  deaths?: Cumulative
): Pick<CountryHistory, 'years' | 'annual' | 'monthly'> {
  const buckets = new Map<string, { year: number; month: number; cases: number; deaths?: number }>();
  const add = (rows: Daily[], field: 'cases' | 'deaths') => {
    for (const { year, month, value } of rows) {
      const key = `${year}-${month}`;
      const bucket = buckets.get(key) ?? { year, month, cases: 0 };
      bucket[field] = (bucket[field] ?? 0) + value;
      buckets.set(key, bucket);
    }
  };
  add(cumulativeToDaily(cases), 'cases');
  if (deaths) add(cumulativeToDaily(deaths), 'deaths');

  const monthly: NonNullable<CountryHistory['monthly']> = {};
  const annual = new Map<number, CountryHistory['annual'][number]>();
  for (const { year, month, cases: c, deaths: d } of Array.from(buckets.values()).sort(
    (a, b) => a.year - b.year || a.month - b.month
  )) {
    (monthly[year] ??= []).push({ month, cases: c, deaths: d });
    const total = annual.get(year) ?? { year, cases: 0 };
    total.cases += c;
    if (d !== undefined) total.deaths = (total.deaths ?? 0) + d;
    annual.set(year, total);
  }
  const rows = Array.from(annual.values());
  return { years: yearRange(rows), annual: rows, monthly };
}

/** Years that actually have data, ascending and unique. */
export function yearRange(rows: { year: number }[]): number[] {
  return Array.from(new Set(rows.map(r => r.year))).sort((a, b) => a - b);
}

export function toRegion(name: string, cases: Cumulative, deaths?: Cumulative, population?: number): Region {
  const byYear: Region['byYear'] = {};
  for (const { year, cases: c, deaths: d } of buildSeries(cases, deaths).annual) {
    byYear[year] = { cases: c, deaths: d };
  }
  return { name, population, byYear };
}

// ─── Region name matching ───────────────────────────────────────────────────
export function normalizeRegionName(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// data-source spelling -> Natural Earth spelling (both normalised)
const REGION_ALIASES: Record<string, string> = {
  innermongolia: 'neimongol',
  tibet: 'xizang',
  reunion: 'lareunion',
  yukon: 'yukonterritory',
};

export function regionKey(name: string): string {
  const key = normalizeRegionName(name);
  return REGION_ALIASES[key] ?? key;
}

/** True when any of a map shape's names refers to the data region. */
export function regionMatches(dataName: string, shapeNames: (string | null | undefined)[]): boolean {
  const wanted = [normalizeRegionName(dataName), regionKey(dataName)];
  return shapeNames.some(
    names => !!names && names.split('|').some(n => wanted.includes(normalizeRegionName(n))));
}

/**
 * Data region for each map shape. Primary names win; alternate names are only used for regions no
 * primary name claimed (District of Columbia lists "Washington" as an alternate name).
 */
export function matchRegions<T extends { name: string }>(
  regions: T[],
  shapes: { name?: string; alternates?: (string | undefined)[] }[]
): (T | undefined)[] {
  const matched = shapes.map(s => regions.find(r => regionMatches(r.name, [s.name])));
  const claimed = new Set(matched);
  return shapes.map(
    (s, i) => matched[i] ?? regions.find(r => !claimed.has(r) && regionMatches(r.name, s.alternates ?? []))
  );
}

// ─── Builders (pure) ────────────────────────────────────────────────────────
const range = (years: number[]) =>
  years.length ? (years.length === 1 ? `${years[0]}` : `${years[0]}–${years[years.length - 1]}`) : 'No data';

export function covidHistory(
  timeline: { cases?: Cumulative; deaths?: Cumulative } | null,
  regions: Region[] = [],
  extraCaveats: string[] = []
): CountryHistory {
  const series = buildSeries(timeline?.cases ?? {}, timeline?.deaths);
  return {
    ...series,
    regions: regions.length ? regions : undefined,
    source: COVID_SOURCE,
    coverage: `${range(series.years)}, JHU CSSE via disease.sh`,
    caveats: [
      'Actual cases may be higher than reported.',
      'The JHU series ends in March 2023. Downward corrections are counted as zero.',
      ...extraCaveats,
    ],
  };
}

export function measlesHistory(rows: MeaslesYear[]): CountryHistory {
  const annual = [...rows].sort((a, b) => a.year - b.year);
  const years = yearRange(annual);
  return {
    years,
    annual,
    source: { name: 'WHO via Our World in Data', url: 'https://ourworldindata.org/grapher/reported-cases-of-measles' },
    coverage: `${range(years)}, WHO via Our World in Data`,
    caveats: [
      'Actual cases may be higher than reported.',
      annual.some(r => r.deaths !== undefined)
        ? 'Deaths come from a second Our World in Data file and are missing for some years.'
        : 'This dataset has no death figures for this country.',
    ],
  };
}

export interface StaticRecord {
  timeline?: YearlyTimeline | null;
  dataNotes?: string | null;
  dataSource?: string | null;
  dataYear?: number | string | null;
  totalOutbreaks?: number | null;
}

export function staticHistory(
  record: StaticRecord | undefined,
  meta: { dataSource: string; lastUpdated: string }
): CountryHistory {
  const annual = Object.entries(record?.timeline ?? {})
    .map(([year, v]) => ({ year: Number(year), cases: v.cases, deaths: v.deaths }))
    .filter(r => Number.isFinite(r.year) && Number.isFinite(r.cases))
    .sort((a, b) => a.year - b.year);
  const years = yearRange(annual);
  return {
    years,
    annual,
    source: { name: record?.dataSource || meta.dataSource, url: `https://${meta.dataSource}` },
    coverage: years.length ? `${range(years)}, ${meta.dataSource}` : `Cumulative totals, updated ${meta.lastUpdated}`,
    caveats: [
      record?.dataNotes,
      record?.dataYear ? `Data year: ${record.dataYear}` : null,
      record?.totalOutbreaks ? `Recorded outbreaks: ${record.totalOutbreaks}` : null,
      record ? null : 'This dataset has no record for this country.',
    ].filter((c): c is string => !!c),
  };
}

// ─── Network ────────────────────────────────────────────────────────────────
/** null = the API has no data for this request (404). Other failures throw so the UI can retry. */
async function getJson<T>(url: string, signal: AbortSignal): Promise<T | null> {
  const response = await fetch(url, { signal });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Request failed (${response.status}): ${url}`);
  return response.json();
}

interface Timeline { cases?: Cumulative; deaths?: Cumulative }

async function usRegions(signal: AbortSignal): Promise<Region[]> {
  const [rows, states] = await Promise.all([
    getJson<{ date: string; state: string; cases: number; deaths: number }[]>(`${DISEASE_SH}/nyt/states?lastdays=all`, signal),
    getJson<{ state: string; population?: number }[]>(`${DISEASE_SH}/states`, signal),
  ]);
  const population = new Map((states ?? []).map(s => [s.state, s.population]));
  const byState = new Map<string, { cases: Cumulative; deaths: Cumulative }>();
  for (const row of rows ?? []) {
    const entry = byState.get(row.state) ?? { cases: {}, deaths: {} };
    entry.cases[row.date] = row.cases;
    entry.deaths[row.date] = row.deaths;
    byState.set(row.state, entry);
  }
  return Array.from(byState, ([name, s]) => toRegion(name, s.cases, s.deaths, population.get(name) || undefined));
}

async function provinceRegions(iso2: string, provinces: string[], signal: AbortSignal): Promise<Region[]> {
  const names = provinces.filter(p => !NOT_REGIONS.test(p));
  if (names.length < 2) return [];
  type Row = { province: string; timeline: Timeline };
  const data = await getJson<Row | Row[]>(
    `${DISEASE_SH}/historical/${iso2}/${names.map(encodeURIComponent).join('%7C')}?lastdays=all`,
    signal
  );
  return (Array.isArray(data) ? data : data ? [data] : [])
    .filter(r => r.timeline?.cases)
    .map(r => toRegion(r.province.replace(/\b\w/g, c => c.toUpperCase()), r.timeline.cases!, r.timeline.deaths));
}

async function fetchCovid(iso2: string, signal: AbortSignal): Promise<{ history: CountryHistory; complete: boolean }> {
  const data = await getJson<{ province?: string[]; timeline?: Timeline }>(
    `${DISEASE_SH}/historical/${encodeURIComponent(iso2)}?lastdays=all`,
    signal
  );
  if (!data?.timeline) return { history: covidHistory(null), complete: true };

  try {
    const isUs = iso2 === 'US';
    const regions = isUs ? await usRegions(signal) : await provinceRegions(iso2, data.province ?? [], signal);
    const note = isUs && regions.length ? ['State figures are from The New York Times via disease.sh.'] : [];
    return { history: covidHistory(data.timeline, regions, note), complete: true };
  } catch (error) {
    if (signal.aborted) throw error;
    console.warn('[countryHistory] regional data failed', error);
    return { history: covidHistory(data.timeline, [], ['Regional data failed to load. Reopen to try again.']), complete: false };
  }
}

const cache = new Map<string, CountryHistory>();

export async function getCountryHistory(
  pandemic: PandemicType,
  iso2: string,
  signal: AbortSignal
): Promise<CountryHistory> {
  const key = `${pandemic}:${iso2}`;
  const cached = cache.get(key);
  if (cached) return cached;

  let history: CountryHistory;
  let complete = true;
  if (pandemic === 'covid') {
    ({ history, complete } = await fetchCovid(iso2, signal));
  } else if (pandemic === 'measles') {
    history = measlesHistory(await measlesFetcher.fetchMeaslesSeries(iso2));
  } else {
    const fetcher = pandemic === 'ebola' ? ebolaFetcher : westNileFetcher;
    history = staticHistory(await fetcher.fetchRecord(iso2), fetcher.getFileMeta());
  }
  signal.throwIfAborted();
  if (complete) cache.set(key, history);
  return history;
}
