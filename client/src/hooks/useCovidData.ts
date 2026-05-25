import { useEffect, useRef } from 'react';
import { useAppDispatch } from '../store/hooks';
import { setAllPandemicData, setLoading, setError } from '../store/pandemicSlice';
import { dataFetcher } from '../services/dataFetcher';

const REFRESH_INTERVAL = 2 * 60 * 1000; // 2 minutes

export function useCovidData() {
  const dispatch = useAppDispatch();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = async () => {
    try {
      dispatch(setLoading(true));
      const [globalStats, countriesData] = await Promise.all([
        dataFetcher.fetchGlobalStats(),
        dataFetcher.fetchCountriesData(),
      ]);

      dispatch(
        setAllPandemicData({
          pandemic: 'covid',
          global: globalStats,
          countries: countriesData,
        })
      );
      dispatch(setError(null));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch COVID-19 data';
      dispatch(setError(errorMessage));
      console.error('Error fetching COVID-19 data:', error);
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
