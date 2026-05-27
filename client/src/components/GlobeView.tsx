import React, { useEffect, useRef, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  selectActiveCountries,
  selectSelectedCountryCode,
} from '@/store/pandemicSelectors';
import { setSelectedCountry } from '@/store/pandemicSlice';
import {
  getPandemicConfig,
  getColorScaleEndpoints,
  MetricType,
  NormalizationType,
} from '@/config/pandemicConfig';
import type { PandemicType } from '@/types/pandemic';

interface CountryMetrics {
  [code: string]: number;
}

export interface GlobeViewProps {
  metric?: MetricType;
  normalization?: NormalizationType;
  pandemic: PandemicType;
}

/**
 * Get the metric value from country data based on metric type
 */
function getMetricValue(
  country: any,
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

export const GlobeView: React.FC<GlobeViewProps> = ({
  metric = 'cases',
  normalization = 'log',
  pandemic,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const resizeListenerRef = useRef<(() => void) | null>(null);
  const dispatch = useAppDispatch();

  const countries = useAppSelector(selectActiveCountries);
  const selectedCountry = useAppSelector(selectSelectedCountryCode);

 
  const countriesRef = useRef(countries);
  const metricRef = useRef(metric);
  
  const geoNameMapRef = useRef<Record<string, string>>({});

  const [metrics, setMetrics] = useState<CountryMetrics>({});
  const [minMetric, setMinMetric] = useState(0);
  const [maxMetric, setMaxMetric] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const geoJsonUrl =
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';
  const config = getPandemicConfig(pandemic);
  const { dark, light } = getColorScaleEndpoints(pandemic);
  const darkRgb = hexToRgb(dark);
  const lightRgb = hexToRgb(light);

  // Keep refs in sync with latest values
  useEffect(() => { countriesRef.current = countries; }, [countries]);
  useEffect(() => { metricRef.current = metric; }, [metric]);

  // Helper to build the polygon label — reads from refs so it's always fresh
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
    if (!country) {
      return `<div class="globe-tooltip"><div class="globe-tooltip-name">${countryName}</div></div>`;
    }
    const metricLabel = currentMetric === 'fatalityRate' ? 'Fatality Rate' : 'Cases';
    const metricValue =
      currentMetric === 'fatalityRate'
        ? (country.fatalityRate ?? 0).toFixed(1) + '%'
        : (country.cases ?? 0).toLocaleString();
    return `<div class="globe-tooltip">
      <div class="globe-tooltip-name">${countryName}</div>
      <div>${metricLabel}: ${metricValue}</div>
      <div>Deaths: ${(country.deaths ?? 0).toLocaleString()}</div>
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

    // Re-apply label so it picks up fresh country data
    if (globeRef.current) {
      globeRef.current.polygonLabel(buildLabelFn());
    }
  }, [countries, metric]);

  // Load GeoJSON and initialize globe
  useEffect(() => {
    if (!containerRef.current) return;

    const initGlobe = async () => {
      try {
        setError(null);

        // Dynamically import globe.gl
        const Globe = (await import('globe.gl')).default;

        // Fetch GeoJSON with CORS
        const response = await fetch(geoJsonUrl, {
          mode: 'cors',
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch GeoJSON: ${response.statusText}`);
        }

        const geoData = await response.json();

        if (!containerRef.current) return;

        // Create globe instance
        const globe = new Globe(containerRef.current);
        globeRef.current = globe;

        // Set globe properties
        globe
          .globeImageUrl(
            '//unpkg.com/three-globe/example/img/earth-night.jpg'
          )
          .bumpImageUrl(
            '//unpkg.com/three-globe/example/img/earth-topology.png'
          )
          .backgroundImageUrl(
            '//unpkg.com/three-globe/example/img/night-sky.png'
          )
          .width(containerRef.current.clientWidth)
          .height(containerRef.current.clientHeight);

        // Process GeoJSON features
        // Natural Earth GeoJSON uses uppercase property names: NAME, ADMIN, ISO_A2, ISO_A3
        const features = (geoData.features || []).map((feature: any) => {
          const props = feature.properties || {};
          // Resolve ISO2 code — Natural Earth uses ISO_A2 (uppercase); -99 means no code
          const rawCode = props.ISO_A2 || props.iso_a2 || props.ISO_A3?.slice(0, 2) || '';
          const code = rawCode && rawCode !== '-99' ? rawCode : (props.ADM0_A3 || 'XX');
          // Resolve country name — Natural Earth uses NAME or ADMIN (uppercase)
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

        // Build a code→name map from GeoJSON for tooltip fallback
        const nameMap: Record<string, string> = {};
        for (const f of features) {
          if (f.properties.code && f.properties.name) {
            nameMap[f.properties.code] = f.properties.name;
          }
        }
        geoNameMapRef.current = nameMap;

        // Add polygons
        globe.polygonsData(features);

        // Set polygon colors
        globe.polygonCapColor((d: any) => {
          const code = d.properties?.code;
          const value = metrics[code] ?? 0;
          const normalized = normalizeValue(
            value,
            minMetric,
            maxMetric,
            normalization
          );
          return interpolateColor(normalized, darkRgb, lightRgb);
        });

        globe.polygonSideColor(() => 'rgba(0, 0, 0, 0.3)');
        globe.polygonStrokeColor(() => 'rgba(255, 255, 255, 0.1)');

        // Set polygon altitude
        globe.polygonAltitude((d: any) => {
          return d.properties?.code === selectedCountry ? 0.12 : 0.01;
        });

        // Set polygon labels — uses buildLabelFn so it reads from refs (no stale closure)
        globe.polygonLabel(buildLabelFn());

        // Add click handler
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

        // Enable auto-rotate
        try {
          const controls = globe.controls();
          if (controls) {
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.5;
          }
        } catch (e) {
          console.warn('Auto-rotate setup failed:', e);
        }

        // Handle window resize
        const handleResize = () => {
          if (containerRef.current && globeRef.current) {
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;
            if (width > 0 && height > 0) {
              globeRef.current.width(width).height(height);
            }
          }
        };

        window.addEventListener('resize', handleResize);
        resizeListenerRef.current = handleResize;

        return () => {
          window.removeEventListener('resize', handleResize);
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('Globe initialization error:', errorMsg);
        setError(`Failed to load globe: ${errorMsg}`);
        return () => {}; // Return empty cleanup if error
      }
    };

    const cleanupPromise = initGlobe();

    return () => {
      cleanupPromise.then(cleanup => cleanup?.());

      // Remove resize listener if it was set
      if (resizeListenerRef.current) {
        window.removeEventListener('resize', resizeListenerRef.current);
        resizeListenerRef.current = null;
      }

      // Cleanup globe instance
      if (globeRef.current) {
        try {
          globeRef.current = null;
        } catch (e) {
          console.warn('Cleanup error:', e);
        }
      }
    };
  }, [dispatch, countries, pandemic]);

  // Update colors when metrics change
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.polygonCapColor((d: any) => {
        const code = d.properties?.code;
        const value = metrics[code] ?? 0;
        const normalized = normalizeValue(
          value,
          minMetric,
          maxMetric,
          normalization
        );
        return interpolateColor(normalized, darkRgb, lightRgb);
      });
    }
  }, [metrics, minMetric, maxMetric, normalization, darkRgb, lightRgb]);

  // Update altitude when selected country changes
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.polygonAltitude((d: any) => {
        return d.properties?.code === selectedCountry ? 0.12 : 0.01;
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

/**
 * Calculate centroid of a polygon
 */
function getPolygonCentroid(geometry: any): [number, number] {
  try {
    if (geometry?.type === 'Polygon' && geometry.coordinates?.[0]) {
      const coords = geometry.coordinates[0];
      let lat = 0,
        lng = 0;
      for (const coord of coords) {
        lng += coord[0];
        lat += coord[1];
      }
      return [lng / coords.length, lat / coords.length];
    } else if (
      geometry?.type === 'MultiPolygon' &&
      geometry.coordinates?.[0]?.[0]
    ) {
      const coords = geometry.coordinates[0][0];
      let lat = 0,
        lng = 0;
      for (const coord of coords) {
        lng += coord[0];
        lat += coord[1];
      }
      return [lng / coords.length, lat / coords.length];
    }
  } catch (e) {
    console.warn('Error calculating centroid:', e);
  }
  return [0, 0];
}
