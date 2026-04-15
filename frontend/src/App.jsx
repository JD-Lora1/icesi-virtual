import DashboardStats from './components/DashboardStats.jsx';
import TraceabilityMatrix from './components/TraceabilityMatrix.jsx';
import { useAcademicData } from './hooks/useAcademicData.js';

function App() {
  const academicData = useAcademicData();

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="mb-8 rounded-[2rem] border border-white/10 bg-white/5 px-6 py-8 shadow-glow backdrop-blur-xl sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200/80">Icesi Virtual Project</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Dashboard de trazabilidad curricular
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
          Visualiza estadísticas clave y la matriz de relaciones entre cursos, programas, competencias y objetivos
          con filtrado en tiempo real.
        </p>
      </section>

      <div className="space-y-8">
        <DashboardStats stats={academicData.stats} loading={academicData.loading} error={academicData.error} />
        <TraceabilityMatrix {...academicData} />
      </div>
    </main>
  );
}

export default App;
