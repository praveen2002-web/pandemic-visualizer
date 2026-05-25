/**
 * Ebola data fetcher
 * Data source: montanaflynn/ebola-outbreak-api (https://github.com/montanaflynn/ebola-outbreak-api)
 * Fallback: hardcoded seed data if API unavailable
 * 
 * The API provides historical Ebola outbreak data by country with case counts and deaths.
 * Refresh rate: 5 minutes (Ebola data changes less frequently than COVID-19)
 */

import axios from 'axios';
import type { GlobalPandemicStats, PandemicCountryData } from '@/types/pandemic';

// API endpoint
const EBOLA_API = 'https://api.covid19api.com/ebola'; // Note: using alternate endpoint
const EBOLA_FALLBACK_API = 'https://raw.githubusercontent.com/montanaflynn/ebola-outbreak-api/master/data/cases.json';

interface EbolaCountryResponse {
  country: string;
  cases?: number;
  deaths?: number;
  lat?: number;
  lon?: number;
}

interface EbolaAPIResponse {
  data?: EbolaCountryResponse[];
  countries?: EbolaCountryResponse[];
}

// Hardcoded fallback data (2014-2016 West African Ebola outbreak)
const EBOLA_FALLBACK_DATA: Record<string, PandemicCountryData> = {
  GN: {
    country: 'Guinea',
    countryCode: 'GN',
    cases: 3811,
    deaths: 2543,
    fatalityRate: 66.7,
  },
  LR: {
    country: 'Liberia',
    countryCode: 'LR',
    cases: 10675,
    deaths: 4810,
    fatalityRate: 45.1,
  },
  SL: {
    country: 'Sierra Leone',
    countryCode: 'SL',
    cases: 14124,
    deaths: 3956,
    fatalityRate: 28.0,
  },
  ML: {
    country: 'Mali',
    countryCode: 'ML',
    cases: 8,
    deaths: 6,
    fatalityRate: 75.0,
  },
  NG: {
    country: 'Nigeria',
    countryCode: 'NG',
    cases: 20,
    deaths: 8,
    fatalityRate: 40.0,
  },
  US: {
    country: 'United States',
    countryCode: 'US',
    cases: 4,
    deaths: 1,
    fatalityRate: 25.0,
  },
};

class EbolaFetcher {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes

  async fetchGlobalStats(): Promise<GlobalPandemicStats> {
    try {
      const cached = this.cache.get('ebola-global');
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }

      // Try to fetch from API
      const countriesData = await this.fetchEbolaCountries();
      const countries = Object.values(countriesData);

      const totalCases = countries.reduce((sum, c) => sum + (c.cases || 0), 0);
      const totalDeaths = countries.reduce((sum, c) => sum + (c.deaths || 0), 0);
      const fatalityRate = totalCases > 0 ? (totalDeaths / totalCases) * 100 : 0;

      const globalStats: GlobalPandemicStats = {
        totalCases,
        totalDeaths,
        fatalityRate: Math.round(fatalityRate * 10) / 10,
        lastUpdated: new Date().toISOString(),
      };

      this.cache.set('ebola-global', { data: globalStats, timestamp: Date.now() });
      return globalStats;
    } catch (error) {
      console.error('Error fetching Ebola global stats:', error);
      throw error;
    }
  }

  async fetchEbolaCountries(): Promise<Record<string, PandemicCountryData>> {
    try {
      const cached = this.cache.get('ebola-countries');
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }

      let countriesData: Record<string, PandemicCountryData> = {};

      try {
        // Try primary API endpoint
        const response = await axios.get<EbolaAPIResponse>(EBOLA_API, {
          timeout: 10000,
        });

        const data = response.data.data || response.data.countries || [];

        if (Array.isArray(data) && data.length > 0) {
          countriesData = this.normalizeEbolaData(data);
        } else {
          throw new Error('API returned empty data');
        }
      } catch (primaryError) {
        console.warn('Primary Ebola API failed, trying fallback:', primaryError);

        try {
          // Try fallback API endpoint
          const fallbackResponse = await axios.get<EbolaCountryResponse[]>(
            EBOLA_FALLBACK_API,
            { timeout: 10000 }
          );

          if (Array.isArray(fallbackResponse.data) && fallbackResponse.data.length > 0) {
            countriesData = this.normalizeEbolaData(fallbackResponse.data);
          } else {
            throw new Error('Fallback API returned empty data');
          }
        } catch (fallbackError) {
          console.warn('Fallback Ebola API also failed, using hardcoded data:', fallbackError);
          countriesData = EBOLA_FALLBACK_DATA;
        }
      }

      this.cache.set('ebola-countries', { data: countriesData, timestamp: Date.now() });
      return countriesData;
    } catch (error) {
      console.error('Error fetching Ebola countries data:', error);
      // Return fallback data instead of throwing
      return EBOLA_FALLBACK_DATA;
    }
  }

  private normalizeEbolaData(
    data: EbolaCountryResponse[]
  ): Record<string, PandemicCountryData> {
    const countryMap: Record<string, PandemicCountryData> = {};

    for (const item of data) {
      if (!item.country) continue;

      const code = this.mapCountryToCode(item.country);
      const cases = item.cases || 0;
      const deaths = item.deaths || 0;
      const fatalityRate = cases > 0 ? (deaths / cases) * 100 : 0;

      countryMap[code] = {
        country: item.country,
        countryCode: code,
        cases,
        deaths,
        fatalityRate: Math.round(fatalityRate * 10) / 10,
      };
    }

    return countryMap;
  }

  private mapCountryToCode(countryName: string): string {
    // Mapping of country names to ISO 3166-1 alpha-2 codes
    const mapping: Record<string, string> = {
      'Guinea': 'GN',
      'Liberia': 'LR',
      'Sierra Leone': 'SL',
      'Mali': 'ML',
      'Nigeria': 'NG',
      'United States': 'US',
      'UK': 'GB',
      'Spain': 'ES',
      'Italy': 'IT',
      'France': 'FR',
    };

    return mapping[countryName] || countryName.slice(0, 2).toUpperCase();
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const ebolaFetcher = new EbolaFetcher();
