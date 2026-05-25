/**
 * West Nile Virus data fetcher
 * Data source: /public/West Nile virus.csv
 * 
 * CSV Structure (inferred from data):
 * - FullGeoName: "STATE, COUNTY" format
 * - Location: County FIPS code
 * - Activity: Human infections / Non-human activity / Mixed
 * - Total human disease cases: Total confirmed cases
 * - Neuroinvasive disease cases: More severe form of WNV
 * - Presumptive viremic blood donors: Blood bank detections
 * 
 * Data aggregation: Sum cases by state (2-letter code derived from FullGeoName)
 */

import type { GlobalPandemicStats, PandemicCountryData } from '@/types/pandemic';
import Papa from 'papaparse';

interface WestNileRawRow {
  FullGeoName: string;
  Location: string;
  Activity: string;
  'Total human disease cases': string;
  'Neuroinvasive disease cases': string;
  '**Presumptive viremic blood donors': string;
}

class WestNileFetcher {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours (static file)

  async fetchGlobalStats(): Promise<GlobalPandemicStats> {
    try {
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
        lastUpdated: new Date().toISOString(),
      };

      this.cache.set('westnile-global', { data: globalStats, timestamp: Date.now() });
      return globalStats;
    } catch (error) {
      console.error('Error fetching West Nile global stats:', error);
      throw error;
    }
  }

  async fetchWestNileCountries(): Promise<Record<string, PandemicCountryData>> {
    try {
      const cached = this.cache.get('westnile-countries');
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }

      const csvText = await fetch('/West Nile virus.csv').then(r => r.text());
      const parsed = Papa.parse<WestNileRawRow>(csvText, { 
        header: true,
        skipEmptyLines: true,
      });
      const rows = parsed.data;

      console.log('[West Nile CSV] Loaded', rows.length, 'rows. First 5:');
      rows.slice(0, 5).forEach((row, idx) => {
        console.log(`  Row ${idx}:`, row);
      });

      const statesData: Record<string, PandemicCountryData> = {};

      for (const row of rows) {
        // Extract state code from "AL, Baldwin" → "AL"
        const stateMatch = row.FullGeoName?.match(/^([A-Z]{2}),/);
        if (!stateMatch) continue;

        const stateCode = stateMatch[1];
        const stateName = this.getStateName(stateCode);
        const cases = parseInt(row['Total human disease cases'] || '0', 10) || 0;

        if (!statesData[stateCode]) {
          statesData[stateCode] = {
            country: stateName, // Use state name instead of country
            countryCode: stateCode,
            cases: 0,
            deaths: 0,
          };
        }

        statesData[stateCode].cases += cases;
      }

      this.cache.set('westnile-countries', { data: statesData, timestamp: Date.now() });
      return statesData;
    } catch (error) {
      console.error('Error fetching West Nile countries data:', error);
      throw error;
    }
  }



  /**
   * Map US state codes to state names
   */
  private getStateName(code: string): string {
    const stateNames: Record<string, string> = {
      AL: 'Alabama',
      AK: 'Alaska',
      AZ: 'Arizona',
      AR: 'Arkansas',
      CA: 'California',
      CO: 'Colorado',
      CT: 'Connecticut',
      DE: 'Delaware',
      FL: 'Florida',
      GA: 'Georgia',
      HI: 'Hawaii',
      ID: 'Idaho',
      IL: 'Illinois',
      IN: 'Indiana',
      IA: 'Iowa',
      KS: 'Kansas',
      KY: 'Kentucky',
      LA: 'Louisiana',
      ME: 'Maine',
      MD: 'Maryland',
      MA: 'Massachusetts',
      MI: 'Michigan',
      MN: 'Minnesota',
      MS: 'Mississippi',
      MO: 'Missouri',
      MT: 'Montana',
      NE: 'Nebraska',
      NV: 'Nevada',
      NH: 'New Hampshire',
      NJ: 'New Jersey',
      NM: 'New Mexico',
      NY: 'New York',
      NC: 'North Carolina',
      ND: 'North Dakota',
      OH: 'Ohio',
      OK: 'Oklahoma',
      OR: 'Oregon',
      PA: 'Pennsylvania',
      RI: 'Rhode Island',
      SC: 'South Carolina',
      SD: 'South Dakota',
      TN: 'Tennessee',
      TX: 'Texas',
      UT: 'Utah',
      VT: 'Vermont',
      VA: 'Virginia',
      WA: 'Washington',
      WV: 'West Virginia',
      WI: 'Wisconsin',
      WY: 'Wyoming',
    };

    return stateNames[code] || code;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const westNileFetcher = new WestNileFetcher();
