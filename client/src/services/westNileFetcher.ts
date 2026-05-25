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
const CSV_FILENAME = 'West Nile virus_2026-03-23_data.gov.csv';

/**
 * Parse pandemic metadata from the CSV filename.
 * Format: pandemicName_lastUpdatedDate_dataSource.csv
 * Parts are split on '_'. The pandemic name may itself contain spaces but NOT underscores.
 */
function parseFileMeta(filename: string): {
  pandemicName: string;
  lastUpdated: string;
  dataSource: string;
} {
  const base = filename.replace(/\.csv$/i, '');
  const parts = base.split('_');

  // parts[0] = pandemic name (may contain spaces)
  // parts[1] = date (YYYY-MM-DD)
  // parts[2] = data source
  const pandemicName = parts[0] ?? 'West Nile virus';
  const lastUpdated = parts[1] ?? new Date().toISOString().slice(0, 10);
  const dataSource = parts[2] ?? 'unknown';

  return { pandemicName, lastUpdated, dataSource };
}

const FILE_META = parseFileMeta(CSV_FILENAME);

// ─── CSV row shape ─────────────────────────────────────────────────────────────
interface WestNileRawRow {
  FullGeoName: string;
  Location: string;
  Activity: string;
  'Total human disease cases': string;
  'Neuroinvasive disease cases': string;
  '**Presumptive viremic blood donors': string;
}

// ─── US state code → full name ─────────────────────────────────────────────────
const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas',
  CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
  DC: 'Washington D.C.', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii',
  ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine',
  MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska',
  NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico',
  NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island',
  SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas',
  UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

// ─── Minimal CSV parser (handles quoted fields with commas) ────────────────────
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let field = '';
      i++;
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') { field += '"'; i += 2; }
          else { i++; break; }
        } else {
          field += line[i++];
        }
      }
      fields.push(field);
      if (line[i] === ',') i++;
    } else {
      const end = line.indexOf(',', i);
      if (end === -1) { fields.push(line.slice(i)); break; }
      fields.push(line.slice(i, end));
      i = end + 1;
    }
  }
  return fields;
}

function parseHeaders(headerLine: string): string[] {
  return parseCsvLine(headerLine);
}

function lineToRow(headers: string[], values: string[]): WestNileRawRow {
  const obj: Record<string, string> = {};
  headers.forEach((h, idx) => { obj[h] = values[idx] ?? ''; });
  return obj as unknown as WestNileRawRow;
}

// ─── Fetcher class ─────────────────────────────────────────────────────────────
class WestNileFetcher {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours (static file)

  private async fetchAndParseRows(): Promise<WestNileRawRow[]> {
    const response = await fetch(`/${CSV_FILENAME}`);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${CSV_FILENAME}: ${response.status} ${response.statusText}`
      );
    }

    const text = await response.text();
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = parseHeaders(lines[0]);
    const rows: WestNileRawRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = parseCsvLine(line);
      rows.push(lineToRow(headers, values));
    }

    return rows;
  }

  async fetchWestNileCountries(): Promise<Record<string, PandemicCountryData>> {
    const cached = this.cache.get('westnile-countries');
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    const rows = await this.fetchAndParseRows();
    const statesData: Record<string, PandemicCountryData> = {};

    for (const row of rows) {
      // Extract state code from "AL, Baldwin" → "AL"
      const stateMatch = row.FullGeoName?.match(/^([A-Z]{2}),/);
      if (!stateMatch) continue;

      const stateCode = stateMatch[1];
      const stateName = STATE_NAMES[stateCode] ?? stateCode;
      const cases = parseInt(row['Total human disease cases'] || '0', 10) || 0;

      if (!statesData[stateCode]) {
        statesData[stateCode] = {
          country: stateName,
          countryCode: stateCode,
          cases: 0,
          deaths: 0,
        };
      }

      statesData[stateCode].cases += cases;
    }

    this.cache.set('westnile-countries', { data: statesData, timestamp: Date.now() });
    return statesData;
  }

  async fetchGlobalStats(): Promise<GlobalPandemicStats> {
    const cached = this.cache.get('westnile-global');
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    const countriesData = await this.fetchWestNileCountries();
    const states = Object.values(countriesData);

    const totalCases = states.reduce((sum, s) => sum + (s.cases || 0), 0);
    const totalDeaths = states.reduce((sum, s) => sum + (s.deaths || 0), 0);
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
