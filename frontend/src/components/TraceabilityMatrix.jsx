function levelBadgeClasses(level) {
  switch (level) {
    case 'I':
      return 'bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/25';
    case 'F':
      return 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/25';
    case 'V':
      return 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/25';
    default:
      return 'bg-slate-500/15 text-slate-200 ring-1 ring-slate-400/25';
  }
}

function MatrixBadge({ level }) {
  return (
    <span className={`inline-flex min-w-10 items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${levelBadgeClasses(level)}`}>
      {level || '-'}
    </span>
  );
}

function SelectField({ label, value, onChange, children }) {
  return (
    <label className="flex flex-1 min-w-48 flex-col gap-2 text-sm text-slate-300">
      <span className="font-medium text-slate-200">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-2xl border border-white/10 bg-slate-900/80 px-4 text-slate-100 outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
      >
        {children}
      </select>
    </label>
  );
}

export default function TraceabilityMatrix({
  filteredCourses,
  filters,
  programOptions,
  competencyOptions,
  levelOptions,
  setFilter,
  resetFilters,
  loading,
  error,
}) {
  const matrixRows = filteredCourses.flatMap((course) => {
    const objectives = course?.learningObjectives ?? [];

    if (objectives.length === 0) {
      return [
        {
          id: `${course.id}-empty`,
          courseName: course?.name ?? '-',
          programName: course?.program?.name ?? '-',
          competencyName: '-',
          objectiveName: 'Sin objetivos asociados',
          level: '',
        },
      ];
    }

    return objectives.map((objective) => ({
      id: `${course.id}-${objective.id}`,
      courseName: course?.name ?? '-',
      programName: course?.program?.name ?? '-',
      competencyName: objective?.competency?.name ?? '-',
      objectiveName: objective?.description ?? '-',
      level: objective?.pivot?.contribution_level ?? '',
    }));
  });

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur-xl">
      <div className="flex flex-col gap-6 border-b border-white/10 pb-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">Traceability Matrix</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Matriz de trazabilidad curricular</h2>
          <p className="mt-1 text-sm text-slate-300">
            Filtra por programa, competencia y nivel sin recargar la página.
          </p>
        </div>

        <div className="flex flex-col gap-4 xl:flex-row">
          <SelectField label="Programa" value={filters.programId} onChange={(value) => setFilter('programId', value)}>
            <option value="">Todos los programas</option>
            {programOptions.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </SelectField>

          <SelectField label="Competencia" value={filters.competencyId} onChange={(value) => setFilter('competencyId', value)}>
            <option value="">Todas las competencias</option>
            {competencyOptions.map((competency) => (
              <option key={competency.id} value={competency.id}>
                {competency.name}
              </option>
            ))}
          </SelectField>

          <SelectField label="Nivel" value={filters.level} onChange={(value) => setFilter('level', value)}>
            <option value="">Todos los niveles</option>
            {levelOptions.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </SelectField>

          <div className="flex items-end">
            <button
              type="button"
              onClick={resetFilters}
              className="h-11 rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-semibold text-slate-100 transition hover:border-cyan-400/30 hover:bg-white/10"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      {loading && <p className="px-1 py-6 text-slate-300">Cargando matriz académica...</p>}
      {error && <p className="px-1 py-6 text-red-200">{error}</p>}

      {!loading && !error && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
          <div className="max-h-[32rem] overflow-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-slate-950/95 text-slate-200 backdrop-blur">
                <tr>
                  <th className="px-4 py-3 font-semibold">Curso</th>
                  <th className="px-4 py-3 font-semibold">Programa</th>
                  <th className="px-4 py-3 font-semibold">Competencia</th>
                  <th className="px-4 py-3 font-semibold">Objetivo</th>
                  <th className="px-4 py-3 font-semibold">Nivel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-slate-950/40">
                {matrixRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-300" colSpan={5}>
                      No hay resultados para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  matrixRows.map((row) => (
                    <tr key={row.id} className="align-top transition hover:bg-white/5">
                      <td className="px-4 py-4 font-medium text-white">{row.courseName}</td>
                      <td className="px-4 py-4 text-slate-300">{row.programName}</td>
                      <td className="px-4 py-4 text-slate-300">{row.competencyName}</td>
                      <td className="px-4 py-4 text-slate-200">{row.objectiveName}</td>
                      <td className="px-4 py-4">
                        <MatrixBadge level={row.level} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
