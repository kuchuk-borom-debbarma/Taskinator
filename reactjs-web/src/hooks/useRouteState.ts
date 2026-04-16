import { useCallback, useEffect, useState } from 'react';
import { buildRoute, parseRoute } from '../lib/router';
import type { RouteState } from '../types';

export function useRouteState() {
  const [route, setRoute] = useState<RouteState>(() => parseRoute());

  useEffect(() => {
    const onPop = () => setRoute(parseRoute());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((next: RouteState, replace = false) => {
    const url = buildRoute(next);
    if (replace) {
      window.history.replaceState(null, '', url);
    } else {
      window.history.pushState(null, '', url);
    }
    setRoute(next);
  }, []);

  useEffect(() => {
    navigate(route, true);
  }, []);

  return { route, navigate };
}
