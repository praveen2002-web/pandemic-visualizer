/**
 * usePandemicPreferences
 *
 * Persists user UI preferences in cookies so they survive page refreshes.
 *
 * Stored cookies:
 *   pv_pandemic   – active pandemic tab  (covid | ebola | westnile)
 *   pv_view       – globe/list view mode (globe | list)
 *   pv_metric     – active map metric    (MetricType)
 *   pv_norm       – scale type           (linear | log)
 *
 * Cookie options: 1-year expiry, SameSite=Lax, path=/
 */

import { useCookies } from 'react-cookie';
import type { PandemicType } from '@/types/pandemic';
import type { MetricType, NormalizationType } from '@/config/pandemicConfig';

const COOKIE_PANDEMIC = 'pv_pandemic';
const COOKIE_VIEW     = 'pv_view';
const COOKIE_METRIC   = 'pv_metric';
const COOKIE_NORM     = 'pv_norm';

const COOKIE_OPTIONS = {
  path: '/',
  maxAge: 60 * 60 * 24 * 365, // 1 year
  sameSite: 'lax' as const,
};

const VALID_PANDEMICS: PandemicType[] = ['covid', 'ebola', 'westnile'];
const VALID_VIEWS     = ['globe', 'list'] as const;
const VALID_NORMS: NormalizationType[] = ['linear', 'log'];

function isValidPandemic(v: unknown): v is PandemicType {
  return VALID_PANDEMICS.includes(v as PandemicType);
}

function isValidView(v: unknown): v is 'globe' | 'list' {
  return VALID_VIEWS.includes(v as 'globe' | 'list');
}

function isValidNorm(v: unknown): v is NormalizationType {
  return VALID_NORMS.includes(v as NormalizationType);
}

export interface PandemicPreferences {
  /** Currently active pandemic tab */
  pandemic: PandemicType;
  setPandemic: (p: PandemicType) => void;

  /** Globe vs. list view */
  viewMode: 'globe' | 'list';
  setViewMode: (v: 'globe' | 'list') => void;

  /** Active map metric */
  metric: MetricType;
  setMetric: (m: MetricType) => void;

  /** Linear or log scale */
  normalization: NormalizationType;
  setNormalization: (n: NormalizationType) => void;
}

export function usePandemicPreferences(defaultMetric: MetricType): PandemicPreferences {
  const [cookies, setCookie] = useCookies([
    COOKIE_PANDEMIC,
    COOKIE_VIEW,
    COOKIE_METRIC,
    COOKIE_NORM,
  ]);

  // ── Read with validation & fallback ──────────────────────────────────────
  const pandemic: PandemicType = isValidPandemic(cookies[COOKIE_PANDEMIC])
    ? cookies[COOKIE_PANDEMIC]
    : 'covid';

  const viewMode: 'globe' | 'list' = isValidView(cookies[COOKIE_VIEW])
    ? cookies[COOKIE_VIEW]
    : 'globe';

  const metric: MetricType = cookies[COOKIE_METRIC] ?? defaultMetric;

  const normalization: NormalizationType = isValidNorm(cookies[COOKIE_NORM])
    ? cookies[COOKIE_NORM]
    : 'log';

  // ── Setters ───────────────────────────────────────────────────────────────
  const setPandemic = (p: PandemicType) =>
    setCookie(COOKIE_PANDEMIC, p, COOKIE_OPTIONS);

  const setViewMode = (v: 'globe' | 'list') =>
    setCookie(COOKIE_VIEW, v, COOKIE_OPTIONS);

  const setMetric = (m: MetricType) =>
    setCookie(COOKIE_METRIC, m, COOKIE_OPTIONS);

  const setNormalization = (n: NormalizationType) =>
    setCookie(COOKIE_NORM, n, COOKIE_OPTIONS);

  return {
    pandemic,
    setPandemic,
    viewMode,
    setViewMode,
    metric,
    setMetric,
    normalization,
    setNormalization,
  };
}
