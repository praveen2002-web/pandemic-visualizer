import axios from 'axios';
import { CountryData, GlobalStats } from '../store/covidSlice';

const WORLDOMETER_API = 'https://disease.sh/v3/covid-19';
const OWID_API = 'https://covid.ourworldindata.org/data/';

interface WorldometerCountry {
  country: string;
  countryInfo: {
    iso2: string;
    iso3: string;
    flag?: string;
  };
  cases: number;
  deaths: number;
  recovered: number;
  active: number;
  tests: number;
  population: number;
  casesPerMillion: number;
  deathsPerMillion: number;
  testsPerMillion: number;
}

interface WorldometerGlobal {
  cases: number;
  deaths: number;
  recovered: number;
  active: number;
  tests: number;
  affectedCountries: number;
}

interface OWIDData {
  [key: string]: {
    data: Array<{
      date: string;
      total_cases?: number;
      new_cases?: number;
      total_deaths?: number;
      new_deaths?: number;
      people_vaccinated?: number;
      people_fully_vaccinated?: number;
    }>;
  };
}

// Country code mapping for matching data sources
const COUNTRY_CODE_MAP: Record<string, string> = {
  'US': 'USA',
  'UK': 'GB',
  'South Korea': 'KR',
  'Czech Republic': 'CZ',
  'Czechia': 'CZ',
  'Taiwan': 'TW',
  'Palestine': 'PS',
  'Bahamas': 'BS',
  'Brunei': 'BN',
  'Curacao': 'CW',
  'Faeroe Islands': 'FO',
  'French Guiana': 'GF',
  'Guadeloupe': 'GP',
  'Isle of Man': 'IM',
  'Martinique': 'MQ',
  'Reunion': 'RE',
  'Saint Barthelemy': 'BL',
  'Saint Martin': 'MF',
  'Sint Maarten': 'SX',
  'Turks and Caicos Islands': 'TC',
  'Northern Cyprus': 'TR',
  'Diamond Princess': 'XX',
  'MS Zaandam': 'XX',
};

class DataFetcher {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheExpiry = 60000; // 1 minute cache

  async fetchGlobalStats(): Promise<GlobalStats> {
    try {
      const cached = this.cache.get('global');
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }

      const response = await axios.get<WorldometerGlobal>(`${WORLDOMETER_API}/all`);
      const data = response.data;

      const globalStats: GlobalStats = {
        totalCases: data.cases,
        totalDeaths: data.deaths,
        totalRecovered: data.recovered,
        totalActive: data.active,
        totalTests: data.tests,
        totalVaccinated: 0, // Will be updated from OWID data
        vaccinationPercentage: 0,
        lastUpdated: new Date().toISOString(),
      };

      this.cache.set('global', { data: globalStats, timestamp: Date.now() });
      return globalStats;
    } catch (error) {
      console.error('Error fetching global stats:', error);
      throw error;
    }
  }

  async fetchCountriesData(): Promise<Record<string, CountryData>> {
    try {
      const cached = this.cache.get('countries');
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }

      // Fetch Worldometer data (required)
      const worldometerResponse = await axios.get<WorldometerCountry[]>(
        `${WORLDOMETER_API}/countries`,
        { timeout: 15000 }
      );

      // Fetch OWID data (optional, with fallback)
      let owidResponse: Record<string, any> = {};
      try {
        owidResponse = await this.fetchOWIDData();
      } catch (error) {
        console.warn('OWID data fetch failed, continuing with Worldometer data only');
        owidResponse = {};
      }

      const countriesData: Record<string, CountryData> = {};

      for (const country of worldometerResponse.data) {
        const code = country.countryInfo.iso2 || country.countryInfo.iso3 || country.country;
        const owidCountry = owidResponse[code] || owidResponse[country.country];

        // Get vaccination data and trends from OWID
        const vaccinationPercentage = this.getLatestVaccinationPercentage(owidCountry);
        const { dailyCases, dailyDeaths, dates } = this.extractTrends(owidCountry);

        countriesData[code] = {
          name: country.country,
          code: code,
          flag: country.countryInfo.flag,
          cases: country.cases,
          deaths: country.deaths,
          recovered: country.recovered,
          active: country.active,
          tests: country.tests,
          population: country.population,
          casesPerMillion: country.casesPerMillion,
          deathsPerMillion: country.deathsPerMillion,
          testsPerMillion: country.testsPerMillion,
          vaccinationPercentage: vaccinationPercentage,
          dailyCases: dailyCases,
          dailyDeaths: dailyDeaths,
          dates: dates,
        };
      }

      this.cache.set('countries', { data: countriesData, timestamp: Date.now() });
      return countriesData;
    } catch (error) {
      console.error('Error fetching countries data:', error);
      // Return cached data if available, even if expired
      const expired = this.cache.get('countries');
      if (expired) {
        console.warn('Using expired cache due to fetch error');
        return expired.data;
      }
      throw error;
    }
  }

  private async fetchOWIDData(): Promise<Record<string, any>> {
    try {
      // Fetch vaccination data from OWID with timeout
      const response = await axios.get(`${OWID_API}vaccinations/latest.json`, {
        timeout: 10000, // 10 second timeout
      });
      return response.data || {};
    } catch (error) {
      console.warn('Error fetching OWID data, using fallback:', error);
      // Return empty object as fallback - vaccination data is optional
      return {};
    }
  }

  private getLatestVaccinationPercentage(owidCountry: any): number {
    if (!owidCountry || !owidCountry.data) return 0;

    // Find the latest entry with vaccination data
    for (let i = owidCountry.data.length - 1; i >= 0; i--) {
      const entry = owidCountry.data[i];
      if (entry.people_fully_vaccinated && entry.population) {
        return Math.min((entry.people_fully_vaccinated / entry.population) * 100, 100);
      }
    }
    return 0;
  }

  private extractTrends(owidCountry: any): { dailyCases: number[]; dailyDeaths: number[]; dates: string[] } {
    const dailyCases: number[] = [];
    const dailyDeaths: number[] = [];
    const dates: string[] = [];

    if (!owidCountry || !owidCountry.data) {
      return { dailyCases, dailyDeaths, dates };
    }

    // Get last 30 days of data
    const data = owidCountry.data.slice(-30);

    for (const entry of data) {
      if (entry.date) {
        dates.push(entry.date);
        dailyCases.push(entry.new_cases || 0);
        dailyDeaths.push(entry.new_deaths || 0);
      }
    }

    return { dailyCases, dailyDeaths, dates };
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const dataFetcher = new DataFetcher();
