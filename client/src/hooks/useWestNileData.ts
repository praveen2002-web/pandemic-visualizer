import { useEffect } from 'react';
import { useAppDispatch } from '../store/hooks';
import { setAllPandemicData, setLoading, setError } from '../store/pandemicSlice';
import { westNileFetcher } from '../services/westNileFetcher';

export function useWestNileData() {
  const dispatch = useAppDispatch();

  const fetchData = async () => {
    try {
      dispatch(setLoading(true));
      const [globalStats, countriesData] = await Promise.all([
        westNileFetcher.fetchGlobalStats(),
        westNileFetcher.fetchWestNileCountries(),
      ]);

      dispatch(
        setAllPandemicData({
          pandemic: 'westnile',
          global: globalStats,
          countries: countriesData,
        })
      );
      dispatch(setError(null));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch West Nile data';
      dispatch(setError(errorMessage));
      console.error('Error fetching West Nile data:', error);
    }
  };

  useEffect(() => {
    // Initial fetch only (static file, no auto-refresh)
    fetchData();
  }, [dispatch]);

  return { refetch: fetchData };
}
