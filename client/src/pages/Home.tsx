import React, { useState } from 'react';
import { useCovidData } from '@/hooks/useCovidData';
import { GlobeView } from '@/components/GlobeView';
import { GlobeLegend } from '@/components/GlobeLegend';
import { CountryDetailModal } from '@/components/CountryDetailModal';
import { GlobalStats } from '@/components/GlobalStats';
import { CountryList } from '@/components/CountryList';
import { useAppSelector } from '@/store/hooks';
import { selectLoading, selectError } from '@/store/selectors';
import { Globe, List, AlertCircle, Loader } from 'lucide-react';
import { MetricType, NormalizationType } from '@/utils/colorUtils';

export default function Home() {
  const { loading, lastFetch } = useCovidData();
  const [viewMode, setViewMode] = useState<'globe' | 'list'>('globe');
  const [metric, setMetric] = useState<MetricType>('casesPerMillion');
  const [normalization, setNormalization] = useState<NormalizationType>('log');
  const [minValue, setMinValue] = useState(0);
  const [maxValue, setMaxValue] = useState(1);

  const pandemicName = "Corona";
  
  const isLoading = useAppSelector(selectLoading);
  const error = useAppSelector(selectError);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur border-b border-slate-700/50 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="logo" className='w-[50px] h-[50px]'/>
              <div>
                <h1 className="text-2xl font-bold text-white">Pandemic Visualizer - {pandemicName}</h1>
                <p className="text-xs text-slate-400">Real-time interactive 3D globe with live statistics</p>
              </div>
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
        {viewMode === 'globe' ? (
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
              />
            </div>

            {/* Globe View */}
            <div className="lg:col-span-3 rounded-lg overflow-hidden border border-slate-700/50 shadow-2xl min-h-[70vh]">
              <GlobeView metric={metric} normalization={normalization} />
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
              </ul>
            </div>

           

            <div>
              <h3 className="font-semibold text-white mb-2">Information</h3>
              <p className="text-sm text-slate-400">
                Data updates every 2 minutes. Last update:{' '}
                {lastFetch ? new Date(lastFetch).toLocaleTimeString() : 'N/A'}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-700/50 pt-6 text-center text-sm text-slate-500">
            <p>© 2025 COVID-19 Pandemic Visualizer</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
