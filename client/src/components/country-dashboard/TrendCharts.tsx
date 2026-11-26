import React from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { formatNumber } from '@/utils/colorUtils';
import type { CountryHistory } from '@/types/pandemic';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TICK = { fontSize: 12, fill: '#94a3b8' };
const TOOLTIP = {
  contentStyle: { backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: 8 },
  labelStyle: { color: '#e2e8f0' },
  formatter: (value: number) => value.toLocaleString(),
};

function Card({ title, note, children }: { title: string; note: string; children: React.ReactElement }) {
  return (
    <figure className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
      <h4 className="mb-3 text-sm font-semibold text-slate-200">{title}</h4>
      <ResponsiveContainer width="100%" height={240}>{children}</ResponsiveContainer>
      <figcaption className="mt-2 text-xs text-slate-500">{note}</figcaption>
    </figure>
  );
}

interface Props {
  history: CountryHistory;
  year: number | undefined;
  accentColor: string;
  reducedMotion: boolean;
}

export const TrendCharts: React.FC<Props> = ({ history, year, accentColor, reducedMotion }) => {
  const animate = !reducedMotion;
  const monthly = year === undefined ? undefined : history.monthly?.[year];
  let running = 0;
  const cumulative = history.annual.map(r => ({ year: r.year, cases: (running += r.cases) }));
  const hasDeaths = history.annual.some(r => r.deaths !== undefined);

  return (
    <section aria-labelledby="trends-heading">
      <h3 id="trends-heading" className="mb-3 text-lg font-semibold text-white">Key Historical Trends</h3>
      {history.annual.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-700 p-6 text-center text-slate-400">
          This dataset has no time series
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {monthly && (
            <Card title={`Cases by month, ${year}`} note={history.coverage}>
              <BarChart data={monthly.map(m => ({ ...m, name: MONTHS[m.month - 1] }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" tick={TICK} />
                <YAxis tick={TICK} tickFormatter={formatNumber} />
                <Tooltip {...TOOLTIP} />
                <Bar dataKey="cases" name="Cases" fill={accentColor} isAnimationActive={animate} />
              </BarChart>
            </Card>
          )}
          <Card title={hasDeaths ? 'Annual cases and deaths' : 'Annual cases'} note={history.coverage}>
            <LineChart data={history.annual}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="year" tick={TICK} />
              <YAxis yAxisId="cases" tick={TICK} tickFormatter={formatNumber} />
              {/* deaths get their own axis: they are orders of magnitude smaller */}
              {hasDeaths && <YAxis yAxisId="deaths" orientation="right" tick={TICK} tickFormatter={formatNumber} />}
              <Tooltip {...TOOLTIP} />
              <Legend />
              {year !== undefined && <ReferenceLine yAxisId="cases" x={year} stroke="#e2e8f0" strokeDasharray="4 4" />}
              <Line yAxisId="cases" dataKey="cases" name="Cases" stroke={accentColor} isAnimationActive={animate} />
              {hasDeaths && (
                <Line yAxisId="deaths" dataKey="deaths" name="Deaths (right axis)" stroke="#f8fafc" isAnimationActive={animate} />
              )}
            </LineChart>
          </Card>
          <Card title="Cumulative cases over time" note={`Running total of reported years only. ${history.coverage}`}>
            <AreaChart data={cumulative}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="year" tick={TICK} />
              <YAxis tick={TICK} tickFormatter={formatNumber} />
              <Tooltip {...TOOLTIP} />
              <Area dataKey="cases" name="Cumulative cases" stroke={accentColor} fill={accentColor} fillOpacity={0.3} isAnimationActive={animate} />
            </AreaChart>
          </Card>
        </div>
      )}
    </section>
  );
};
