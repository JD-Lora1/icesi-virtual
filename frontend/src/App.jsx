import DashboardStats from './components/DashboardStats.jsx';
import AcademicManagement from './components/AcademicManagement.jsx';
import MatrixAssignment from './components/MatrixAssignment.jsx';
import TraceabilityMatrix from './components/TraceabilityMatrix.jsx';
import { useAcademicData } from './hooks/useAcademicData.js';

function App() {
  const academicData = useAcademicData();

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-8 rounded-[2rem] border border-slate-200 bg-white px-6 py-8 shadow-[0_10px_40px_rgba(15,23,42,0.06)] sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Icesi Virtual Project</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Dashboard de trazabilidad curricular
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
          Una interfaz minimalista para gestionar cursos, competencias, objetivos y la matriz de asociación.
        </p>
      </section>

      <div className="space-y-8">
        <DashboardStats stats={academicData.stats} loading={academicData.loading} error={academicData.error} />
        <MatrixAssignment {...academicData} />
        <TraceabilityMatrix {...academicData} />
        <AcademicManagement {...academicData} />
      </div>
    </main>
  );
}

export default App;
