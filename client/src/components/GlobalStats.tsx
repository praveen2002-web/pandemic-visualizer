import React from 'react';
import { useAppSelector } from '../store/hooks';
import {
  selectActivePandemic,
  selectActiveGlobalStats,
} from '@/store/pandemicSelectors';
import { getPandemicConfig } from '@/config/pandemicConfig';
import { formatNumber, formatPercentage } from '../utils/colorUtils';
import { Activity, Skull, Heart, Syringe, TrendingUp, Zap, type LucideIcon } from 'lucide-react';

type StatCard = {
  label: string;
  value: string;
  icon: LucideIcon;
  prominence?: 'high' | 'normal';
};

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
  const stats: StatCard[] = [
    {
      label: 'Total Cases',
      value: formatNumber(globalStats.totalCases),
      icon: TrendingUp,
    },
    {
      label: 'Deaths',
      value: formatNumber(globalStats.totalDeaths),
      icon: Skull,
    },
    // Fatality Rate - shown for all pandemics
    {
      label: activePandemic === 'ebola' ? 'Case Fatality Rate' : 'Fatality Rate',
      value: `${globalStats.fatalityRate.toFixed(1)}%`,
      icon: Zap,
      prominence: activePandemic === 'ebola' ? 'high' : 'normal',
    },
  ];

  // Measles deaths cover far fewer countries than cases, so no fatality rate: show the reporting year
  if (activePandemic === 'measles') {
    const coverage = globalStats.deathsCoverage;
    stats[1].label = coverage ? `Recorded Deaths (${coverage})` : 'Deaths';
    if (!coverage) stats[1].value = 'N/A';
    stats.splice(2, 1, {
      label: 'Latest Reporting Year',
      value: String(globalStats.latestYear ?? 'N/A'),
      icon: Activity,
    });
    stats[0].label = `Reported Cases (latest year per country)`;
  }

  if (activePandemic === 'covid' && globalStats.totalRecovered && globalStats.totalRecovered > 0) {
    stats.push({
      label: 'Recovered',
      value: formatNumber(globalStats.totalRecovered),
      icon: Heart,
    });
  }

  if (activePandemic === 'covid' && globalStats.activeCases && globalStats.activeCases > 0) {
    stats.push({
      label: 'Active Cases',
      value: formatNumber(globalStats.activeCases),
      icon: Activity,
    });
  }

  if (activePandemic === 'westnile') {
    stats.push({
      label: 'Peak Year',
      value: '2012',
      icon: Activity,
    });
  }

  if (activePandemic === 'covid' && globalStats.vaccinationPercentage !== undefined) {
    stats.push({
      label: 'Fully Vaccinated',
      value: `${globalStats.vaccinationPercentage.toFixed(1)}%`,
      icon: Syringe,
    });
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <TrendingUp className="w-6 h-6" style={{ color: config.accentColor }} />
        {config.name} - Global Statistics
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const isHighProminence = stat.prominence === 'high';

          return (
            <div
              key={index}
              className={`border rounded-lg p-4 transition-all hover:scale-105 hover:shadow-lg ${
                isHighProminence ? 'ring-2 md:col-span-2 lg:col-span-1' : ''
              }`}
              style={{ backgroundColor: config.colorRamp.light, borderColor: config.accentColor }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-700 mb-2">
                    {stat.label}
                  </div>
                  <div className={`text-2xl font-bold text-slate-900 ${isHighProminence ? 'text-3xl' : ''}`}>
                    {stat.value}
                  </div>
                </div>
                <Icon className="w-10 h-10 shrink-0" style={{ color: config.colorRamp.dark }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-700">
        <p className="text-xs text-slate-400">
          {globalStats.isFallback ? 'Snapshot date' : 'Source checked'}:{' '}
          {globalStats.lastUpdated ? new Date(globalStats.lastUpdated).toLocaleString() : 'N/A'}
        </p>
      </div>
    </div>
  );
};
