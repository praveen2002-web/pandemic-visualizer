import { RootState } from './store';
import { CountryData } from './covidSlice';

// Global stats selectors
export const selectGlobalStats = (state: RootState) => state.covid.global;
export const selectGlobalCases = (state: RootState) => state.covid.global?.totalCases ?? 0;
export const selectGlobalDeaths = (state: RootState) => state.covid.global?.totalDeaths ?? 0;
export const selectGlobalRecovered = (state: RootState) => state.covid.global?.totalRecovered ?? 0;
export const selectGlobalActive = (state: RootState) => state.covid.global?.totalActive ?? 0;
export const selectGlobalVaccinationPercentage = (state: RootState) => state.covid.global?.vaccinationPercentage ?? 0;

// Countries data selectors
export const selectAllCountries = (state: RootState) => state.covid.countries;
export const selectCountriesList = (state: RootState) => Object.values(state.covid.countries);

// Selected country selectors
export const selectSelectedCountryCode = (state: RootState) => state.covid.selectedCountry;
export const selectSelectedCountryData = (state: RootState) => {
  const code = state.covid.selectedCountry;
  if (!code) return null;
  return state.covid.countries[code] ?? null;
};

// Loading and error states
export const selectLoading = (state: RootState) => state.covid.loading;
export const selectError = (state: RootState) => state.covid.error;
export const selectLastFetch = (state: RootState) => state.covid.lastFetch;

// Computed selectors
export const selectCountriesSortedByCases = (state: RootState) => {
  return Object.values(state.covid.countries).sort((a, b) => b.cases - a.cases);
};

export const selectCountriesSortedByDeaths = (state: RootState) => {
  return Object.values(state.covid.countries).sort((a, b) => b.deaths - a.deaths);
};

export const selectCountriesSortedByVaccination = (state: RootState) => {
  return Object.values(state.covid.countries).sort((a, b) => b.vaccinationPercentage - a.vaccinationPercentage);
};

// Get severity level for color coding (0-1 scale)
export const selectCountrySeverity = (state: RootState, countryCode: string): number => {
  const country = state.covid.countries[countryCode];
  if (!country) return 0;
  
  const maxCases = Math.max(...Object.values(state.covid.countries).map(c => c.active), 1);
  return Math.min(country.active / maxCases, 1);
};

// Get all countries with their severity levels for globe coloring
export const selectCountriesSeverityMap = (state: RootState): Record<string, number> => {
  const countries = state.covid.countries;
  const maxActive = Math.max(...Object.values(countries).map(c => c.active), 1);
  
  const severityMap: Record<string, number> = {};
  Object.entries(countries).forEach(([code, country]) => {
    severityMap[code] = country.active / maxActive;
  });
  
  return severityMap;
};
