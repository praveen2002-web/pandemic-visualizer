import React, { useEffect, useMemo, useRef, useState } from 'react';
import { geoArea, geoCentroid, geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { formatNumber } from '@/utils/colorUtils';
import { matchRegions } from '@/services/countryHistory';
import type { CountryHistory } from '@/types/pandemic';

const WIDTH = 800;
const HEIGHT = 500;
const NO_DATA = '#475569';

export type MapMetric = 'cases' | 'rate';
type Region = NonNullable<CountryHistory['regions']>[number];

export function regionValue(region: Region, year: number, metric: MapMetric): number | undefined {
  const cases = region.byYear[year]?.cases;
  if (cases === undefined) return undefined;
  if (metric === 'cases') return cases;
  return region.population ? (cases / region.population) * 100000 : undefined;
}

// ─── shapes ─────────────────────────────────────────────────────────────────
const shapeCache = new Map<string, Promise<any[]>>();

/** d3-geo wants clockwise exterior rings; a polygon wound the other way covers the whole globe. */
function rewind(f: any): any {
  const { type, coordinates } = f.geometry;
  const fix = (rings: number[][][]) =>
    geoArea({ type: 'Polygon', coordinates: rings }) > 2 * Math.PI ? rings.map(r => [...r].reverse()) : rings;
  return {
    ...f,
    geometry: { type, coordinates: type === 'Polygon' ? fix(coordinates) : coordinates.map(fix) },
  };
}

async function fetchJson(url: string): Promise<any | null> {
  const response = await fetch(url);
  if (!response.ok) return null;
  // a dev server may answer a missing file with index.html
  return response.json().catch(() => null);
}

/** Admin-1 regions when wanted and built, otherwise the country outline. */
function loadShapes(iso2: string, wantRegions: boolean): Promise<any[]> {
  const key = `${iso2}:${wantRegions}`;
  let request = shapeCache.get(key);
  if (!request) {
    request = (async () => {
      if (wantRegions) {
        const topology = await fetchJson(`/admin1/${iso2}.json`);
        const object = topology?.objects && Object.values(topology.objects)[0];
        if (object) {
          return (feature(topology, object as any) as any).features.filter((f: any) => f.geometry).map(rewind);
        }
      }
      const world = await fetchJson('/ne_110m_admin_0_countries.geojson');
      if (!world) throw new Error('Country shapes failed to load');
      return world.features
        .filter((f: any) => {
          const p = f.properties ?? {};
          return [p.ISO_A2_EH, p.ISO_A2].includes(iso2);
        })
        .map((f: any) => rewind({ ...f, properties: { outline: true } }));
    })().catch(error => {
      shapeCache.delete(key);
      throw error;
    });
    shapeCache.set(key, request);
  }
  return request;
}


// ─── colours ────────────────────────────────────────────────────────────────
function mix(a: string, b: string, t: number): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `rgb(${[0, 1, 2].map(i => Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * t)).join(', ')})`;
}

interface Props {
  iso2: string;
  countryName: string;
  regions: Region[] | undefined;
  year: number | undefined;
  ramp: { dark: string; light: string };
  coverage: string;
  metric: MapMetric;
  onMetricChange: (metric: MapMetric) => void;
  selectedRegion: string | null;
  onSelectRegion: (name: string | null) => void;
}

