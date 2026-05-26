/**
 * West Nile Virus data fetcher
 *
 * Data file: /West Nile virus_2026-03-23_data.gov.csv
 * Filename convention: pandemicName_lastUpdatedDate_dataSource.csv
 *
 * Metadata extracted from filename:
 *   - pandemicName  → "West Nile virus"
 *   - lastUpdated   → "2026-03-23"
 *   - dataSource    → "data.gov"
 *
 * CSV columns:
 *   FullGeoName                      – "STATE, County" format
 *   Location                         – County FIPS code
 *   Activity                         – Human infections / Non-human activity / Mixed
 *   Total human disease cases        – Total confirmed cases
 *   Neuroinvasive disease cases      – More severe form of WNV
 *   **Presumptive viremic blood donors – Blood bank detections
 *
 * Data aggregation: cases summed by US state (2-letter code from FullGeoName).
 */

import type { GlobalPandemicStats, PandemicCountryData } from '@/types/pandemic';

// ─── File metadata ─────────────────────────────────────────────────────────────
// Note: filename contains a space in the pandemic name, so the second '_' is the separator.
const JSON_FILENAME = 'West Nile virus_2026-03-23_data.gov.json';

/**
 * Parse pandemic metadata from the JSON filename.
 * Format: pandemicName_lastUpdatedDate_dataSource.json
 * Parts are split on '_'. The pandemic name may itself contain spaces but NOT underscores.
 */
function parseFileMeta(filename: string): {
  pandemicName: string;
  lastUpdated: string;
  dataSource: string;
} {
  const base = filename.replace(/\.(json|csv)$/i, '');
  const parts = base.split('_');

  // parts[0] = pandemic name (may contain spaces)
  // parts[1] = date (YYYY-MM-DD)
  // parts[2] = data source
  const pandemicName = parts[0] ?? 'West Nile virus';
  const lastUpdated = parts[1] ?? new Date().toISOString().slice(0, 10);
  const dataSource = parts[2] ?? 'unknown';

  return { pandemicName, lastUpdated, dataSource };
}

const FILE_META = parseFileMeta(JSON_FILENAME);

// ─── JSON row shape ────────────────────────────────────────────────────────────
interface WestNileJsonRow {
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

// ─── Fetcher class ─────────────────────────────────────────────────────────────
class WestNileFetcher {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours (static file)

  private async fetchAndParseRows(): Promise<WestNileJsonRow[]> {
    const response = await fetch(`/${JSON_FILENAME}`);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${JSON_FILENAME}: ${response.status} ${response.statusText}`
      );
    }
    return response.json();
  }

  async fetchWestNileCountries(): Promise<Record<string, PandemicCountryData>> {
    const cached = this.cache.get('westnile-countries');
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    const rows = await this.fetchAndParseRows();
    const countriesData: Record<string, PandemicCountryData> = {};

    for (const row of rows) {
      if (row.cases === null) continue;

      const cases = row.cases ?? 0;
      const deaths = row.deaths ?? 0;
      const fatalityRate = cases > 0 ? (deaths / cases) * 100 : 0;
      const code = row.countryInfo?.iso2 ?? row.country.slice(0, 2).toUpperCase();

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

    this.cache.set('westnile-countries', { data: countriesData, timestamp: Date.now() });
    return countriesData;
  }

  async fetchGlobalStats(): Promise<GlobalPandemicStats> {
    const cached = this.cache.get('westnile-global');
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    const countriesData = await this.fetchWestNileCountries();
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

    this.cache.set('westnile-global', { data: globalStats, timestamp: Date.now() });
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

export const westNileFetcher = new WestNileFetcher();
