import React, { useState, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { selectActiveCountriesList, selectActivePandemic } from '@/store/pandemicSelectors';
import { setSelectedCountry } from '@/store/pandemicSlice';
import { formatNumber } from '../utils/colorUtils';
import { getPandemicConfig } from '@/config/pandemicConfig';
import {
  ArrowUpDown, ArrowUp, ArrowDown,
  Search, X, MapPin, TrendingUp,
} from 'lucide-react';
import type { PandemicCountryData } from '@/types/pandemic';

type SortKey = keyof PandemicCountryData | 'country';
type SortOrder = 'asc' | 'desc';

// ─── helpers ─────────────────────────────────────────────────────────────────

function severity(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(value / max, 1);
}

function severityColor(ratio: number, accentColor: string): string {
  // fade from slate-700 → accentColor
  return ratio > 0.66 ? accentColor
    : ratio > 0.33 ? accentColor + 'aa'
    : accentColor + '44';
}

// ─── sub-components ──────────────────────────────────────────────────────────

function SortIcon({ active, order }: { active: boolean; order: SortOrder }) {
  if (!active) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
  return order === 'asc'
    ? <ArrowUp className="w-3.5 h-3.5 text-white" />
    : <ArrowDown className="w-3.5 h-3.5 text-white" />;
}

interface ThProps {
  label: string;
  col: SortKey;
  activeKey: SortKey;
  order: SortOrder;
  onSort: (k: SortKey) => void;
  align?: 'left' | 'right';
  className?: string;
}
function Th({ label, col, activeKey, order, onSort, align = 'right', className = '' }: ThProps) {
  const isActive = activeKey === col;
  return (
    <th className={`py-3.5 px-4 text-xs font-semibold uppercase tracking-wider select-none ${className}`}>
      <button
        onClick={() => onSort(col)}
        className={`flex items-center gap-1.5 transition-colors w-full
          ${align === 'right' ? 'justify-end' : 'justify-start'}
          ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
      >
        {label}
        <SortIcon active={isActive} order={order} />
      </button>
    </th>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export const CountryList: React.FC = () => {
  const dispatch = useAppDispatch();
  const countries = useAppSelector(selectActiveCountriesList);
  const activePandemic = useAppSelector(selectActivePandemic);
  const config = getPandemicConfig(activePandemic);

  const [sortKey, setSortKey] = useState<SortKey>('cases');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  const hasFatalityRate = countries.some(c => c.fatalityRate !== undefined);
  const hasRecovered    = countries.some(c => c.recovered !== undefined && (c.recovered ?? 0) > 0);
  const hasActive       = countries.some(c => c.active !== undefined && (c.active ?? 0) > 0);

  const sortedCountries = useMemo(() => {
    let list = [...countries];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(c =>
        c.country.toLowerCase().includes(q) ||
        c.countryCode.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let aVal: any = (a as any)[sortKey] ?? -1;
      let bVal: any = (b as any)[sortKey] ?? -1;
      if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = String(bVal).toLowerCase(); }
      return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
    return list;
  }, [countries, sortKey, sortOrder, searchTerm]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const maxCases  = Math.max(...countries.map(c => c.cases  ?? 0), 1);
  const maxDeaths = Math.max(...countries.map(c => c.deaths ?? 0), 1);

  const accentColor = config.accentColor;

  return (
    <div className="flex flex-col h-full bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-700/60 overflow-hidden">

      {/* ── Header bar ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-700/60 bg-slate-900/80 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: accentColor + '22', border: `1px solid ${accentColor}44` }}
          >
            <MapPin className="w-4 h-4" style={{ color: accentColor }} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white leading-tight">{config.name} · Locations</h2>
            <p className="text-xs text-slate-400 leading-tight">
              {sortedCountries.length} of {countries.length} locations
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search locations…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm bg-slate-800/80 border border-slate-700 rounded-lg text-white placeholder-slate-500
                       focus:outline-none focus:border-slate-500 focus:bg-slate-800 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-900/95 backdrop-blur border-b border-slate-700/60">
              {/* Rank */}
              <th className="py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center w-12">#</th>

              <Th label="Location" col="country" activeKey={sortKey} order={sortOrder} onSort={handleSort} align="left" />
              <Th label="Cases" col="cases" activeKey={sortKey} order={sortOrder} onSort={handleSort} />
              <Th label="Deaths" col="deaths" activeKey={sortKey} order={sortOrder} onSort={handleSort} />

              {hasRecovered && (
                <Th label="Recovered" col="recovered" activeKey={sortKey} order={sortOrder} onSort={handleSort} />
              )}
              {hasActive && (
                <Th label="Active" col="active" activeKey={sortKey} order={sortOrder} onSort={handleSort} />
              )}
              {hasFatalityRate && (
                <Th label="Fatality %" col="fatalityRate" activeKey={sortKey} order={sortOrder} onSort={handleSort} />
              )}

              {/* Severity bar column — no sort */}
              <th className="py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-left w-32 hidden md:table-cell">
                Severity
              </th>
            </tr>
          </thead>

          <tbody>
            {sortedCountries.length === 0 ? (
              <tr>
                <td colSpan={99} className="py-16 text-center text-slate-500">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No locations match your search
                </td>
              </tr>
            ) : (
              sortedCountries.map((loc, idx) => {
                const caseRatio  = severity(loc.cases ?? 0, maxCases);
                const deathRatio = severity(loc.deaths ?? 0, maxDeaths);
                const overallRatio = Math.max(caseRatio, deathRatio);

                return (
                  <tr
                    key={loc.countryCode}
                    onClick={() => dispatch(setSelectedCountry(loc.countryCode))}
                    className="group border-b border-slate-800/60 cursor-pointer transition-all duration-150
                               hover:bg-slate-800/50 hover:border-slate-700/60"
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-xs font-mono text-slate-500 group-hover:text-slate-400 transition-colors">
                        {idx + 1}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {/* Colored dot */}
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0 transition-all"
                          style={{ backgroundColor: severityColor(overallRatio, accentColor) }}
                        />
                        <div>
                          <span className="font-medium text-white group-hover:text-slate-100 transition-colors">
                            {loc.country}
                          </span>
                          <span className="ml-2 text-xs text-slate-500 font-mono">{loc.countryCode}</span>
                        </div>
                      </div>
                    </td>

                    {/* Cases */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-semibold text-blue-300 tabular-nums">
                        {formatNumber(loc.cases ?? 0)}
                      </span>
                    </td>

                    {/* Deaths */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-semibold text-red-400 tabular-nums">
                        {formatNumber(loc.deaths ?? 0)}
                      </span>
                    </td>

                    {/* Recovered */}
                    {hasRecovered && (
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-semibold text-emerald-400 tabular-nums">
                          {loc.recovered !== undefined ? formatNumber(loc.recovered) : '—'}
                        </span>
                      </td>
                    )}

                    {/* Active */}
                    {hasActive && (
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-semibold text-amber-400 tabular-nums">
                          {loc.active !== undefined ? formatNumber(loc.active) : '—'}
                        </span>
                      </td>
                    )}

                    {/* Fatality rate */}
                    {hasFatalityRate && (
                      <td className="py-3.5 px-4 text-right">
                        {loc.fatalityRate !== undefined ? (
                          <span
                            className="inline-block px-2 py-0.5 rounded-full text-xs font-bold tabular-nums"
                            style={{
                              backgroundColor: loc.fatalityRate > 20
                                ? '#7f1d1d44' : loc.fatalityRate > 5
                                ? '#92400e44' : '#1e3a5f44',
                              color: loc.fatalityRate > 20
                                ? '#fca5a5' : loc.fatalityRate > 5
                                ? '#fcd34d' : '#93c5fd',
                            }}
                          >
                            {loc.fatalityRate.toFixed(1)}%
                          </span>
                        ) : '—'}
                      </td>
                    )}

                    {/* Severity bar */}
                    <td className="py-3.5 px-4 hidden md:table-cell">
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(overallRatio * 100, 2)}%`,
                            backgroundColor: accentColor,
                            opacity: 0.5 + overallRatio * 0.5,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-slate-700/60 bg-slate-900/80 flex-shrink-0">
        <p className="text-xs text-slate-500">
          Click a row to see detailed country statistics
        </p>
        <p className="text-xs text-slate-500 tabular-nums">
          {sortedCountries.length} location{sortedCountries.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
};