export const CountryMap: React.FC<Props> = ({
  iso2, countryName, regions, year, ramp, coverage, metric, onMetricChange, selectedRegion, onSelectRegion,
}) => {
  const [shapes, setShapes] = useState<any[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const dragged = useRef(false);

  const hasRegions = !!regions?.length && year !== undefined;
  const hasRate = !!regions?.some(r => r.population);
  const activeMetric: MapMetric = hasRate ? metric : 'cases';

  useEffect(() => {
    let stale = false;
    setShapes(null);
    setFailed(false);
    setView({ scale: 1, x: 0, y: 0 });
    loadShapes(iso2, hasRegions)
      .then(s => !stale && setShapes(s))
      .catch(() => !stale && setFailed(true));
    return () => { stale = true; };
  }, [iso2, hasRegions]);

  const paths = useMemo(() => {
    if (!shapes?.length) return [];
    const collection: any = { type: 'FeatureCollection', features: shapes };
    // rotating to the centroid keeps countries that cross the antimeridian in one piece
    const projection = geoMercator()
      .rotate([-geoCentroid(collection)[0], 0])
      .fitSize([WIDTH, HEIGHT], collection);
    const path = geoPath(projection);
    return shapes.map(shape => ({ d: path(shape) ?? '', properties: shape.properties }));
  }, [shapes]);

  const matched = useMemo(
    () =>
      matchRegions(
        hasRegions ? regions! : [],
        paths.map(p => ({ name: p.properties.name, alternates: [p.properties.name_alt, p.properties.name_en] }))
      ),
    [paths, regions, hasRegions]
  );

  const isOutline = !!shapes?.[0]?.properties?.outline;

  useEffect(() => {
    if (!import.meta.env.DEV || !hasRegions || !shapes || isOutline) return;
    const unmatched = regions!.filter(r => !matched.includes(r)).map(r => r.name);
    if (unmatched.length) console.warn(`[CountryMap] ${iso2} regions without a map shape:`, unmatched);
  }, [matched, regions, shapes, hasRegions, isOutline, iso2]);

  // five quantile bins: case counts are too skewed for equal-width bins
  const thresholds = useMemo(() => {
    if (!hasRegions) return [];
    const values = regions!
      .map(r => regionValue(r, year!, activeMetric))
      .filter((v): v is number => v !== undefined)
      .sort((a, b) => a - b);
    return values.length ? [0, 1, 2, 3, 4].map(i => values[Math.floor((i * values.length) / 5)]) : [];
  }, [regions, year, activeMetric, hasRegions]);

  const binColor = (bin: number) => mix(ramp.dark, ramp.light, bin / 4);
  const colorFor = (value: number) => binColor(thresholds.reduce((bin, t, i) => (value >= t ? i : bin), 0));

  const describe = (region: Region | undefined, fallback: string) => {
    if (!hasRegions) return countryName;
    const value = region && regionValue(region, year!, activeMetric);
    if (value === undefined) return `${region?.name ?? fallback}: no data`;
    const unit = activeMetric === 'rate' ? 'per 100,000' : 'cases';
    return `${region!.name}: ${Math.round(value * 10) / 10 === value ? value.toLocaleString() : value.toFixed(1)} ${unit} (${year})`;
  };

  const zoom = (factor: number) =>
    setView(v => ({ ...v, scale: Math.min(8, Math.max(1, v.scale * factor)) }));

  const note = !hasRegions
    ? 'Regional breakdown not available in this dataset'
    : isOutline
      ? 'Region shapes are not available for this country. See the table for regional figures.'
      : null;

  const buttonClass = 'rounded-md border border-slate-600 bg-slate-900/80 p-1.5 text-slate-200 hover:bg-slate-800';

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-200">
          Map{hasRegions ? `: ${activeMetric === 'rate' ? 'cases per 100,000' : 'cases'} in ${year}` : ''}
        </h3>
        {hasRegions && hasRate && (
          <div className="flex gap-1 text-xs" role="group" aria-label="Map metric">
            {(['cases', 'rate'] as const).map(m => (
              <button
                key={m}
                type="button"
                aria-pressed={activeMetric === m}
                onClick={() => onMetricChange(m)}
                className={`rounded-md px-2 py-1 ${activeMetric === m ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                {m === 'cases' ? 'Cases' : 'Per 100,000'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative h-[50vh] lg:h-[460px]">
        {failed ? (
          <p className="flex h-full items-center justify-center text-slate-400">The map could not be loaded.</p>
        ) : !shapes ? (
          <div className="h-full animate-pulse rounded bg-slate-800/60" />
        ) : !paths.length ? (
          <p className="flex h-full items-center justify-center text-slate-400">No outline is available for this country.</p>
        ) : (
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="h-full w-full cursor-grab touch-none select-none"
            role="group"
            aria-label={`Map of ${countryName}`}
            onPointerDown={e => {
              drag.current = { x: e.clientX, y: e.clientY, moved: false };
              dragged.current = false;
            }}
            onPointerMove={e => {
              const start = drag.current;
              if (!start || !e.buttons) return;
              const dx = e.clientX - start.x;
              const dy = e.clientY - start.y;
              if (!start.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
              const ratio = WIDTH / e.currentTarget.clientWidth;
              drag.current = { x: e.clientX, y: e.clientY, moved: true };
              dragged.current = true;
              setView(v => ({ ...v, x: v.x + dx * ratio, y: v.y + dy * ratio }));
            }}
            onPointerUp={() => { drag.current = null; }}
            onPointerLeave={() => { drag.current = null; setHover(null); }}
          >
            <g transform={`translate(${WIDTH / 2 + view.x} ${HEIGHT / 2 + view.y}) scale(${view.scale}) translate(${-WIDTH / 2} ${-HEIGHT / 2})`}>
              {paths.map((p, i) => {
                const region = matched[i];
                const value = region && regionValue(region, year!, activeMetric);
                const selected = !!region && region.name === selectedRegion;
                const label = describe(region, p.properties.name ?? countryName);
                return (
                  <path
                    key={i}
                    d={p.d}
                    fill={!hasRegions ? ramp.dark : value === undefined ? NO_DATA : colorFor(value)}
                    stroke={selected ? '#ffffff' : '#0f172a'}
                    strokeWidth={selected ? 2.5 : 0.5}
                    vectorEffect="non-scaling-stroke"
                    aria-label={label}
                    role={region ? 'button' : 'img'}
                    onMouseMove={e => {
                      const box = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
                      setHover({ x: e.clientX - box.left, y: e.clientY - box.top, text: label });
                    }}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => !dragged.current && region && onSelectRegion(selected ? null : region.name)}
                  />
                );
              })}
            </g>
          </svg>
        )}
        {hover && (
          <div
            className="pointer-events-none absolute z-10 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs text-white"
            style={{ left: hover.x + 12, top: hover.y + 12 }}
          >
            {hover.text}
          </div>
        )}
        <div className="absolute right-2 top-2 flex flex-col gap-1">
          <button type="button" className={buttonClass} aria-label="Zoom in" onClick={() => zoom(1.5)}><Plus className="h-4 w-4" /></button>
          <button type="button" className={buttonClass} aria-label="Zoom out" onClick={() => zoom(1 / 1.5)}><Minus className="h-4 w-4" /></button>
          <button type="button" className={buttonClass} aria-label="Reset zoom" onClick={() => setView({ scale: 1, x: 0, y: 0 })}><RotateCcw className="h-4 w-4" /></button>
        </div>
      </div>

      {hasRegions && !isOutline && thresholds.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400" aria-label="Legend">
          {thresholds.map((from, i) => (
            <li key={i} className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: binColor(i) }} />
              {formatNumber(Math.round(from))}
              {i < 4 ? `–${formatNumber(Math.round(thresholds[i + 1]))}` : '+'}
            </li>
          ))}
          <li className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: NO_DATA }} />
            No data
          </li>
        </ul>
      )}
      {note && <p className="mt-2 text-sm text-slate-400">{note}</p>}
      <p className="mt-2 text-xs text-slate-500">Figures: {coverage}. Boundaries: Natural Earth.</p>
    </div>
  );
};
