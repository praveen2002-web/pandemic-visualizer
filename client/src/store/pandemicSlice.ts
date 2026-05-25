import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { PandemicType, GlobalPandemicStats, PandemicCountryData } from '@/types/pandemic';

export interface PandemicState {
  activePandemic: PandemicType;
  global: Record<PandemicType, GlobalPandemicStats | null>;
  countries: Record<PandemicType, Record<string, PandemicCountryData>>;
  selectedCountry: string | null;
  loading: boolean;
  error: string | null;
  lastFetch: Record<PandemicType, string | null>;
}

const initialState: PandemicState = {
  activePandemic: 'covid',
  global: {
    covid: null,
    ebola: null,
    westnile: null,
  },
  countries: {
    covid: {},
    ebola: {},
    westnile: {},
  },
  selectedCountry: null,
  loading: false,
  error: null,
  lastFetch: {
    covid: null,
    ebola: null,
    westnile: null,
  },
};

const pandemicSlice = createSlice({
  name: 'pandemic',
  initialState,
  reducers: {
    setActivePandemic: (state, action: PayloadAction<PandemicType>) => {
      state.activePandemic = action.payload;
      state.selectedCountry = null;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    setGlobalStats: (
      state,
      action: PayloadAction<{ pandemic: PandemicType; stats: GlobalPandemicStats }>
    ) => {
      state.global[action.payload.pandemic] = action.payload.stats;
      state.lastFetch[action.payload.pandemic] = new Date().toISOString();
    },
    setCountriesData: (
      state,
      action: PayloadAction<{ pandemic: PandemicType; data: Record<string, PandemicCountryData> }>
    ) => {
      state.countries[action.payload.pandemic] = action.payload.data;
    },
    setAllPandemicData: (
      state,
      action: PayloadAction<{
        pandemic: PandemicType;
        global: GlobalPandemicStats;
        countries: Record<string, PandemicCountryData>;
      }>
    ) => {
      state.global[action.payload.pandemic] = action.payload.global;
      state.countries[action.payload.pandemic] = action.payload.countries;
      state.lastFetch[action.payload.pandemic] = new Date().toISOString();
      state.loading = false;
      state.error = null;
    },
    setSelectedCountry: (state, action: PayloadAction<string | null>) => {
      state.selectedCountry = action.payload;
    },
  },
});

export const {
  setActivePandemic,
  setLoading,
  setError,
  setGlobalStats,
  setCountriesData,
  setAllPandemicData,
  setSelectedCountry,
} = pandemicSlice.actions;

export default pandemicSlice.reducer;
