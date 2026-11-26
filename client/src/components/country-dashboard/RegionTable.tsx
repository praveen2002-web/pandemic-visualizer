import React, { useEffect, useMemo, useState } from 'react';
import { formatNumber } from '@/utils/colorUtils';
import type { CountryHistory } from '@/types/pandemic';
import { regionValue } from './CountryMap';

const PAGE_SIZE = 15;
type SortKey = 'name' | 'cases' | 'rate';

interface Props {
  history: CountryHistory;
  year: number | undefined;
  selectedRegion: string | null;
  onSelectRegion: (name: string | null) => void;
}

const cell = 'px-3 py-2 text-right tabular-nums';
const figure = (value: number | undefined) =>
  value === undefined ? <>N/A</> : <span title={value.toLocaleString()}>{formatNumber(Math.round(value * 10) / 10)}</span>;

export const RegionTable: React.FC<Props> = ({ history, year, selectedRegion, onSelectRegion }) => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; ascending: boolean }>({ key: 'cases', ascending: false });
  const [page, setPage] = useState(0);
  const regions = year === undefined ? undefined : history.regions;
  const hasRate = !!regions?.some(r => r.population);

  const rows = useMemo(() => {
    const all = (regions ?? []).map(r => ({
      name: r.name,
      cases: regionValue(r, year!, 'cases'),
      rate: regionValue(r, year!, 'rate'),
    }));
    // rank is by cases, so it stays put when the table is searched or re-sorted
    all.sort((a, b) => (b.cases ?? -1) - (a.cases ?? -1));
    const ranked = all.map((r, i) => ({ ...r, rank: i + 1 }));
    const query = search.trim().toLowerCase();
    return ranked
      .filter(r => r.name.toLowerCase().includes(query))
      .sort((a, b) => {
        const order = sort.key === 'name' ? a.name.localeCompare(b.name) : (a[sort.key] ?? -1) - (b[sort.key] ?? -1);
        return sort.ascending ? order : -order;
      });
  }, [regions, year, search, sort]);

  // jump to the page holding a region picked on the map
  useEffect(() => {
    const index = rows.findIndex(r => r.name === selectedRegion);
    if (index >= 0) setPage(Math.floor(index / PAGE_SIZE));
  }, [selectedRegion]); // eslint-disable-line react-hooks/exhaustive-deps

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = rows.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  if (!regions) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-200">Year by year</h3>
        {history.annual.length === 0 ? (
          <p className="text-sm text-slate-400">No regional or yearly figures: this dataset only has totals.</p>
        ) : (
          <div className="max-h-[460px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-900 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left">Year</th>
                  <th className={cell}>Cases</th>
                  <th className={cell}>Deaths</th>
                </tr>
              </thead>
              <tbody>
                {[...history.annual].reverse().map(r => (
                  <tr key={r.year} className={`border-t border-slate-800 ${r.year === year ? 'bg-slate-800' : ''}`}>
                    <td className="px-3 py-2">{r.year}</td>
                    <td className={cell}>{figure(r.cases)}</td>
                    <td className={cell}>{figure(r.deaths)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-slate-500">{history.coverage}</p>
      </div>
    );
  }

  const header = (key: SortKey, label: string, align = 'justify-end') => (
    <th
      className="px-3 py-2"
      aria-sort={sort.key === key ? (sort.ascending ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        className={`flex w-full ${align} uppercase hover:text-white`}
        onClick={() => setSort(s => ({ key, ascending: s.key === key ? !s.ascending : key === 'name' }))}
      >
        {label} {sort.key === key ? (sort.ascending ? '▲' : '▼') : ''}
      </button>
    </th>
  );
  const select = (name: string) => onSelectRegion(selectedRegion === name ? null : name);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-200">Top regions, {year}</h3>
      <input
        type="search"
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(0); }}
        placeholder="Search regions…"
        aria-label="Search regions"
        className="mb-2 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white"
      />

      {visible.length === 0 && <p className="py-4 text-center text-sm text-slate-400">No region matches your search.</p>}

      {/* desktop table */}
      <table className="hidden w-full text-sm lg:table">
        <thead className="text-xs uppercase text-slate-400">
          <tr>
            <th className="px-3 py-2 text-left">Rank</th>
            {header('name', 'Region', 'justify-start')}
            <th className={cell}>Year</th>
            {header('cases', 'Cases')}
            {hasRate && header('rate', 'Per 100,000')}
          </tr>
        </thead>
        <tbody>
          {visible.map(r => (
            <tr
              key={r.name}
              tabIndex={0}
              aria-selected={selectedRegion === r.name}
              onClick={() => select(r.name)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(r.name); }
              }}
              className={`cursor-pointer border-t border-slate-800 hover:bg-slate-800/60 ${selectedRegion === r.name ? 'bg-slate-700' : ''}`}
            >
              <td className="px-3 py-1.5 text-slate-400">{r.rank}</td>
              <td className="px-3 py-1.5">{r.name}</td>
              <td className={cell}>{year}</td>
              <td className={cell}>{figure(r.cases)}</td>
              {hasRate && <td className={cell}>{figure(r.rate)}</td>}
            </tr>
          ))}
        </tbody>
      </table>

      {/* mobile list */}
      <ul className="divide-y divide-slate-800 text-sm lg:hidden">
        {visible.map(r => (
          <li key={r.name}>
            <button
              type="button"
              aria-pressed={selectedRegion === r.name}
              onClick={() => select(r.name)}
              className={`flex w-full justify-between gap-3 px-2 py-2 text-left ${selectedRegion === r.name ? 'bg-slate-700' : ''}`}
            >
              <span>{r.rank}. {r.name}</span>
              <span className="tabular-nums">
                {figure(r.cases)}
                {hasRate && r.rate !== undefined && <span className="text-slate-400"> · {r.rate.toFixed(1)}/100k</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
        <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} className="rounded border border-slate-700 px-2 py-1 disabled:opacity-40">
          Previous
        </button>
        <span>Page {current + 1} of {pages}</span>
        <button type="button" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="rounded border border-slate-700 px-2 py-1 disabled:opacity-40">
          Next
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">{history.coverage}</p>
    </div>
  );
};
