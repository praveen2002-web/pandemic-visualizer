/**
 * Red-only color scale for COVID-19 severity visualization
 * Dark burgundy (#660000) for low cases → Light red (#ff6b6b) for high cases
 */

export type NormalizationType = 'linear' | 'log';
export type MetricType = 'cases' | 'casesPerMillion' | 'deaths' | 'deathsPerMillion';

const DARK_RED = '#660000';
const LIGHT_RED = '#ff6b6b';

/**
 * Interpolate between two hex colors
 */
function interpolateColor(color1: string, color2: string, factor: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);

  if (!c1 || !c2) return color1;

  const r = Math.round(c1.r + (c2.r - c1.r) * factor);
  const g = Math.round(c1.g + (c2.g - c1.g) * factor);
  const b = Math.round(c1.b + (c2.b - c1.b) * factor);

  return rgbToHex(r, g, b);
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert RGB to hex color
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Normalize a value using linear or log scale
 */
function normalizeValue(value: number, min: number, max: number, type: NormalizationType): number {
  if (value <= 0) return 0;
  if (min === max) return 0.5;

  if (type === 'log') {
    // Log normalization: log(value) / log(max)
    const logMin = Math.log(Math.max(min, 1));
    const logMax = Math.log(Math.max(max, 1));
    const logValue = Math.log(Math.max(value, 1));
    return (logValue - logMin) / (logMax - logMin);
  } else {
    // Linear normalization
    return (value - min) / (max - min);
  }
}

/**
 * Get color for a metric value based on severity
 * Returns a red-only color from dark burgundy to light red
 */
export function getMetricColor(
  value: number,
  min: number,
  max: number,
  normalizationType: NormalizationType = 'log'
): string {
  const normalized = Math.max(0, Math.min(1, normalizeValue(value, min, max, normalizationType)));
  return interpolateColor(DARK_RED, LIGHT_RED, normalized);
}

/**
 * Calculate cases per 100k population
 */
export function calculateCasesPer100k(cases: number, population: number): number {
  if (population <= 0) return 0;
  return (cases / population) * 100000;
}

/**
 * Calculate deaths per 100k population
 */
export function calculateDeathsPer100k(deaths: number, population: number): number {
  if (population <= 0) return 0;
  return (deaths / population) * 100000;
}

/**
 * Get metric value for a country based on metric type
 */
export function getMetricValue(
  metric: MetricType,
  cases: number,
  deaths: number,
  casesPerMillion: number,
  deathsPerMillion: number
): number {
  switch (metric) {
    case 'cases':
      return cases;
    case 'deaths':
      return deaths;
    case 'casesPerMillion':
      return casesPerMillion;
    case 'deathsPerMillion':
      return deathsPerMillion;
    default:
      return cases;
  }
}

/**
 * Format large numbers for display
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return value.toFixed(decimals) + '%';
}

/**
 * Get color scale endpoints for legend
 */
export function getColorScaleEndpoints(): { dark: string; light: string } {
  return {
    dark: DARK_RED,
    light: LIGHT_RED,
  };
}

/**
 * Get metric label for display
 */
export function getMetricLabel(metric: MetricType): string {
  switch (metric) {
    case 'cases':
      return 'Total Cases';
    case 'deaths':
      return 'Total Deaths';
    case 'casesPerMillion':
      return 'Cases per Million';
    case 'deathsPerMillion':
      return 'Deaths per Million';
    default:
      return 'Cases';
  }
}
