/** Keeps ?country=XX and the browser's Back button in step with the open dashboard. */
import { useEffect, useRef } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { setSelectedCountry } from '@/store/pandemicSlice';

const PARAM = 'country';
const MARK = 'countryDashboard'; // marks history entries we pushed

export function readCountryParam(): string | null {
  const value = new URLSearchParams(window.location.search).get(PARAM)?.toUpperCase();
  return value && /^[A-Z0-9-]{2,3}$/.test(value) ? value : null;
}

function urlWith(code: string | null): string {
  const url = new URL(window.location.href);
  if (code) url.searchParams.set(PARAM, code);
  else url.searchParams.delete(PARAM);
  return url.pathname + url.search + url.hash;
}

export function closeCountry(dispatch: ReturnType<typeof useAppDispatch>) {
  if (window.history.state?.[MARK]) {
    window.history.back(); // the popstate listener clears the selection
  } else {
    window.history.replaceState(null, '', urlWith(null));
    dispatch(setSelectedCountry(null));
  }
}

export function useCountryUrl(code: string | null) {
  const dispatch = useAppDispatch();
  const previous = useRef<string | null>(null);

  useEffect(() => {
    if (code && !window.history.state?.[MARK]) {
      // deep link: add a clean entry underneath so Back closes instead of leaving the site
      if (readCountryParam()) window.history.replaceState(null, '', urlWith(null));
      window.history.pushState({ [MARK]: true }, '', urlWith(code));
    } else if (!code && previous.current && readCountryParam()) {
      // closed by something else; not on first mount, so a deep link survives until it is read
      window.history.replaceState(null, '', urlWith(null));
    }
    previous.current = code;
  }, [code]);

  useEffect(() => {
    const onPop = () => dispatch(setSelectedCountry(readCountryParam()));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [dispatch]);
}
