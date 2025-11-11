import React from 'react';
import { useAppSelector } from '../store/hooks';
import {
  selectGlobalStats,
  selectGlobalCases,
  selectGlobalDeaths,
  selectGlobalRecovered,
  selectGlobalActive,
  selectGlobalVaccinationPercentage,
} from '../store/selectors';
import { formatNumber, formatPercentage } from '../utils/colorUtils';
import { Activity, Skull, Heart, Syringe, TrendingUp } from 'lucide-react';

export const GlobalStats: React.FC = () => {
  const globalStats = useAppSelector(selectGlobalStats);
  const cases = useAppSelector(selectGlobalCases);
  const deaths = useAppSelector(selectGlobalDeaths);
  const recovered = useAppSelector(selectGlobalRecovered);
  const active = useAppSelector(selectGlobalActive);
  const vaccination = useAppSelector(selectGlobalVaccinationPercentage);

  if (!globalStats) {
    return (
      <div className="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-lg p-6">
        <div className="text-center text-slate-400">Loading global statistics...</div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Cases',
      value: formatNumber(cases),
      icon: TrendingUp,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
    },
    {
      label: 'Deaths',
      value: formatNumber(deaths),
      icon: Skull,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
    },
    {
      label: 'Recovered',
      value: formatNumber(recovered),
      icon: Heart,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
    },
    {
      label: 'Active Cases',
      value: formatNumber(active),
      icon: Activity,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
    },
    {
      label: 'Vaccination Rate',
      value: formatPercentage(vaccination),
      icon: Syringe,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
    },
  ];

  return (
    <div className="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <TrendingUp className="w-6 h-6 text-blue-400" />
        Global Statistics
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={`${stat.bgColor} border ${stat.borderColor} rounded-lg p-4 transition-all hover:scale-105 hover:shadow-lg hover:shadow-${stat.color.split('-')[1]}-500/20`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-300">{stat.label}</span>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
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
