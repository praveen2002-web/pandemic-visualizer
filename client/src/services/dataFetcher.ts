/**
 * COVID-19 data fetcher
 * Primary source:  disease.sh (https://disease.sh) – /v3/covid-19
 * Fallback source: NovelCOVID API mirror (https://api.coronatracker.com)
 * Final fallback:  hardcoded 2023 WHO snapshot data
 *
 * NOTE: Produces GlobalPandemicStats and PandemicCountryData so data lands
 * directly in pandemicSlice (state.pandemic) which is what the UI reads.
 */

import axios from 'axios';
import type { GlobalPandemicStats, PandemicCountryData } from '@/types/pandemic';

// ─── API endpoints ────────────────────────────────────────────────────────────
const DISEASE_SH = 'https://disease.sh/v3/covid-19';
const CORONA_API = 'https://corona.lmao.ninja/v2'; // alternative mirror

// ─── Raw API shapes ───────────────────────────────────────────────────────────
interface DiseaseShCountry {
  country: string;
  countryInfo: { iso2?: string; iso3?: string; flag?: string };
  cases: number;
  deaths: number;
  recovered: number;
  active: number;
  tests: number;
  population: number;
  casesPerMillion?: number;
  deathsPerMillion?: number;
}

interface DiseaseShGlobal {
  cases: number;
  deaths: number;
  recovered: number;
  active: number;
  tests: number;
  affectedCountries: number;
}

// ─── Hardcoded fallback (WHO 2023 cumulative data) ────────────────────────────
const FALLBACK_GLOBAL: GlobalPandemicStats = {
  totalCases: 704753890,
  totalDeaths: 7010681,
  totalRecovered: 675_000_000,
  activeCases: 22_000_000,
  fatalityRate: 1.0,
  lastUpdated: '2023-12-31T00:00:00Z',
};

