import { useEffect } from 'react';
import { useAppDispatch } from '../store/hooks';
import { setAllPandemicData, setLoading, setError } from '../store/pandemicSlice';
import { dataFetcher } from '../services/dataFetcher';
import { ebolaFetcher } from '../services/ebolaFetcher';
import { westNileFetcher } from '../services/westNileFetcher';
import type { PandemicType } from '@/types/pandemic';

// pollMs: only COVID is live; Ebola and West Nile are static files, loaded once per visit.
const SOURCES = {
  covid: {
    global: () => dataFetcher.fetchGlobalStats(),
    countries: () => dataFetcher.fetchCountriesData(),
    isFallback: () => dataFetcher.usedFallback,
    pollMs: 2 * 60 * 1000,
  },
  ebola: {
    global: () => ebolaFetcher.fetchGlobalStats(),
    countries: () => ebolaFetcher.fetchEbolaCountries(),
    isFallback: () => false,
    pollMs: 0,
  },
  westnile: {
    global: () => westNileFetcher.fetchGlobalStats(),
    countries: () => westNileFetcher.fetchWestNileCountries(),
    isFallback: () => false,
    pollMs: 0,
  },
};

/** Loads (and for COVID, refreshes) data for the active pandemic only. */
export function usePandemicData(pandemic: PandemicType) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const src = SOURCES[pandemic];
    let stale = false; // set when the user switches away, so a late result is dropped

    const load = async () => {
      try {
        dispatch(setLoading(true));
        const [global, countries] = await Promise.all([src.global(), src.countries()]);
        if (stale) return;
        dispatch(
          setAllPandemicData({
            pandemic,
            global: src.isFallback() ? { ...global, isFallback: true } : global,
            countries,
          })
        );
      } catch (error) {
        if (stale) return;
        dispatch(setError(error instanceof Error ? error.message : `Failed to fetch ${pandemic} data`));
        console.error(`Error fetching ${pandemic} data:`, error);
      }
    };

    load();
    const id = src.pollMs ? setInterval(load, src.pollMs) : undefined;
    return () => {
      stale = true;
      clearInterval(id);
    };
  }, [pandemic, dispatch]);
}
