import HealthCheck from './components/HealthCheck.jsx';
import { useAcademicData } from './hooks/useAcademicData.js';

function App() {
  const { filteredCourses, loading, error, filters, setFilter, resetFilters } = useAcademicData();

  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>Icesi Virtual - Frontend</h1>
      <p>Ejemplo de consumo del backend Laravel.</p>
      <section style={{ marginBottom: '1.5rem' }}>
        <label>
          Programa:{' '}
          <input
            value={filters.programId}
            onChange={(event) => setFilter('programId', event.target.value)}
            placeholder="ID programa"
          />
        </label>
        <label style={{ marginLeft: '1rem' }}>
          Competencia:{' '}
          <input
            value={filters.competencyId}
            onChange={(event) => setFilter('competencyId', event.target.value)}
            placeholder="ID competencia"
          />
        </label>
        <label style={{ marginLeft: '1rem' }}>
          Nivel:{' '}
          <select value={filters.level} onChange={(event) => setFilter('level', event.target.value)}>
            <option value="">Todos</option>
            <option value="I">I</option>
            <option value="F">F</option>
            <option value="V">V</option>
          </select>
        </label>
        <button type="button" onClick={resetFilters} style={{ marginLeft: '1rem' }}>
          Limpiar filtros
        </button>
      </section>

      {loading && <p>Cargando matriz academica...</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {!loading && !error && <p>Courses filtrados: {filteredCourses.length}</p>}
      <HealthCheck />
    </main>
  );
}

export default App;
