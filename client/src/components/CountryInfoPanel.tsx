import React from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { selectSelectedCountryData } from '../store/selectors';
import { setSelectedCountry } from '../store/covidSlice';
import { formatNumber, formatPercentage } from '../utils/colorUtils';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { X, Flag } from 'lucide-react';

export const CountryInfoPanel: React.FC = () => {
  const dispatch = useAppDispatch();
  const country = useAppSelector(selectSelectedCountryData);

  if (!country) {
    return (
      <div className="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-lg p-6 h-full flex items-center justify-center">
        <p className="text-slate-400 text-center">Select a country on the globe to view details</p>
      </div>
    );
  }

  // Prepare chart data
  const trendData = country.dates.map((date, index) => ({
    date: date,
    cases: country.dailyCases[index] || 0,
    deaths: country.dailyDeaths[index] || 0,
  }));

  const handleClose = () => {
    dispatch(setSelectedCountry(null));
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-lg p-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {country.flag && (
            <img
              src={country.flag}
              alt={country.name}
              className="w-12 h-8 rounded object-cover"
            />
          )}
          <div>
            <h2 className="text-2xl font-bold text-white">{country.name}</h2>
            <p className="text-sm text-slate-400">{country.code}</p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-xs text-slate-400 mb-1">Total Cases</p>
          <p className="text-xl font-bold text-blue-400">{formatNumber(country.cases)}</p>
          <p className="text-xs text-slate-500 mt-1">{formatNumber(country.casesPerMillion)}/M</p>
        </div>

        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-xs text-slate-400 mb-1">Deaths</p>
          <p className="text-xl font-bold text-red-400">{formatNumber(country.deaths)}</p>
          <p className="text-xs text-slate-500 mt-1">{formatNumber(country.deathsPerMillion)}/M</p>
        </div>

        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <p className="text-xs text-slate-400 mb-1">Recovered</p>
          <p className="text-xl font-bold text-green-400">{formatNumber(country.recovered)}</p>
          <p className="text-xs text-slate-500 mt-1">
            {country.cases > 0 ? formatPercentage((country.recovered / country.cases) * 100) : '0%'}
          </p>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <p className="text-xs text-slate-400 mb-1">Active Cases</p>
          <p className="text-xl font-bold text-yellow-400">{formatNumber(country.active)}</p>
          <p className="text-xs text-slate-500 mt-1">
            {country.cases > 0 ? formatPercentage((country.active / country.cases) * 100) : '0%'}
          </p>
        </div>

        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
          <p className="text-xs text-slate-400 mb-1">Tests</p>
          <p className="text-xl font-bold text-purple-400">{formatNumber(country.tests)}</p>
          <p className="text-xs text-slate-500 mt-1">{formatNumber(country.testsPerMillion)}/M</p>
        </div>

        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
          <p className="text-xs text-slate-400 mb-1">Vaccination</p>
          <p className="text-xl font-bold text-cyan-400">{formatPercentage(country.vaccinationPercentage)}</p>
          <p className="text-xs text-slate-500 mt-1">Population: {formatNumber(country.population)}</p>
        </div>
      </div>

      {/* Charts */}
      {trendData.length > 0 && (
        <div className="space-y-6">
          {/* Daily Cases Chart */}
          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Daily Cases (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  interval={Math.floor(trendData.length / 5)}
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
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Daily Deaths (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  interval={Math.floor(trendData.length / 5)}
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
    </div>
  );
};
