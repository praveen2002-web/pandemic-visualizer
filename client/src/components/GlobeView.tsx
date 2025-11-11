import React, { useEffect, useRef, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { selectAllCountries, selectSelectedCountryCode } from '../store/selectors';
import { setSelectedCountry } from '../store/covidSlice';
import { getMetricColor, calculateCasesPer100k, NormalizationType, MetricType } from '../utils/colorUtils';

interface CountryMetrics {
  [code: string]: number;
}

export interface GlobeViewProps {
  metric?: MetricType;
  normalization?: NormalizationType;
}

export const GlobeView: React.FC<GlobeViewProps> = ({ 
  metric = 'casesPerMillion', 
  normalization = 'log' 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const dispatch = useAppDispatch();
  
  const countries = useAppSelector(selectAllCountries);
  const selectedCountry = useAppSelector(selectSelectedCountryCode);

  const [metrics, setMetrics] = useState<CountryMetrics>({});
  const [minMetric, setMinMetric] = useState(0);
  const [maxMetric, setMaxMetric] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const geoJsonUrl = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';

  // Calculate metrics for all countries
  useEffect(() => {
    const newMetrics: CountryMetrics = {};
    let min = Infinity;
    let max = -Infinity;

    Object.entries(countries).forEach(([code, country]) => {
      let value = 0;

      if (metric === 'casesPerMillion') {
        value = country.casesPerMillion || 0;
      } else if (metric === 'cases') {
        value = calculateCasesPer100k(country.cases || 0, country.population || 1);
      } else if (metric === 'deathsPerMillion') {
        value = country.deathsPerMillion || 0;
      } else if (metric === 'deaths') {
        value = calculateCasesPer100k(country.deaths || 0, country.population || 1);
      }

      newMetrics[code] = value;
      if (value > 0) {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    });

    setMetrics(newMetrics);
    setMinMetric(min === Infinity ? 0 : min);
    setMaxMetric(max === -Infinity ? 1 : max);
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
            'Accept': 'application/json',
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
          .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
          .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
          .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
          .width(containerRef.current.clientWidth)
          .height(containerRef.current.clientHeight);

        // Process GeoJSON features
        const features = (geoData.features || []).map((feature: any) => ({
          ...feature,
          properties: {
            ...feature.properties,
            code: feature.properties?.iso_a2 || feature.properties?.ISO_A2 || 'XX',
            name: feature.properties?.name || 'Unknown',
          },
        }));

        // Add polygons
        globe.polygonsData(features);

        // Set polygon colors
        globe.polygonCapColor((d: any) => {
          const code = d.properties?.code;
          const value = metrics[code] || 0;
          return getMetricColor(value, minMetric, maxMetric, normalization);
        });

        globe.polygonSideColor(() => 'rgba(0, 0, 0, 0.3)');
        globe.polygonStrokeColor(() => 'rgba(255, 255, 255, 0.1)');

        // Set polygon altitude
        globe.polygonAltitude((d: any) => {
          return d.properties?.code === selectedCountry ? 0.12 : 0.01;
        });

        // Set polygon labels
        globe.polygonLabel((d: any) => {
          const code = d.properties?.code;
          const country = countries[code];
          if (!country) return d.properties?.name || 'Unknown';
          return `<div class="text-sm">
            <div class="font-bold">${country.name}</div>
            <div>Cases: ${(country.cases || 0).toLocaleString()}</div>
            <div>Deaths: ${(country.deaths || 0).toLocaleString()}</div>
            <div>Active: ${(country.active || 0).toLocaleString()}</div>
          </div>`;
        });

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

        // Note: resize listener cleanup is handled in main useEffect cleanup
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('Globe initialization error:', errorMsg);
        setError(`Failed to load globe: ${errorMsg}`);
      }
    };

    initGlobe();

    return () => {
      // Cleanup
      if (globeRef.current) {
        try {
          globeRef.current = null;
        } catch (e) {
          console.warn('Cleanup error:', e);
        }
      }
    };
  }, [dispatch, countries]);

  // Update colors when metrics change
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.polygonCapColor((d: any) => {
        const code = d.properties?.code;
        const value = metrics[code] || 0;
        return getMetricColor(value, minMetric, maxMetric, normalization);
      });
    }
  }, [metrics, minMetric, maxMetric, normalization]);

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
      <div className="w-full h-full flex items-center justify-center bg-slate-900 text-red-400">
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
      className="w-full h-full"
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
      let lat = 0, lng = 0;
      for (const coord of coords) {
        lng += coord[0];
        lat += coord[1];
      }
      return [lng / coords.length, lat / coords.length];
    } else if (geometry?.type === 'MultiPolygon' && geometry.coordinates?.[0]?.[0]) {
      const coords = geometry.coordinates[0][0];
      let lat = 0, lng = 0;
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
