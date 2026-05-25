import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setAllPandemicData, setLoading, setError } from '../store/pandemicSlice';
import { ebolaFetcher } from '../services/ebolaFetcher';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes (Ebola data updates less frequently)

export function useEbolaData() {
  const dispatch = useAppDispatch();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = async () => {
    try {
      dispatch(setLoading(true));
      const [globalStats, countriesData] = await Promise.all([
        ebolaFetcher.fetchGlobalStats(),
        ebolaFetcher.fetchEbolaCountries(),
      ]);

      dispatch(
        setAllPandemicData({
          pandemic: 'ebola',
          global: globalStats,
          countries: countriesData,
        })
      );
      dispatch(setError(null));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch Ebola data';
      dispatch(setError(errorMessage));
      console.error('Error fetching Ebola data:', error);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Set up auto-refresh interval
    intervalRef.current = setInterval(() => {
      fetchData();
    }, REFRESH_INTERVAL);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [dispatch]);

  return { refetch: fetchData };
}
