import React, { useState, useEffect } from 'react';
import { useCovidData } from '@/hooks/useCovidData';
import { useEbolaData } from '@/hooks/useEbolaData';
import { useWestNileData } from '@/hooks/useWestNileData';
import { GlobeView } from '@/components/GlobeView';
import { GlobeLegend } from '@/components/GlobeLegend';
import { CountryDetailModal } from '@/components/CountryDetailModal';
import { GlobalStats } from '@/components/GlobalStats';
import { CountryList } from '@/components/CountryList';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setActivePandemic } from '@/store/pandemicSlice';
import {
  selectActivePandemic,
  selectLoading,
  selectError,
  selectActiveLastFetch,
} from '@/store/pandemicSelectors';
import { Globe, List, AlertCircle, Loader } from 'lucide-react';
import { getPandemicConfig, MetricType, NormalizationType } from '@/config/pandemicConfig';
import type { PandemicType } from '@/types/pandemic';

export default function Home() {
  const dispatch = useAppDispatch();
  const activePandemic = useAppSelector(selectActivePandemic);
  const isLoading = useAppSelector(selectLoading);
  const error = useAppSelector(selectError);
  const lastFetch = useAppSelector(selectActiveLastFetch);
  const activePandemicCountries = useAppSelector(state => state.pandemic.countries[activePandemic]);
  const hasNoData = !activePandemicCountries || Object.keys(activePandemicCountries).length === 0;

  // Load data for each pandemic
  const { refetch: refetchCovid } = useCovidData();
  const { refetch: refetchEbola } = useEbolaData();
  const { refetch: refetchWestNile } = useWestNileData();

  const [viewMode, setViewMode] = useState<'globe' | 'list'>('globe');
  const [metric, setMetric] = useState<MetricType>('casesPerMillion');
  const [normalization, setNormalization] = useState<NormalizationType>('log');
  const [minValue, setMinValue] = useState(0);
  const [maxValue, setMaxValue] = useState(1);

  // Get active pandemic config
  const config = getPandemicConfig(activePandemic);

  // Reset metric when pandemic changes
  useEffect(() => {
    setMetric(config.defaultMetric);
  }, [activePandemic, config]);

  const handlePandemicChange = (pandemic: PandemicType) => {
    dispatch(setActivePandemic(pandemic));
    
    // Trigger fresh data fetch for the newly selected pandemic
    if (pandemic === 'covid') {
      refetchCovid();
    } else if (pandemic === 'ebola') {
      refetchEbola();
    } else if (pandemic === 'westnile') {
      refetchWestNile();
    }
  };

  const pandemics: Array<{ id: PandemicType; label: string }> = [
    { id: 'covid', label: 'COVID-19' },
    { id: 'ebola', label: 'Ebola' },
    { id: 'westnile', label: 'West Nile' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur border-b border-slate-700/50 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <img src="/logo.png" alt="logo" className="w-[50px] h-[50px] flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-white truncate">
                  Pandemic Visualizer - {config.shortName}
                </h1>
                <p className="text-xs text-slate-400">Real-time interactive 3D globe with live statistics</p>
              </div>
            </div>

            {/* Pandemic Tabs */}
            <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1 border border-slate-700">
              {pandemics.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => handlePandemicChange(id)}
                  className={`px-3 py-2 rounded-md transition-all text-sm font-medium whitespace-nowrap ${
                    activePandemic === id
                      ? `bg-${id === 'covid' ? 'blue' : id === 'ebola' ? 'red' : 'amber'}-600 text-white shadow-lg`
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  style={
                    activePandemic === id
                      ? { backgroundColor: config.accentColor }
                      : undefined
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('globe')}
                className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 ${
                  viewMode === 'globe'
                    ? 'bg-red-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-4 h-4" />
                Globe
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 ${
                  viewMode === 'list'
                    ? 'bg-red-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <List className="w-4 h-4" />
                List
              </button>
            </div>

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-slate-400">
                <Loader className="w-4 h-4 animate-spin" />
                <span className="text-sm">Updating...</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-900/20 border-b border-red-800/50 backdrop-blur">
          <div className="container mx-auto px-4 py-3 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Global Stats */}
      <section className="border-b border-slate-700/50">
        <div className="container mx-auto px-4 py-6">
          <GlobalStats />
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {isLoading && hasNoData ? (
          <div className="flex items-center justify-center h-[calc(100vh-400px)]">
            <div className="text-center">
              <Loader className="w-12 h-12 animate-spin text-slate-400 mx-auto mb-4" />
              <p className="text-slate-400">Loading {config.name} data...</p>
            </div>
          </div>
        ) : viewMode === 'globe' ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-400px)]">
            {/* Legend Sidebar */}
            <div className="lg:col-span-1 flex flex-col gap-4">
              <GlobeLegend
                metric={metric}
                normalization={normalization}
                onMetricChange={setMetric}
                onNormalizationChange={setNormalization}
                minValue={minValue}
                maxValue={maxValue}
                pandemic={activePandemic}
              />
            </div>

            {/* Globe View */}
            <div className="lg:col-span-3 rounded-lg overflow-hidden border border-slate-700/50 shadow-2xl min-h-[70vh]">
              <GlobeView
                metric={metric}
                normalization={normalization}
                pandemic={activePandemic}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-lg overflow-hidden border border-slate-700/50 h-[calc(100vh-400px)]">
            <CountryList />
          </div>
        )}
      </main>

      {/* Country Detail Modal */}
      <CountryDetailModal />

      {/* Footer */}
      <footer className="border-t border-slate-700/50 bg-slate-900/50 backdrop-blur mt-60">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
            <div>
              <h3 className="font-semibold text-white mb-2">Data Sources</h3>
              <ul className="text-sm text-slate-400 space-y-1">
                {activePandemic === 'covid' && (
                  <>
                    <li>
                      <a
                        href="https://www.worldometers.info/coronavirus"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-400 transition-colors"
                      >
                        Worldometer
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://ourworldindata.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-400 transition-colors"
                      >
                        Our World in Data
                      </a>
                    </li>
                  </>
                )}
                {activePandemic === 'ebola' && (
                  <li>
                    <a
                      href="https://github.com/montanaflynn/ebola-outbreak-api"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-red-400 transition-colors"
                    >
                      montanaflynn/ebola-outbreak-api
                    </a>
                  </li>
                )}
                {activePandemic === 'westnile' && (
                  <li>
                    <a
                      href="https://www.cdc.gov/west-nile-virus"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-amber-400 transition-colors"
                    >
                      CDC West Nile Virus
                    </a>
                  </li>
                )}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">About {config.name}</h3>
              <p className="text-sm text-slate-400">{config.description}</p>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">Information</h3>
              <p className="text-sm text-slate-400">
                {activePandemic === 'covid'
                  ? 'Data updates every 2 minutes'
                  : activePandemic === 'ebola'
                  ? 'Data updates every 5 minutes'
                  : 'Data last updated: 2024'}
                . Last update:{' '}
                {lastFetch ? new Date(lastFetch).toLocaleTimeString() : 'N/A'}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-700/50 pt-6 text-center text-sm text-slate-500">
            <p>© 2025 Pandemic Visualizer</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

