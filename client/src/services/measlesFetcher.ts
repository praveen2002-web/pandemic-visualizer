/**
 * Measles data fetcher - Our World in Data (WHO reported cases), fetched live.
 *
 * Cases CSV columns: entity, code (ISO3), year, measles__number_of_reported_cases
 * Deaths CSV columns: entity, code, year, cases_static, deaths (United States only today)
 * Cases are each country's most recent reported year; deaths are the total of all recorded years.
 * The globe keys countries by ISO2, so ISO3 codes are mapped through the globe's own Natural Earth GeoJSON.
 */

import type { GlobalPandemicStats, PandemicCountryData } from '@/types/pandemic';

export const MEASLES_CSV_URL =
  'https://ourworldindata.org/grapher/reported-cases-of-measles.csv?v=1&csvType=full&useColumnShortNames=true';
export const MEASLES_DEATHS_CSV_URL =
  'https://ourworldindata.org/grapher/measles-cases-and-death.csv?v=1&csvType=full&useColumnShortNames=true';
const GEOJSON_URL = '/ne_110m_admin_0_countries.geojson';

/** Latest reported year per country, keyed by ISO2. Rows without a known ISO3 (regions, World) are skipped. */
export function parseMeaslesCsv(
  csv: string,
  iso3ToIso2: Record<string, string>
): { countries: Record<string, PandemicCountryData>; latestYear: number } {
  const latest: Record<string, { country: string; year: number; cases: number }> = {};
  let latestYear = 0;

  for (const line of csv.trim().split(/\r?\n/).slice(1)) {
    // Entity names may be quoted and contain commas, so read the last three fields from the right
    const parts = line.split(',');
    const cases = Number(parts.pop());
    const year = Number(parts.pop());
    const code = parts.pop()?.trim() ?? '';
    const country = parts.join(',').replace(/^"|"$/g, '');
    const iso2 = iso3ToIso2[code];
    if (!iso2 || !Number.isFinite(cases) || !Number.isFinite(year)) continue;

    if (!latest[iso2] || year > latest[iso2].year) latest[iso2] = { country, year, cases };
    latestYear = Math.max(latestYear, year);
  }

  const countries: Record<string, PandemicCountryData> = {};
  for (const [iso2, { country, cases }] of Object.entries(latest)) {
    countries[iso2] = { country, countryCode: iso2, cases };
  }
  return { countries, latestYear };
}

/** Adds all-time recorded deaths to matching countries and describes what that total covers. */
export function addMeaslesDeaths(
  countries: Record<string, PandemicCountryData>,
  csv: string,
  iso3ToIso2: Record<string, string>
): { totalDeaths: number; deathsCoverage?: string } {
  let totalDeaths = 0;
  const years: number[] = [];
  const covered = new Set<string>();

  for (const line of csv.trim().split(/\r?\n/).slice(1)) {
    const parts = line.split(',');
    const raw = parts.pop()?.trim();
    parts.pop(); // cases_static: cases come from the worldwide CSV
    const year = Number(parts.pop());
    const entry = countries[iso3ToIso2[parts.pop()?.trim() ?? '']];
    const deaths = Number(raw);
    if (!raw || !entry || !Number.isFinite(deaths) || !Number.isFinite(year)) continue;

    entry.deaths = (entry.deaths ?? 0) + deaths;
    totalDeaths += deaths;
    years.push(year);
    covered.add(entry.country);
  }

  if (!covered.size) return { totalDeaths };
  const where = covered.size === 1 ? `${Array.from(covered)[0]} only` : `${covered.size} countries`;
  return { totalDeaths, deathsCoverage: `${where}, ${Math.min(...years)}-${Math.max(...years)}` };
}

export interface MeaslesYear {
  year: number;
  cases: number;
  deaths?: number;
}

