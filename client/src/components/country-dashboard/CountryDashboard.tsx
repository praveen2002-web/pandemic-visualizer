import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  selectActiveCountries,
  selectActiveGlobalStats,
  selectActivePandemic,
  selectError,
  selectSelectedCountryCode,
} from '@/store/pandemicSelectors';
import { setSelectedCountry } from '@/store/pandemicSlice';
import { getPandemicConfig } from '@/config/pandemicConfig';
import { getCountryHistory } from '@/services/countryHistory';
import type { CountryHistory, PandemicType } from '@/types/pandemic';
import { closeCountry, useCountryUrl } from './countryUrl';
import { YearSlider } from './YearSlider';
import { KpiHeadline, numberChip, type Chip } from './KpiHeadline';
import { CountryMap, type MapMetric } from './CountryMap';
import { RegionTable } from './RegionTable';
import { TrendCharts } from './TrendCharts';

const FOCUSABLE = 'button:not([disabled]), a[href], input, select, [tabindex]:not([tabindex="-1"])';

function countryNameFor(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code; // not a valid region code
  }
}

export const CountryDashboard: React.FC = () => {
  const code = useAppSelector(selectSelectedCountryCode);
  const pandemic = useAppSelector(selectActivePandemic);
  useCountryUrl(code);
  // key resets year, region and playback for each country
  return code ? <Dashboard key={`${pandemic}:${code}`} code={code} pandemic={pandemic} /> : null;
};

function Dashboard({ code, pandemic }: { code: string; pandemic: PandemicType }) {
  const dispatch = useAppDispatch();
  const country = useAppSelector(selectActiveCountries)[code];
  const globalStats = useAppSelector(selectActiveGlobalStats);
  // if the tab's own data failed, don't wait for it forever: show the history with N/A totals
  const summaryFailed = !!useAppSelector(selectError);
  const config = getPandemicConfig(pandemic);
  const name = country?.country ?? countryNameFor(code);

  const [history, setHistory] = useState<CountryHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mapMetric, setMapMetric] = useState<MapMetric>('cases');
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    setHistory(null);
    getCountryHistory(pandemic, code, controller.signal)
      .then(result => !controller.signal.aborted && setHistory(result))
      .catch(e => {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Failed to load data');
      });
    return () => controller.abort();
  }, [pandemic, code, attempt]);

  // focus, scroll lock, Esc and focus trap
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeCountry(dispatch);
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter(el => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const inside = dialogRef.current.contains(document.activeElement);
      if (e.shiftKey && (!inside || document.activeElement === first)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus();
    };
  }, [dispatch]);

  const years = history?.years ?? [];
  const year = selectedYear ?? years[years.length - 1]; // default: latest year
  const hasRegions = !!history?.regions?.length;

  // all-time figures
  const sum = (field: 'cases' | 'deaths') => {
    const values = (history?.annual ?? []).map(r => r[field]).filter((v): v is number => v !== undefined);
    return values.length ? values.reduce((a, b) => a + b, 0) : undefined;
  };
  // measles country rows hold only the latest year of cases, so total the series instead
  const totalCases = pandemic === 'measles' ? sum('cases') : country?.cases;
  const totalDeaths = country?.deaths;
  const chips: Chip[] = [
    numberChip('All-time cases', totalCases),
    numberChip(pandemic === 'measles' ? 'All recorded deaths' : 'All-time deaths', totalDeaths),
  ];
  // zero means "not reported" in these sources
  if (country?.recovered) chips.push(numberChip('Recovered', country.recovered));
  if (pandemic === 'covid' && country?.vaccinationPercentage !== undefined) {
    chips.push({
      label: country.vaccinationType === 'partial' ? 'At least one dose' : 'Fully vaccinated',
      value: `${country.vaccinationPercentage.toFixed(1)}%`,
      title: 'Our World in Data',
    });
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="country-dashboard-title"
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-slate-950 text-white"
    >
      <header
        className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b-2 bg-slate-900 px-4 py-3"
        style={{ borderColor: config.accentColor }}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h2 id="country-dashboard-title" className="truncate text-2xl font-bold">{name}</h2>
          <span className="font-mono text-sm text-slate-400">{code}</span>
          <span className="rounded-full px-3 py-1 text-xs font-semibold text-slate-950" style={{ backgroundColor: config.colorRamp.light }}>
            {config.name}
          </span>
        </div>
        <button ref={closeRef} type="button" onClick={() => closeCountry(dispatch)} aria-label="Close" className="rounded-lg p-2 text-slate-300 hover:bg-slate-700 hover:text-white">
          <X className="h-6 w-6" />
        </button>
      </header>

      <div className="container mx-auto space-y-4 px-4 py-4">
        {error ? (
          <div role="alert" className="rounded-lg border border-red-800 bg-red-950/40 p-6 text-center">
            <p className="mb-3 text-red-200">{error}</p>
            <button type="button" onClick={() => setAttempt(a => a + 1)} className="rounded-md border border-red-700 px-4 py-2 hover:bg-red-900/50">
              Retry
            </button>
          </div>
        ) : !history || (!globalStats && !summaryFailed) ? (
          <div aria-busy="true" aria-label="Loading country data" className="space-y-4">
            {[40, 120, 64].map((h, i) => (
              <div key={i} className="animate-pulse rounded-lg bg-slate-800/60" style={{ height: h * 3 }} />
            ))}
          </div>
        ) : (
          <>
            <div className={`grid gap-4 ${years.length ? 'lg:grid-cols-2' : ''}`}>
              {years.length > 0 && (
                <YearSlider
                  years={years}
                  year={year}
                  accentColor={config.accentColor}
                  isPlaying={isPlaying}
                  reducedMotion={reducedMotion}
                  onChange={setSelectedYear}
                  onPlayingChange={setIsPlaying}
                />
              )}
              <KpiHeadline history={history} year={year} totalCases={totalCases} totalDeaths={totalDeaths} chips={chips} />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <CountryMap
                  iso2={code}
                  countryName={name}
                  regions={history.regions}
                  year={year}
                  ramp={config.colorRamp}
                  coverage={history.coverage}
                  metric={mapMetric}
                  onMetricChange={setMapMetric}
                  selectedRegion={hasRegions ? selectedRegion : null}
                  onSelectRegion={setSelectedRegion}
                />
              </div>
              <div className="lg:col-span-2">
                <RegionTable history={history} year={year} selectedRegion={selectedRegion} onSelectRegion={setSelectedRegion} />
              </div>
            </div>

            <TrendCharts history={history} year={year} accentColor={config.accentColor} reducedMotion={reducedMotion} />
          </>
        )}
      </div>
    </div>
  );
}
