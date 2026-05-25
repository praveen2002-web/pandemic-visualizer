/**
 * Per-pandemic configuration
 * Defines metrics, display options, colors, and UI elements for each pandemic type
 */

import type { PandemicType } from '@/types/pandemic';

export type MetricType = 
  | 'cases' 
  | 'deaths' 
  | 'recovered' 
  | 'active' 
  | 'casesPerMillion' 
  | 'deathsPerMillion' 
  | 'vaccinationPercentage'
  | 'fatalityRate'
  | 'testsPerMillion';

export type NormalizationType = 'linear' | 'log';

export interface PandemicConfig {
  name: string;
  shortName: string;
  description: string;
  
  // Available metrics for this pandemic
  availableMetrics: MetricType[];
  defaultMetric: MetricType;
  
  // Color configuration
  accentColor: string;
  colorRamp: {
    dark: string; // Low severity/cases
    light: string; // High severity/cases
  };
  
  // Stats card configuration
  statsCards: string[]; // Keys for which stat cards to display
  
  // Chart configuration in modal
  chartTypes: ('daily-cases' | 'daily-deaths' | 'cumulative' | 'fatality-rate' | 'vaccination' | 'yearly-trend')[];
  
  // Default sorting for country list
  defaultSort: 'cases' | 'deaths' | 'fatalityRate' | 'vaccinationPercentage';
  defaultSortDesc: boolean;
}

export const pandemicConfigs: Record<PandemicType, PandemicConfig> = {
  covid: {
    name: 'COVID-19',
    shortName: 'Corona',
    description: 'Coronavirus Disease 2019',
    
    availableMetrics: [
      'casesPerMillion',
      'cases',
      'deathsPerMillion',
      'deaths',
      'vaccinationPercentage',
    ],
    defaultMetric: 'casesPerMillion',
    
    accentColor: '#378ADD', // blue-400
    colorRamp: {
      dark: '#1E40AF', // blue-800
      light: '#93C5FD', // blue-300
    },
    
    statsCards: [
      'totalCases',
      'totalDeaths',
      'totalRecovered',
      'totalActive',
      'vaccinationPercentage',
    ],
    
    chartTypes: [
      'daily-cases',
      'daily-deaths',
      'vaccination',
    ],
    
    defaultSort: 'cases',
    defaultSortDesc: true,
  },
  
  ebola: {
    name: 'Ebola',
    shortName: 'Ebola',
    description: 'Ebola Virus Disease',
    
    availableMetrics: [
      'cases',
      'deaths',
      'fatalityRate',
    ],
    defaultMetric: 'fatalityRate',
    
    accentColor: '#E24B4A', // red-400 (reflects high fatality)
    colorRamp: {
      dark: '#7F1D1D', // red-900
      light: '#FCA5A5', // red-200
    },
    
    statsCards: [
      'totalCases',
      'totalDeaths',
      'fatalityRate',
    ],
    
    chartTypes: [
      'cumulative',
      'fatality-rate',
    ],
    
    defaultSort: 'fatalityRate',
    defaultSortDesc: true,
  },
  
  westnile: {
    name: 'West Nile Virus',
    shortName: 'West Nile',
    description: 'West Nile Virus',
    
    availableMetrics: [
      'cases',
      'deaths',
      'fatalityRate',
    ],
    defaultMetric: 'cases',
    
    accentColor: '#EF9F27', // amber-400 (seasonal, lower fatality)
    colorRamp: {
      dark: '#92400E', // amber-900
      light: '#FDE047', // amber-300
    },
    
    statsCards: [
      'totalCases',
      'totalDeaths',
      'fatalityRate',
    ],
    
    chartTypes: [
      'yearly-trend',
      'cumulative',
    ],
    
    defaultSort: 'cases',
    defaultSortDesc: true,
  },
};

export function getPandemicConfig(pandemic: PandemicType): PandemicConfig {
  return pandemicConfigs[pandemic];
}

export function getMetricLabel(metric: MetricType): string {
  const labels: Record<MetricType, string> = {
    cases: 'Total Cases',
    deaths: 'Total Deaths',
    recovered: 'Recovered',
    active: 'Active Cases',
    casesPerMillion: 'Cases per Million',
    deathsPerMillion: 'Deaths per Million',
    vaccinationPercentage: 'Vaccination Rate',
    fatalityRate: 'Fatality Rate (%)',
    testsPerMillion: 'Tests per Million',
  };
  return labels[metric] || metric;
}

/**
 * Get color scale endpoints for globe visualization
 */
export function getColorScaleEndpoints(pandemic: PandemicType): { dark: string; light: string } {
  const config = getPandemicConfig(pandemic);
  return config.colorRamp;
}
