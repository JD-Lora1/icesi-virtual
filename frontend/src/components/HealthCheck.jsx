import { useHealth } from '../hooks/useHealth.js';

function HealthCheck() {
  const { data, loading, error } = useHealth();

  if (loading) {
    return <p>Consultando backend...</p>;
  }

  if (error) {
    return <p style={{ color: 'crimson' }}>{error}</p>;
  }

  return (
    <section>
      <h2>Respuesta del backend</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </section>
  );
}

export default HealthCheck;
