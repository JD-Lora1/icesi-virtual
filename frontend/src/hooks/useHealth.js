import { useEffect, useState } from 'react';
import { getHealth } from '../services/api.js';

export function useHealth() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadHealth() {
      try {
        const result = await getHealth();
        if (active) {
          setData(result);
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'No fue posible conectar con el backend.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadHealth();

    return () => {
      active = false;
    };
  }, []);

  return { data, loading, error };
}
