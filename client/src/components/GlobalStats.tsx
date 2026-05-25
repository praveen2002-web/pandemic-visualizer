import React from 'react';
import { useAppSelector } from '../store/hooks';
import {
  selectActivePandemic,
  selectActiveGlobalStats,
} from '@/store/pandemicSelectors';
import { getPandemicConfig } from '@/config/pandemicConfig';
import { formatNumber, formatPercentage } from '../utils/colorUtils';
import { Activity, Skull, Heart, Syringe, TrendingUp, Zap } from 'lucide-react';

export const GlobalStats: React.FC = () => {
  const activePandemic = useAppSelector(selectActivePandemic);
  const globalStats = useAppSelector(selectActiveGlobalStats);
  const config = getPandemicConfig(activePandemic);

  if (!globalStats) {
    return (
      <div className="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-lg p-6">
        <div className="text-center text-slate-400">Loading global statistics...</div>
      </div>
    );
  }

  // Build stats array based on pandemic configuration
  const stats = [
    {
      label: 'Total Cases',
      value: formatNumber(globalStats.totalCases),
      icon: TrendingUp,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
    },
    {
      label: 'Deaths',
      value: formatNumber(globalStats.totalDeaths),
      icon: Skull,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
    },
    // Fatality Rate - shown for all pandemics
    {
      label: activePandemic === 'ebola' ? 'Case Fatality Rate' : 'Fatality Rate',
      value: `${globalStats.fatalityRate.toFixed(1)}%`,
      icon: Zap,
      color: activePandemic === 'ebola' ? 'text-red-300' : 'text-amber-400',
      bgColor: activePandemic === 'ebola' ? 'bg-red-500/10' : 'bg-amber-500/10',
      borderColor: activePandemic === 'ebola' ? 'border-red-500/30' : 'border-amber-500/30',
      prominence: activePandemic === 'ebola' ? 'high' : 'normal',
    },
  ];

  if (activePandemic === 'covid' && globalStats.totalRecovered && globalStats.totalRecovered > 0) {
    stats.push({
      label: 'Recovered',
      value: formatNumber(globalStats.totalRecovered),
      icon: Heart,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
    });
  }

  if (activePandemic === 'covid' && globalStats.activeCases && globalStats.activeCases > 0) {
    stats.push({
      label: 'Active Cases',
      value: formatNumber(globalStats.activeCases),
      icon: Activity,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
    });
  }

  if (activePandemic === 'westnile') {
    stats.push({
      label: 'Peak Year',
      value: '2012',
      icon: Activity,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
    });
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <TrendingUp className="w-6 h-6" style={{ color: config.accentColor }} />
        {config.name} — Global Statistics
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const prominence = (stat as any).prominence || 'normal';
          const isHighProminence = prominence === 'high';

          return (
            <div
              key={index}
              className={`${stat.bgColor} border ${stat.borderColor} rounded-lg p-4 transition-all hover:scale-105 hover:shadow-lg ${
                isHighProminence ? 'ring-2 md:col-span-2 lg:col-span-1' : ''
              }`}
              style={isHighProminence ? { borderColor: stat.color } : undefined}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${isHighProminence ? 'text-white' : 'text-slate-300'}`}>
                  {stat.label}
                </span>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className={`text-2xl font-bold ${stat.color} ${isHighProminence ? 'text-3xl' : ''}`}>
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-700">
        <p className="text-xs text-slate-400">
          Last updated: {globalStats.lastUpdated ? new Date(globalStats.lastUpdated).toLocaleString() : 'N/A'}
        </p>
      </div>
    </div>
  );
};
