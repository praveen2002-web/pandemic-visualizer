import React from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { selectSelectedCountryData } from '@/store/pandemicSelectors';
import { setSelectedCountry } from '@/store/pandemicSlice';
import { formatNumber, formatPercentage } from '../utils/colorUtils';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { X, TrendingUp, Users, Skull, Heart, Syringe, Activity } from 'lucide-react';

export const CountryDetailModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const location = useAppSelector(selectSelectedCountryData);

  if (!location) return null;

  // Prepare chart data with safe defaults
  const trendData = (location.dates || []).map((date, index) => ({
    date: date || '',
    cases: (location.dailyCases?.[index] || 0) as number,
    deaths: (location.dailyDeaths?.[index] || 0) as number,
  })).filter(d => d.date); // Filter out empty dates

  // Safe property access with defaults
  const safeLocation = {
    country: location.country || 'Unknown Location',
    countryCode: location.countryCode || 'N/A',
    cases: location.cases ?? 0,
    deaths: location.deaths ?? 0,
    recovered: location.recovered ?? 0,
    active: location.active ?? 0,
    fatalityRate: location.fatalityRate ?? 0,
  };

  const handleClose = () => {
    dispatch(setSelectedCountry(null));
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-4xl w-full my-8 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 px-6 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-bold text-white">{safeLocation.country}</h2>
            <p className="text-sm text-slate-400 mt-1">{safeLocation.countryCode}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
          {/* Key Metrics Grid */}
          <div className="px-6 py-6 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              Key Statistics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Total Cases */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 hover:bg-blue-500/15 transition-colors">
                <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  Total Cases
                </p>
                <p className="text-2xl font-bold text-blue-400">{formatNumber(safeLocation.cases)}</p>
              </div>

              {/* Deaths */}
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 hover:bg-red-500/15 transition-colors">
                <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                  <Skull className="w-3 h-3" />
                  Deaths
                </p>
                <p className="text-2xl font-bold text-red-400">{formatNumber(safeLocation.deaths)}</p>
              </div>

              {/* Fatality Rate */}
              {safeLocation.fatalityRate > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 hover:bg-amber-500/15 transition-colors">
                  <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Fatality Rate
                  </p>
                  <p className="text-2xl font-bold text-amber-400">{safeLocation.fatalityRate.toFixed(1)}%</p>
                </div>
              )}

              {/* Recovered */}
              {safeLocation.recovered > 0 && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 hover:bg-green-500/15 transition-colors">
                  <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    Recovered
                  </p>
                  <p className="text-2xl font-bold text-green-400">{formatNumber(safeLocation.recovered)}</p>
                </div>
              )}

              {/* Active Cases */}
              {safeLocation.active > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 hover:bg-yellow-500/15 transition-colors">
                  <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Active Cases
                  </p>
                  <p className="text-2xl font-bold text-yellow-400">{formatNumber(safeLocation.active)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Charts */}
          {trendData.length > 0 && (
            <div className="px-6 py-6 space-y-6">
              {/* Daily Cases Chart */}
              <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Daily Cases
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12, fill: '#94a3b8' }}
                      interval={Math.floor(Math.max(0, trendData.length / 5))}
                    />
                    <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(71, 85, 105, 0.5)',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cases"
                      stroke="#3b82f6"
                      dot={false}
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Daily Deaths Chart */}
              <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                  <Skull className="w-4 h-4" />
                  Daily Deaths
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12, fill: '#94a3b8' }}
                      interval={Math.floor(Math.max(0, trendData.length / 5))}
                    />
                    <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(71, 85, 105, 0.5)',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Bar dataKey="deaths" fill="#ef4444" isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* No data message */}
          {trendData.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-slate-400">No historical trend data available for this location.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-800/50 border-t border-slate-700 px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Pandemic Visualizer
          </p>
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-sm font-medium text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
