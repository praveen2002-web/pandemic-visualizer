import React, { useEffect, useRef, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  selectActiveCountries,
  selectSelectedCountryCode,
} from '@/store/pandemicSelectors';
import { setSelectedCountry } from '@/store/pandemicSlice';
import {
  getColorScaleEndpoints,
  getMetricLabel,
  MetricType,
  NormalizationType,
} from '@/config/pandemicConfig';
import type { PandemicCountryData, PandemicType } from '@/types/pandemic';

type CountryMetrics = Record<string, number>;

export interface GlobeViewProps {
  metric?: MetricType;
  normalization?: NormalizationType;
  pandemic: PandemicType;
  onMetricRangeChange?: (min: number, max: number) => void;
}

/**
 * Get the metric value from country data based on metric type
 */
function getMetricValue(
  country: PandemicCountryData,
  metric: MetricType
): number {
  if (!country) return 0;
  
  switch (metric) {
    case 'cases':
      return country.cases ?? 0;
    case 'deaths':
      return country.deaths ?? 0;
    case 'recovered':
      return country.recovered ?? 0;
    case 'active':
      return country.active ?? 0;
    case 'casesPerMillion':
      return country.casesPerMillion ?? 0;
    case 'deathsPerMillion':
      return country.deathsPerMillion ?? 0;
    case 'vaccinationPercentage':
      return country.vaccinationPercentage ?? 0;
    case 'fatalityRate':
      return country.fatalityRate ?? 0;
    case 'testsPerMillion':
      return country.testsPerMillion ?? 0;
    default:
      return 0;
  }
}

/**
 * Normalize value using linear or logarithmic scale
 */
