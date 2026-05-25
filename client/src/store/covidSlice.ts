import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CountryData {
  name: string;
  code: string;
  flag?: string;
  cases: number;
  deaths: number;
  recovered: number;
  active: number;
  tests: number;
  population: number;
  casesPerMillion: number;
  deathsPerMillion: number;
  testsPerMillion: number;
  vaccinationPercentage: number;
  dailyCases: number[];
  dailyDeaths: number[];
  dates: string[];
}

export interface GlobalStats {
  totalCases: number;
  totalDeaths: number;
  totalRecovered: number;
  totalActive: number;
  totalTests: number;
  totalVaccinated: number;
  vaccinationPercentage: number;
  lastUpdated: string;
}

export interface CovidState {
  global: GlobalStats | null;
  countries: Record<string, CountryData>;
  selectedCountry: string | null;
  loading: boolean;
  error: string | null;
  lastFetch: string | null;
}

const initialState: CovidState = {
  global: null,
  countries: {},
  selectedCountry: null,
  loading: false,
  error: null,
  lastFetch: null,
};

const covidSlice = createSlice({
  name: 'covid',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    setGlobalStats: (state, action: PayloadAction<GlobalStats>) => {
      state.global = action.payload;
      state.lastFetch = new Date().toISOString();
    },
    setCountriesData: (state, action: PayloadAction<Record<string, CountryData>>) => {
      state.countries = action.payload;
    },
    updateCountryData: (state, action: PayloadAction<{ code: string; data: CountryData }>) => {
      state.countries[action.payload.code] = action.payload.data;
    },
    setSelectedCountry: (state, action: PayloadAction<string | null>) => {
      state.selectedCountry = action.payload;
    },
    setAllData: (state, action: PayloadAction<{ global: GlobalStats; countries: Record<string, CountryData> }>) => {
      state.global = action.payload.global;
      state.countries = action.payload.countries;
      state.lastFetch = new Date().toISOString();
      state.loading = false;
      state.error = null;
    },
  },
});

export const {
  setLoading,
  setError,
  setGlobalStats,
  setCountriesData,
  updateCountryData,
  setSelectedCountry,
  setAllData,
} = covidSlice.actions;

export default covidSlice.reducer;
