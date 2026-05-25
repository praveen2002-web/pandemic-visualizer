import React from 'react';
import { getColorScaleEndpoints, getMetricLabel, MetricType, NormalizationType, getPandemicConfig } from '@/config/pandemicConfig';
import { ChevronDown, Info } from 'lucide-react';
import type { PandemicType } from '@/types/pandemic';

interface GlobeLegendProps {
  metric: MetricType;
  normalization: NormalizationType;
  onMetricChange: (metric: MetricType) => void;
  onNormalizationChange: (normalization: NormalizationType) => void;
  minValue: number;
  maxValue: number;
  pandemic: PandemicType;
}

export const GlobeLegend: React.FC<GlobeLegendProps> = ({
  metric,
  normalization,
  onMetricChange,
  onNormalizationChange,
  minValue,
  maxValue,
  pandemic,
}) => {
  const config = getPandemicConfig(pandemic);
  const { dark, light } = getColorScaleEndpoints(pandemic);
  const metrics = config.availableMetrics;

  return (
    <div className="bg-slate-900/80 backdrop-blur border border-slate-700 rounded-lg p-4 shadow-xl">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <Info className="w-4 h-4" style={{ color: config.accentColor }} />
          Color Scale Legend
        </h3>
      </div>

      {/* Color Scale Visualization */}
      <div className="mb-4">
        <div className="flex items-center gap-3">
          {/* Dark (Low) */}
          <div className="text-center">
            <div
              className="w-8 h-8 rounded border border-slate-600 shadow-lg"
              style={{ backgroundColor: dark }}
            />
            <p className="text-xs text-slate-400 mt-1 whitespace-nowrap">Low</p>
          </div>

          {/* Gradient Bar */}
          <div className="flex-1">
            <div
              className="h-6 rounded border border-slate-600 shadow-lg"
              style={{
                background: `linear-gradient(to right, ${dark}, ${light})`,
              }}
            />
          </div>

          {/* Light (High) */}
          <div className="text-center">
            <div
              className="w-8 h-8 rounded border border-slate-600 shadow-lg"
              style={{ backgroundColor: light }}
            />
            <p className="text-xs text-slate-400 mt-1 whitespace-nowrap">High</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2 text-center">
          Darker = Lower severity | Lighter = Higher severity
        </p>
      </div>

      {/* Metric Selector */}
      <div className="mb-4">
        <label className="text-xs font-medium text-slate-300 block mb-2">Metric</label>
        <div className="relative">
          <select
            value={metric}
            onChange={(e) => onMetricChange(e.target.value as MetricType)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm appearance-none cursor-pointer hover:border-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
          >
            {metrics.map((m) => (
              <option key={m} value={m}>
                {getMetricLabel(m)}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>
      </div>

      {/* Normalization Toggle */}
      <div className="mb-4">
        <label className="text-xs font-medium text-slate-300 block mb-2">Scale</label>
        <div className="flex gap-2">
          <button
            onClick={() => onNormalizationChange('linear')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              normalization === 'linear'
                ? 'text-white shadow-lg'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
            style={
              normalization === 'linear'
                ? { backgroundColor: config.accentColor }
                : undefined
            }
          >
            Linear
          </button>
          <button
            onClick={() => onNormalizationChange('log')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              normalization === 'log'
                ? 'text-white shadow-lg'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
            style={
              normalization === 'log'
                ? { backgroundColor: config.accentColor }
                : undefined
            }
          >
            Logarithmic
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {normalization === 'log'
            ? 'Logarithmic scale handles outliers better'
            : 'Linear scale shows absolute differences'}
        </p>
      </div>

      {/* Value Range Info */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-slate-400">Min Value</p>
            <p className="text-slate-200 font-semibold">{minValue.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-slate-400">Max Value</p>
            <p className="text-slate-200 font-semibold">{maxValue.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg">
        <p className="text-xs text-blue-200">
          💡 <strong>Tip:</strong> Click on any location to see detailed statistics. The globe auto-rotates and responds to your interactions.
        </p>
      </div>
    </div>
  );
};


