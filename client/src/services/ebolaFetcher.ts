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
const CSV_FILENAME = 'ebola_2025-03-10_humdata.org.csv';

/**
 * Parse pandemic metadata from the CSV filename.
 * Format: pandemicName_lastUpdatedDate_dataSource.csv
 * Parts are split by '_'.
 */
function parseFileMeta(filename: string): {
  pandemicName: string;
  lastUpdated: string;
  dataSource: string;
} {
  // Strip the .csv extension, then split on '_'
  const base = filename.replace(/\.csv$/i, '');
  const parts = base.split('_');

  // parts[0] = pandemic name, parts[1] = date, parts[2] = data source
  const pandemicName = parts[0] ?? 'ebola';
  const lastUpdated = parts[1] ?? new Date().toISOString().slice(0, 10);
  const dataSource = parts[2] ?? 'unknown';

  return { pandemicName, lastUpdated, dataSource };
}

const FILE_META = parseFileMeta(CSV_FILENAME);

// ─── Indicator strings ─────────────────────────────────────────────────────────
const INDICATOR_TOTAL_CASES =
  'Cumulative number of confirmed, probable and suspected Ebola cases';
const INDICATOR_TOTAL_DEATHS =
  'Cumulative number of confirmed, probable and suspected Ebola deaths';

// ─── ISO 3166-1 alpha-2 country code mapping ──────────────────────────────────
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

interface CsvRow {
  indicator: string;
  country: string;
  date: string; // YYYY-MM-DD
  value: number;
}

class EbolaFetcher {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  // Long cache – data is static local CSV, no need to re-parse often
  private cacheExpiry = 60 * 60 * 1000; // 1 hour

  // ─── CSV parsing ────────────────────────────────────────────────────────────

  /**
   * Fetch and parse the ebola CSV from the public directory.
   * Returns typed rows, skipping the header and any malformed lines.
   */
  private async fetchAndParseCsv(): Promise<CsvRow[]> {
    const response = await fetch(`/${CSV_FILENAME}`);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${CSV_FILENAME}: ${response.status} ${response.statusText}`
      );
    }

    const text = await response.text();
    const lines = text.split(/\r?\n/);
    const rows: CsvRow[] = [];

    // Skip header (index 0)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parsed = this.parseCsvLine(line);
      if (parsed.length < 4) continue;

      const [indicator, country, date, rawValue] = parsed;
      const value = parseFloat(rawValue);
      if (isNaN(value)) continue;

      rows.push({ indicator, country, date, value });
    }

    return rows;
  }

  /**
   * Minimal RFC-4180 CSV line parser that handles double-quoted fields
   * (including fields containing commas or embedded quotes).
   */
  private parseCsvLine(line: string): string[] {
    const fields: string[] = [];
    let i = 0;

    while (i < line.length) {
      if (line[i] === '"') {
        // Quoted field
        let field = '';
        i++; // skip opening quote
        while (i < line.length) {
          if (line[i] === '"') {
            if (line[i + 1] === '"') {
              // Escaped quote
              field += '"';
              i += 2;
            } else {
              i++; // skip closing quote
              break;
            }
          } else {
            field += line[i++];
          }
        }
        fields.push(field);
        // skip trailing comma
        if (line[i] === ',') i++;
      } else {
        // Unquoted field
        const end = line.indexOf(',', i);
        if (end === -1) {
          fields.push(line.slice(i));
          break;
        } else {
          fields.push(line.slice(i, end));
          i = end + 1;
        }
      }
    }

    return fields;
  }

  // ─── Data aggregation ────────────────────────────────────────────────────────

  /**
   * Build a per-country map using the latest reported date for each country.
   */
  private aggregateByCountry(rows: CsvRow[]): Record<string, PandemicCountryData> {
    const casesMap: Record<string, { date: string; value: number }> = {};
    const deathsMap: Record<string, { date: string; value: number }> = {};

    for (const row of rows) {
      if (row.indicator === INDICATOR_TOTAL_CASES) {
        const existing = casesMap[row.country];
        if (!existing || row.date > existing.date) {
          casesMap[row.country] = { date: row.date, value: row.value };
        }
      } else if (row.indicator === INDICATOR_TOTAL_DEATHS) {
        const existing = deathsMap[row.country];
        if (!existing || row.date > existing.date) {
          deathsMap[row.country] = { date: row.date, value: row.value };
        }
      }
    }

    const countryMap: Record<string, PandemicCountryData> = {};
    const allCountries = new Set([...Object.keys(casesMap), ...Object.keys(deathsMap)]);

    allCountries.forEach((country) => {
      const cases = casesMap[country]?.value ?? 0;
      const deaths = deathsMap[country]?.value ?? 0;
      const fatalityRate = cases > 0 ? (deaths / cases) * 100 : 0;
      const code = COUNTRY_CODE_MAP[country] ?? country.slice(0, 2).toUpperCase();

      countryMap[code] = {
        country,
        countryCode: code,
        cases,
        deaths,
        recovered: 0,
        active: Math.max(0, cases - deaths),
        fatalityRate: Math.round(fatalityRate * 10) / 10,
      };
    });

    return countryMap;
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  async fetchEbolaCountries(): Promise<Record<string, PandemicCountryData>> {
    const cached = this.cache.get('ebola-countries');
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    const rows = await this.fetchAndParseCsv();
    const countriesData = this.aggregateByCountry(rows);
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
