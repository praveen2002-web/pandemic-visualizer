import React from 'react';
import { formatNumber } from '@/utils/colorUtils';
import type { CountryHistory } from '@/types/pandemic';

export interface Chip {
  label: string;
  value: string;
  title?: string; // full figure
}

export const numberChip = (label: string, value: number | undefined): Chip => ({
  label,
  value: value === undefined ? 'N/A' : formatNumber(value),
  title: value?.toLocaleString(),
});

interface Props {
  history: CountryHistory;
  year: number | undefined;
  totalCases: number | undefined;
  totalDeaths: number | undefined;
  chips: Chip[];
}

export const KpiHeadline: React.FC<Props> = ({ history, year, totalCases, totalDeaths, chips }) => {
  const row = history.annual.find(r => r.year === year);
  // without a yearly series the headline shows the dataset's totals
  const cases = year === undefined ? totalCases : row?.cases;
  const deaths = year === undefined ? totalDeaths : row?.deaths;
  const fatality = cases && deaths !== undefined ? `${((deaths / cases) * 100).toFixed(1)}%` : 'N/A';

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
      <p className="text-sm text-slate-400">{year === undefined ? 'Reported cases (all time)' : `Reported cases in ${year}`}</p>
      <p className="text-5xl font-bold tabular-nums text-white" title={cases?.toLocaleString()}>
        {cases === undefined ? 'N/A' : formatNumber(cases)}
      </p>
      <p className="mt-1 text-sm text-slate-300">
        Deaths: <span title={deaths?.toLocaleString()}>{deaths === undefined ? 'N/A' : formatNumber(deaths)}</span>
        {' · '}Fatality rate: {fatality}
      </p>

      <ul className="mt-4 flex flex-wrap gap-2">
        {chips.map(chip => (
          <li key={chip.label} title={chip.title} className="rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2">
            <span className="block text-xs text-slate-400">{chip.label}</span>
            <span className="text-lg font-semibold tabular-nums text-white">{chip.value}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-slate-500">
        Source:{' '}
        <a href={history.source.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-300">
          {history.source.name}
        </a>
        . {history.coverage}. {history.caveats.join(' ')}
      </p>
    </div>
  );
};
