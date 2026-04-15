import { useState, useEffect, useCallback } from 'react';
import { fetchCurrentPrecincts, type ComfortWeights, type Precinct } from '../lib/api';

export function usePrecincts(weights?: ComfortWeights) {
  const [precincts, setPrecincts] = useState<Precinct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchCurrentPrecincts(weights);
      setPrecincts(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [weights]);

  useEffect(() => {
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  return { precincts, loading, error, refresh: load };
}