/** Every reported year per country, with deaths where the second file has them. */
export function parseMeaslesSeries(
  casesCsv: string,
  deathsCsv: string,
  iso3ToIso2: Record<string, string>
): Record<string, MeaslesYear[]> {
  // [code, year, value] read from the right, so quoted names containing commas are safe
  const rows = (csv: string, skip: number) =>
    csv.trim().split(/\r?\n/).slice(1).flatMap(line => {
      const parts = line.split(',');
      const raw = parts.pop()?.trim();
      parts.splice(parts.length - skip, skip);
      const year = Number(parts.pop());
      const iso2 = iso3ToIso2[parts.pop()?.trim() ?? ''];
      const value = Number(raw);
      return raw && iso2 && Number.isFinite(value) && Number.isFinite(year) ? [{ iso2, year, value }] : [];
    });

  const deaths = new Map(rows(deathsCsv, 1).map(r => [`${r.iso2}:${r.year}`, r.value]));
  const series: Record<string, MeaslesYear[]> = {};
  for (const { iso2, year, value } of rows(casesCsv, 0)) {
    const died = deaths.get(`${iso2}:${year}`);
    (series[iso2] ??= []).push({ year, cases: value, ...(died !== undefined ? { deaths: died } : {}) });
  }
  return series;
}

/** Same code resolution as GlobeView, so fetched rows land on the right polygons. */
function buildIso3ToIso2(geoData: any): Record<string, string> {
  const map: Record<string, string> = {};
  for (const { properties: p = {} } of geoData.features ?? []) {
    const iso2 = [p.ISO_A2_EH, p.ISO_A2, p.iso_a2].find(v => typeof v === 'string' && v && v !== '-99');
    if (!iso2) continue;
    for (const iso3 of [p.ISO_A3_EH, p.ISO_A3, p.ADM0_A3]) {
      if (typeof iso3 === 'string' && iso3 !== '-99') map[iso3.toUpperCase()] ??= iso2.toUpperCase();
    }
  }
  return map;
}

class MeaslesFetcher {
  private request: Promise<
    ReturnType<typeof parseMeaslesCsv> &
      ReturnType<typeof addMeaslesDeaths> & { series: Record<string, MeaslesYear[]> }
  > | null = null;

  // Yearly WHO data changes rarely: load once per visit, retry on the next visit to the tab after a failure
  private load() {
    this.request ??= Promise.all([
      fetch(MEASLES_CSV_URL).then(r => {
        if (!r.ok) throw new Error(`Failed to fetch measles data: ${r.status} ${r.statusText}`);
        return r.text();
      }),
      fetch(GEOJSON_URL).then(r => {
        if (!r.ok) throw new Error(`Failed to fetch country shapes: ${r.status} ${r.statusText}`);
        return r.json();
      }),
      // Deaths are supplementary: if this file fails, cases still load and deaths show N/A
      fetch(MEASLES_DEATHS_CSV_URL)
        .then(r => (r.ok ? r.text() : ''))
        .catch(() => ''),
    ])
      .then(([csv, geo, deathsCsv]) => {
        const codes = buildIso3ToIso2(geo);
        const parsed = parseMeaslesCsv(csv, codes);
        return {
          ...parsed,
          ...addMeaslesDeaths(parsed.countries, deathsCsv, codes),
          series: parseMeaslesSeries(csv, deathsCsv, codes),
        };
      })
      .catch(err => {
        this.request = null;
        throw err;
      });
    return this.request;
  }

  async fetchMeaslesCountries(): Promise<Record<string, PandemicCountryData>> {
    return (await this.load()).countries;
  }

  async fetchMeaslesSeries(iso2: string): Promise<MeaslesYear[]> {
    return (await this.load()).series[iso2] ?? [];
  }
  async fetchGlobalStats(): Promise<GlobalPandemicStats> {
    const { countries, latestYear, totalDeaths, deathsCoverage } = await this.load();
    return {
      totalCases: Object.values(countries).reduce((sum, c) => sum + c.cases, 0),
      totalDeaths,
      deathsCoverage,
      fatalityRate: 0,
      lastUpdated: new Date().toISOString(),
      latestYear,
    };
  }
}

export const measlesFetcher = new MeaslesFetcher();
