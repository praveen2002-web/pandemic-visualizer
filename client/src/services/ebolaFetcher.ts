/**
 * Ebola data fetcher
 *
 * Data file: /ebola_2025-03-10_humdata.org.csv
 * Filename convention: pandemicName_lastUpdatedDate_dataSource.csv
 *
 * Metadata extracted from filename:
 *   - pandemicName  → "ebola"
 *   - lastUpdated   → "2025-03-10"
 *   - dataSource    → "humdata.org"
 *
 * CSV columns: Indicator, Country, Date, value
 * We use the "Cumulative number of confirmed, probable and suspected Ebola cases/deaths"
 * indicators and take the latest reported Date per country.
 */

import type { GlobalPandemicStats, PandemicCountryData } from '@/types/pandemic';

// ─── File metadata ─────────────────────────────────────────────────────────────
const JSON_FILENAME = 'ebola_2025-03-10_humdata.org.json';

/**
 * Parse pandemic metadata from the JSON filename.
 * Format: pandemicName_lastUpdatedDate_dataSource.json
 * Parts are split by '_'.
 */
function parseFileMeta(filename: string): {
  pandemicName: string;
  lastUpdated: string;
  dataSource: string;
} {
  // Strip the .json or .csv extension, then split on '_'
  const base = filename.replace(/\.(json|csv)$/i, '');
  const parts = base.split('_');

  // parts[0] = pandemic name, parts[1] = date, parts[2] = data source
  const pandemicName = parts[0] ?? 'ebola';
  const lastUpdated = parts[1] ?? new Date().toISOString().slice(0, 10);
  const dataSource = parts[2] ?? 'unknown';

  return { pandemicName, lastUpdated, dataSource };
}

const FILE_META = parseFileMeta(JSON_FILENAME);

// ─── ISO 3166-1 alpha-2 country code mapping fallback ──────────────────────────
const COUNTRY_CODE_MAP: Record<string, string> = {
  Guinea: 'GN',
  Liberia: 'LR',
  'Sierra Leone': 'SL',
  Mali: 'ML',
  Nigeria: 'NG',
  Senegal: 'SN',
  Spain: 'ES',
  'United Kingdom': 'GB',
  'United States of America': 'US',
  Italy: 'IT',
  France: 'FR',
};

interface EbolaJsonRow {
  country: string;
  countryInfo: {
    iso2: string | null;
    iso3: string | null;
  } | null;
  cases: number | null;
  deaths: number | null;
  recovered: number | null;
  active: number | null;
}

class EbolaFetcher {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  // Long cache – data is static local JSON, no need to re-parse often
  private cacheExpiry = 60 * 60 * 1000; // 1 hour

  // ─── JSON parsing ────────────────────────────────────────────────────────────

  /**
   * Fetch and parse the ebola JSON from the public directory.
   */
  private async fetchAndParseJson(): Promise<EbolaJsonRow[]> {
    const response = await fetch(`/${JSON_FILENAME}`);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${JSON_FILENAME}: ${response.status} ${response.statusText}`
      );
    }
    return response.json();
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  async fetchEbolaCountries(): Promise<Record<string, PandemicCountryData>> {
    const cached = this.cache.get('ebola-countries');
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    const rows = await this.fetchAndParseJson();
    const countriesData: Record<string, PandemicCountryData> = {};

    for (const row of rows) {
      if (row.cases === null) continue;

      const cases = row.cases ?? 0;
      const deaths = row.deaths ?? 0;
      const fatalityRate = cases > 0 ? (deaths / cases) * 100 : 0;
      const code = row.countryInfo?.iso2 ?? COUNTRY_CODE_MAP[row.country] ?? row.country.slice(0, 2).toUpperCase();

      countriesData[code] = {
        country: row.country,
        countryCode: code,
        cases,
        deaths,
        recovered: row.recovered ?? 0,
        active: row.active ?? Math.max(0, cases - deaths),
        fatalityRate: Math.round(fatalityRate * 10) / 10,
      };
    }

    this.cache.set('ebola-countries', { data: countriesData, timestamp: Date.now() });
    return countriesData;
  }

  async fetchGlobalStats(): Promise<GlobalPandemicStats> {
    const cached = this.cache.get('ebola-global');
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    const countriesData = await this.fetchEbolaCountries();
    const countries = Object.values(countriesData);

    const totalCases = countries.reduce((sum, c) => sum + (c.cases || 0), 0);
    const totalDeaths = countries.reduce((sum, c) => sum + (c.deaths || 0), 0);
    const fatalityRate = totalCases > 0 ? (totalDeaths / totalCases) * 100 : 0;

    const globalStats: GlobalPandemicStats = {
      totalCases,
      totalDeaths,
      fatalityRate: Math.round(fatalityRate * 10) / 10,
      // lastUpdated is taken from the filename metadata (field[1])
      lastUpdated: FILE_META.lastUpdated,
    };

    this.cache.set('ebola-global', { data: globalStats, timestamp: Date.now() });
    return globalStats;
  }

  /** Expose file metadata so UI components can display source attribution */
  getFileMeta() {
    return FILE_META;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const ebolaFetcher = new EbolaFetcher();
