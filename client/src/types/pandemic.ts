/**
 * Shared types for all pandemic data visualizations
 * Used across COVID-19, Ebola, and West Nile Virus
 */

export type PandemicType = 'covid' | 'ebola' | 'westnile';

/**
 * Global statistics for a pandemic
 */
export interface GlobalPandemicStats {
  totalCases: number;
  totalDeaths: number;
  totalRecovered?: number; // optional — not available for all pandemics
  activeCases?: number;
  fatalityRate: number; // deaths / cases, expressed as percentage (0-100)
  lastUpdated: string;
}

/**
 * Country-level data for a pandemic
 */
export interface PandemicCountryData {
  country: string;
  countryCode: string; // ISO alpha-2 where available, fallback to region code
  cases: number;
  deaths: number;
  recovered?: number;
  active?: number;
  fatalityRate?: number; // deaths / cases, as percentage
  dates?: string[]; // ISO date strings for time-series data
  dailyCases?: number[];
  dailyDeaths?: number[];
  dailyRecovered?: number[];
}

/**
 * Response shape from fetcher functions
 */
export interface FetchPandemicDataResult {
  global: GlobalPandemicStats;
  countries: Record<string, PandemicCountryData>;
}
