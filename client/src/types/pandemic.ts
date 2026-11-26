/**
 * Shared types for all pandemic data visualizations
 * Used across COVID-19, Ebola, and West Nile Virus
 */

export type PandemicType = 'covid' | 'ebola' | 'westnile' | 'measles';

/**
 * Global statistics for a pandemic
 */
export interface GlobalPandemicStats {
  totalCases: number;
  totalDeaths: number;
  totalRecovered?: number; // optional - not available for all pandemics
  activeCases?: number;
  vaccinationPercentage?: number;
  fatalityRate: number; // deaths / cases, expressed as percentage (0-100)
  lastUpdated: string;
  isFallback?: boolean; // true when live sources failed and a built-in snapshot is shown
  latestYear?: number; // yearly datasets (measles): most recent reporting year
  deathsCoverage?: string; // measles: which countries and years totalDeaths covers
}

/**
 * Country-level data for a pandemic
 */
export interface PandemicCountryData {
  country: string;
  countryCode: string; // ISO alpha-2 where available, fallback to region code
  cases: number;
  deaths?: number; // undefined = no death data (never show as 0)
  recovered?: number;
  active?: number;
  casesPerMillion?: number;
  deathsPerMillion?: number;
  testsPerMillion?: number;
  vaccinationPercentage?: number;
  fatalityRate?: number; // deaths / cases, as percentage
  population?: number;
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