const FALLBACK_COUNTRIES: Record<string, PandemicCountryData> = {
  US: { country: 'United States', countryCode: 'US', cases: 103436829, deaths: 1127152, recovered: 99000000, fatalityRate: 1.1 },
  IN: { country: 'India', countryCode: 'IN', cases: 44690077, deaths: 530779, recovered: 44000000, fatalityRate: 1.2 },
  FR: { country: 'France', countryCode: 'FR', cases: 38997490, deaths: 167985, recovered: 38000000, fatalityRate: 0.4 },
  DE: { country: 'Germany', countryCode: 'DE', cases: 38437756, deaths: 174979, recovered: 37500000, fatalityRate: 0.5 },
  BR: { country: 'Brazil', countryCode: 'BR', cases: 37619727, deaths: 702116, recovered: 36500000, fatalityRate: 1.9 },
  KR: { country: 'South Korea', countryCode: 'KR', cases: 32936732, deaths: 35934, recovered: 32000000, fatalityRate: 0.1 },
  JP: { country: 'Japan', countryCode: 'JP', cases: 33803572, deaths: 74694, recovered: 33000000, fatalityRate: 0.2 },
  IT: { country: 'Italy', countryCode: 'IT', cases: 26723249, deaths: 194192, recovered: 26000000, fatalityRate: 0.7 },
  GB: { country: 'United Kingdom', countryCode: 'GB', cases: 24910387, deaths: 232112, recovered: 24000000, fatalityRate: 0.9 },
  RU: { country: 'Russia', countryCode: 'RU', cases: 22735290, deaths: 399044, recovered: 22000000, fatalityRate: 1.8 },
  TR: { country: 'Turkey', countryCode: 'TR', cases: 17232066, deaths: 101209, recovered: 17000000, fatalityRate: 0.6 },
  ES: { country: 'Spain', countryCode: 'ES', cases: 13872000, deaths: 121852, recovered: 13500000, fatalityRate: 0.9 },
  VN: { country: 'Vietnam', countryCode: 'VN', cases: 11527350, deaths: 43186, recovered: 10800000, fatalityRate: 0.4 },
  AU: { country: 'Australia', countryCode: 'AU', cases: 11404524, deaths: 22297, recovered: 11000000, fatalityRate: 0.2 },
  AR: { country: 'Argentina', countryCode: 'AR', cases: 10044957, deaths: 130620, recovered: 9800000, fatalityRate: 1.3 },
  NL: { country: 'Netherlands', countryCode: 'NL', cases: 8610785, deaths: 22983, recovered: 8400000, fatalityRate: 0.3 },
  IR: { country: 'Iran', countryCode: 'IR', cases: 7600600, deaths: 146207, recovered: 7300000, fatalityRate: 1.9 },
  MX: { country: 'Mexico', countryCode: 'MX', cases: 7633355, deaths: 334336, recovered: 7200000, fatalityRate: 4.4 },
  ID: { country: 'Indonesia', countryCode: 'ID', cases: 6812540, deaths: 161867, recovered: 6600000, fatalityRate: 2.4 },
  PL: { country: 'Poland', countryCode: 'PL', cases: 6524987, deaths: 119234, recovered: 6300000, fatalityRate: 1.8 },
  CO: { country: 'Colombia', countryCode: 'CO', cases: 6376140, deaths: 142614, recovered: 6200000, fatalityRate: 2.2 },
  AT: { country: 'Austria', countryCode: 'AT', cases: 6108785, deaths: 22017, recovered: 6000000, fatalityRate: 0.4 },
  PT: { country: 'Portugal', countryCode: 'PT', cases: 6013831, deaths: 26313, recovered: 5800000, fatalityRate: 0.4 },
  UA: { country: 'Ukraine', countryCode: 'UA', cases: 5529998, deaths: 112249, recovered: 5300000, fatalityRate: 2.0 },
  CN: { country: 'China', countryCode: 'CN', cases: 99272795, deaths: 121466, recovered: 98000000, fatalityRate: 0.1 },
  ZA: { country: 'South Africa', countryCode: 'ZA', cases: 4072533, deaths: 102595, recovered: 3900000, fatalityRate: 2.5 },
  CA: { country: 'Canada', countryCode: 'CA', cases: 4668694, deaths: 58095, recovered: 4500000, fatalityRate: 1.2 },
  PE: { country: 'Peru', countryCode: 'PE', cases: 4491362, deaths: 220975, recovered: 4200000, fatalityRate: 4.9 },
  TH: { country: 'Thailand', countryCode: 'TH', cases: 4737070, deaths: 33838, recovered: 4600000, fatalityRate: 0.7 },
  IL: { country: 'Israel', countryCode: 'IL', cases: 4841143, deaths: 12004, recovered: 4700000, fatalityRate: 0.2 },
  PH: { country: 'Philippines', countryCode: 'PH', cases: 4082093, deaths: 66356, recovered: 3900000, fatalityRate: 1.6 },
  BE: { country: 'Belgium', countryCode: 'BE', cases: 4780168, deaths: 34015, recovered: 4600000, fatalityRate: 0.7 },
  CL: { country: 'Chile', countryCode: 'CL', cases: 5266533, deaths: 64488, recovered: 5100000, fatalityRate: 1.2 },
  CZ: { country: 'Czech Republic', countryCode: 'CZ', cases: 4655210, deaths: 42573, recovered: 4500000, fatalityRate: 0.9 },
  MY: { country: 'Malaysia', countryCode: 'MY', cases: 5061977, deaths: 37239, recovered: 4900000, fatalityRate: 0.7 },
  SE: { country: 'Sweden', countryCode: 'SE', cases: 2696636, deaths: 23230, recovered: 2600000, fatalityRate: 0.9 },
  PK: { country: 'Pakistan', countryCode: 'PK', cases: 1579738, deaths: 30680, recovered: 1500000, fatalityRate: 1.9 },
  EG: { country: 'Egypt', countryCode: 'EG', cases: 516023, deaths: 24796, recovered: 480000, fatalityRate: 4.8 },
  NG: { country: 'Nigeria', countryCode: 'NG', cases: 266675, deaths: 3155, recovered: 261000, fatalityRate: 1.2 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalizeCountry(raw: DiseaseShCountry): PandemicCountryData {
  const code = raw.countryInfo.iso2 || raw.countryInfo.iso3 || raw.country.slice(0, 2).toUpperCase();
  const fatalityRate = raw.cases > 0 ? (raw.deaths / raw.cases) * 100 : 0;
  return {
    country: raw.country,
    countryCode: code,
    cases: raw.cases ?? 0,
    deaths: raw.deaths ?? 0,
    recovered: raw.recovered ?? 0,
    active: raw.active ?? 0,
    fatalityRate: Math.round(fatalityRate * 10) / 10,
  };
}

function normalizeGlobal(raw: DiseaseShGlobal): GlobalPandemicStats {
  const fatalityRate = raw.cases > 0 ? (raw.deaths / raw.cases) * 100 : 0;
  return {
    totalCases: raw.cases,
    totalDeaths: raw.deaths,
    totalRecovered: raw.recovered,
    activeCases: raw.active,
    fatalityRate: Math.round(fatalityRate * 10) / 10,
    lastUpdated: new Date().toISOString(),
  };
}

// ─── Fetcher class ────────────────────────────────────────────────────────────
class DataFetcher {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheExpiry = 2 * 60 * 1000; // 2 minutes

  // Try a URL with axios; resolve to null on any error so callers can try next
  private async tryFetch<T>(url: string, timeout = 10000): Promise<T | null> {
    try {
      const res = await axios.get<T>(url, { timeout });
      return res.data ?? null;
    } catch {
      return null;
    }
  }

  async fetchGlobalStats(): Promise<GlobalPandemicStats> {
    const cached = this.cache.get('covid-global');
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    // Try primary, then mirror
    let raw = await this.tryFetch<DiseaseShGlobal>(`${DISEASE_SH}/all`);
    if (!raw) raw = await this.tryFetch<DiseaseShGlobal>(`${CORONA_API}/all`);

    const stats = raw ? normalizeGlobal(raw) : FALLBACK_GLOBAL;
    this.cache.set('covid-global', { data: stats, timestamp: Date.now() });
    return stats;
  }

  async fetchCountriesData(): Promise<Record<string, PandemicCountryData>> {
    const cached = this.cache.get('covid-countries');
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    // Try primary, then mirror
    let rawList = await this.tryFetch<DiseaseShCountry[]>(`${DISEASE_SH}/countries?allowNull=true`);
    if (!rawList || !Array.isArray(rawList) || rawList.length === 0) {
      rawList = await this.tryFetch<DiseaseShCountry[]>(`${CORONA_API}/countries`);
    }

    let result: Record<string, PandemicCountryData>;
    if (rawList && Array.isArray(rawList) && rawList.length > 0) {
      result = {};
      for (const country of rawList) {
        const normalized = normalizeCountry(country);
        result[normalized.countryCode] = normalized;
      }
    } else {
      console.warn('[dataFetcher] All API sources failed — using fallback COVID data');
      result = FALLBACK_COUNTRIES;
    }

    this.cache.set('covid-countries', { data: result, timestamp: Date.now() });
    return result;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const dataFetcher = new DataFetcher();
