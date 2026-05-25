import { RootState } from './store';
import type { PandemicType } from '@/types/pandemic';

// Active pandemic selector
export const selectActivePandemic = (state: RootState): PandemicType => state.pandemic.activePandemic;

// Global stats for active pandemic
export const selectActiveGlobalStats = (state: RootState) => {
  const active = state.pandemic.activePandemic;
  return state.pandemic.global[active];
};

// Countries for active pandemic
export const selectActiveCountries = (state: RootState) => {
  const active = state.pandemic.activePandemic;
  return state.pandemic.countries[active] || {};
};

// Countries as array for active pandemic
export const selectActiveCountriesList = (state: RootState) => {
  const active = state.pandemic.activePandemic;
  return Object.values(state.pandemic.countries[active] || {});
};

// Global stats for specific pandemic
export const selectGlobalStatsForPandemic = (state: RootState, pandemic: PandemicType) =>
  state.pandemic.global[pandemic];

// Countries for specific pandemic
export const selectCountriesForPandemic = (state: RootState, pandemic: PandemicType) =>
  state.pandemic.countries[pandemic] || {};

// Selected country data for active pandemic
export const selectSelectedCountryCode = (state: RootState) => state.pandemic.selectedCountry;

export const selectSelectedCountryData = (state: RootState) => {
  const code = state.pandemic.selectedCountry;
  const active = state.pandemic.activePandemic;
  if (!code) return null;
  return state.pandemic.countries[active]?.[code] ?? null;
};

// Loading and error
export const selectLoading = (state: RootState) => state.pandemic.loading;
export const selectError = (state: RootState) => state.pandemic.error;
export const selectLastFetchForPandemic = (state: RootState, pandemic: PandemicType) =>
  state.pandemic.lastFetch[pandemic];

export const selectActiveLastFetch = (state: RootState) => {
  const active = state.pandemic.activePandemic;
  return state.pandemic.lastFetch[active];
};

// Computed: Countries sorted by cases
export const selectActiveCountriesSortedByCases = (state: RootState) => {
  return selectActiveCountriesList(state).sort((a, b) => (b.cases ?? 0) - (a.cases ?? 0));
};

// Computed: Countries sorted by deaths
export const selectActiveCountriesSortedByDeaths = (state: RootState) => {
  return selectActiveCountriesList(state).sort((a, b) => (b.deaths ?? 0) - (a.deaths ?? 0));
};

// Computed: Countries sorted by fatality rate
export const selectActiveCountriesSortedByFatalityRate = (state: RootState) => {
  return selectActiveCountriesList(state).sort(
    (a, b) => (b.fatalityRate ?? 0) - (a.fatalityRate ?? 0)
  );
};