function normalizeValue(
  value: number,
  min: number,
  max: number,
  normalization: NormalizationType
): number {
  if (max === min) return 0.5;
  
  if (normalization === 'log') {
    const logMin = Math.log(Math.max(min, 0.1));
    const logMax = Math.log(Math.max(max, 1));
    const logValue = Math.log(Math.max(value, 0.1));
    return Math.max(0, Math.min(1, (logValue - logMin) / (logMax - logMin)));
  }
  
  // Linear
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Get RGB color between two endpoints
 */
function interpolateColor(
  normalized: number,
  darkRgb: [number, number, number],
  lightRgb: [number, number, number]
): string {
  const r = Math.round(darkRgb[0] + (lightRgb[0] - darkRgb[0]) * normalized);
  const g = Math.round(darkRgb[1] + (lightRgb[1] - darkRgb[1]) * normalized);
  const b = Math.round(darkRgb[2] + (lightRgb[2] - darkRgb[2]) * normalized);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Parse hex color to RGB
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return value.replace(/[&<>"']/g, character => entities[character]);
}

export const GlobeView: React.FC<GlobeViewProps> = ({
  metric = 'cases',
  normalization = 'log',
  pandemic,
  onMetricRangeChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const dispatch = useAppDispatch();

  const countries = useAppSelector(selectActiveCountries);
  const selectedCountry = useAppSelector(selectSelectedCountryCode);

  const countriesRef = useRef(countries);
  const selectedCountryRef = useRef(selectedCountry);
  const pandemicRef = useRef(pandemic);
  const metricRef = useRef(metric);
  const minMetricRef = useRef(0);
  const maxMetricRef = useRef(1);
  const normalizationRef = useRef(normalization);
  const colorsRef = useRef({
    dark: [0, 0, 0] as [number, number, number],
    light: [255, 255, 255] as [number, number, number],
  });
  const geoNameMapRef = useRef<Record<string, string>>({});

  const [metrics, setMetrics] = useState<CountryMetrics>({});
  const [minMetric, setMinMetric] = useState(0);
  const [maxMetric, setMaxMetric] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const geoJsonUrl = '/ne_110m_admin_0_countries.geojson';
  const { dark, light } = getColorScaleEndpoints(pandemic);
  const darkRgb = hexToRgb(dark);
  const lightRgb = hexToRgb(light);

  countriesRef.current = countries;
  selectedCountryRef.current = selectedCountry;
  pandemicRef.current = pandemic;
  metricRef.current = metric;
  minMetricRef.current = minMetric;
  maxMetricRef.current = maxMetric;
  normalizationRef.current = normalization;
  colorsRef.current = { dark: darkRgb, light: lightRgb };

  const buildLabelFn = () => (d: any) => {
    const code = d.properties?.code;
    const currentCountries = countriesRef.current;
    const currentMetric = metricRef.current;
    const country = currentCountries[code];
    // Multi-source name resolution: API data > GeoJSON map > raw GeoJSON properties > code
    const countryName =
      country?.country ||
      geoNameMapRef.current[code] ||
      d.properties?.NAME ||
      d.properties?.ADMIN ||
      d.properties?.name_long ||
      d.properties?.name ||
      code ||
      '';
    const safeCountryName = escapeHtml(String(countryName));
    if (!country) {
      return `<div class="globe-tooltip"><div class="globe-tooltip-name">${safeCountryName}</div></div>`;
    }
    const value = getMetricValue(country, currentMetric);
    const metricValue = currentMetric === 'deaths' && country.deaths === undefined
      ? 'N/A'
      : ['fatalityRate', 'vaccinationPercentage'].includes(currentMetric)
      ? `${value.toFixed(1)}%`
      : value.toLocaleString();
    return `<div class="globe-tooltip">
      <div class="globe-tooltip-name">${safeCountryName}</div>
      <div>${escapeHtml(getMetricLabel(currentMetric))}: ${escapeHtml(metricValue)}</div>
      <div>Deaths: ${escapeHtml(country.deaths?.toLocaleString() ?? 'N/A')}</div>
    </div>`;
  };

  // Calculate metrics for all countries
  useEffect(() => {
    const newMetrics: CountryMetrics = {};
    let min = Infinity;
    let max = -Infinity;

    Object.entries(countries).forEach(([code, country]) => {
      const value = getMetricValue(country, metric);
      newMetrics[code] = value;

      if (value > 0) {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    });

    setMetrics(newMetrics);
    setMinMetric(min === Infinity ? 0 : min);
    setMaxMetric(max === -Infinity ? 1 : max);
    onMetricRangeChange?.(min === Infinity ? 0 : min, max === -Infinity ? 1 : max);

    // Re-apply label so it picks up fresh country data
    if (globeRef.current) {
      globeRef.current.polygonLabel(buildLabelFn());
    }
  }, [countries, metric, onMetricRangeChange]);

  // Initialize one globe instance for this mount; data updates only affect its layers.
  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    let globe: any;
    let handleResize: (() => void) | undefined;

    const initGlobe = async () => {
      try {
        setError(null);

        const [Globe, response] = await Promise.all([
          import('globe.gl'),
          fetch(geoJsonUrl, { headers: { Accept: 'application/json' } }),
        ]);

        if (!response.ok) {
          throw new Error(`Failed to fetch GeoJSON: ${response.statusText}`);
        }

        const geoData = await response.json();
        if (cancelled || !containerRef.current) return;

        globe = new Globe.default(containerRef.current);
        globeRef.current = globe;

        globe
          .globeImageUrl(
            '//unpkg.com/three-globe@2.45.0/example/img/earth-night.jpg'
          )
          .bumpImageUrl(
            '//unpkg.com/three-globe@2.45.0/example/img/earth-topology.png'
          )
          .backgroundImageUrl(
            '//unpkg.com/three-globe@2.45.0/example/img/night-sky.png'
          )
          .width(containerRef.current.clientWidth)
          .height(containerRef.current.clientHeight);

        const features = (geoData.features || []).map((feature: any) => {
          const props = feature.properties || {};
          const code = [props.ISO_A2_EH, props.ISO_A2, props.iso_a2]
            .find(value => typeof value === 'string' && value && value !== '-99')
            ?.toUpperCase() || props.ADM0_A3 || 'XX';
          const resolvedName = props.NAME || props.ADMIN || props.name_long || props.name || props.SOVEREIGNT || '';
          return {
            ...feature,
            properties: {
              ...props,
              code,
              name: resolvedName,
            },
          };
        });

        const nameMap: Record<string, string> = {};
        for (const f of features) {
          if (f.properties.code && f.properties.name) {
            nameMap[f.properties.code] = f.properties.name;
          }
        }
        geoNameMapRef.current = nameMap;

        globe.polygonsData(features);
        globe.polygonCapColor((d: any) => {
          const code = d.properties?.code;
          const country = countriesRef.current[code];
          // Measles deaths exist for few countries: grey out the rest instead of colouring them as 0
          if (pandemicRef.current === 'measles' && metricRef.current === 'deaths' && country?.deaths === undefined) {
            return 'rgb(71, 85, 105)';
          }
          const value = country ? getMetricValue(country, metricRef.current) : 0;
          const normalized = normalizeValue(
            value,
            minMetricRef.current,
            maxMetricRef.current,
            normalizationRef.current
          );
          return interpolateColor(normalized, colorsRef.current.dark, colorsRef.current.light);
        });

        globe.polygonSideColor(() => 'rgba(0, 0, 0, 0.3)');
        globe.polygonStrokeColor(() => 'rgba(255, 255, 255, 0.1)');

        globe.polygonAltitude((d: any) => {
          return d.properties?.code === selectedCountryRef.current ? 0.12 : 0.01;
        });

        globe.polygonLabel(buildLabelFn());

        globe.onPolygonClick((d: any) => {
          const code = d.properties?.code;
          if (code) {
            dispatch(setSelectedCountry(code));
            const centroid = getPolygonCentroid(d.geometry);
            globe.pointOfView(
              { lat: centroid[1], lng: centroid[0], altitude: 2.5 },
              1000
            );
          }
        });

        try {
          const controls = globe.controls();
          if (controls) {
            controls.autoRotate = !selectedCountryRef.current;
            controls.autoRotateSpeed = 0.5;
          }
        } catch (e) {
          console.warn('Auto-rotate setup failed:', e);
        }

        handleResize = () => {
          if (containerRef.current && globeRef.current === globe) {
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;
            if (width > 0 && height > 0) {
              globe.width(width).height(height);
            }
          }
        };

        window.addEventListener('resize', handleResize);
      } catch (err) {
        if (cancelled) return;
        if (globe) {
          try {
            globe._destructor?.();
          } catch (cleanupError) {
            console.warn('Globe cleanup failed:', cleanupError);
          }
          if (globeRef.current === globe) globeRef.current = null;
        }
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('Globe initialization error:', errorMsg);
        setError(`Failed to load globe: ${errorMsg}`);
      }
    };

    void initGlobe();

    return () => {
      cancelled = true;
      if (handleResize) window.removeEventListener('resize', handleResize);
      if (globe) {
        try {
          globe._destructor?.();
        } catch (cleanupError) {
          console.warn('Globe cleanup failed:', cleanupError);
        }
        if (globeRef.current === globe) globeRef.current = null;
      }
    };
  }, [dispatch]);

  // Update colors when metrics change
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.polygonCapColor((d: any) => {
        const code = d.properties?.code;
        const country = countriesRef.current[code];
        const value = country ? getMetricValue(country, metricRef.current) : 0;
        const normalized = normalizeValue(
          value,
          minMetricRef.current,
          maxMetricRef.current,
          normalizationRef.current
        );
        return interpolateColor(normalized, colorsRef.current.dark, colorsRef.current.light);
      });
      globeRef.current.polygonLabel(buildLabelFn());
    }
  }, [metrics, minMetric, maxMetric, normalization, dark, light, pandemic, metric, countries]);

  // Update altitude when selected country changes
  useEffect(() => {
    if (globeRef.current) {
      // no spinning behind the open dashboard
      const controls = globeRef.current.controls?.();
      if (controls) controls.autoRotate = !selectedCountry;
      globeRef.current.polygonAltitude((d: any) => {
        return d.properties?.code === selectedCountryRef.current ? 0.12 : 0.01;
      });
    }
  }, [selectedCountry]);

  if (error) {
    return (
      <div className="w-full h-[70vh] flex items-center justify-center bg-slate-900 text-red-400">
        <div className="text-center">
          <p className="font-semibold mb-2">Error Loading Globe</p>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-[70vh]"
      style={{
        background: 'radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%)',
      }}
    />
  );
};

function getRingCentroid(ring: number[][]): { point: [number, number]; area: number } {
  let twiceArea = 0;
  let longitudeSum = 0;
  let latitudeSum = 0;

  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    const cross = current[0] * next[1] - next[0] * current[1];
    twiceArea += cross;
    longitudeSum += (current[0] + next[0]) * cross;
    latitudeSum += (current[1] + next[1]) * cross;
  }

  if (Math.abs(twiceArea) < 1e-10) {
    const mean = ring.reduce(
      (sum, point) => [sum[0] + point[0], sum[1] + point[1]],
      [0, 0]
    );
    return {
      point: [mean[0] / ring.length, mean[1] / ring.length],
      area: 0,
    };
  }

  return {
    point: [longitudeSum / (3 * twiceArea), latitudeSum / (3 * twiceArea)],
    area: Math.abs(twiceArea) / 2,
  };
}

function getPolygonCentroid(geometry: any): [number, number] {
  const polygons: number[][][] =
    geometry?.type === 'Polygon'
      ? [geometry.coordinates?.[0]]
      : geometry?.type === 'MultiPolygon'
        ? geometry.coordinates?.map((polygon: number[][][]) => polygon[0]) ?? []
        : [];
  const validRings = polygons.filter(
    ring => Array.isArray(ring) && ring.length >= 3 &&
      ring.every(point => Number.isFinite(point[0]) && Number.isFinite(point[1]))
  );
  if (validRings.length === 0) return [0, 0];

  return validRings
    .map(getRingCentroid)
    .reduce((largest, current) => current.area > largest.area ? current : largest)
    .point;
}
