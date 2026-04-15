import { useEffect, useMemo, useState } from 'react';
import { syncCourseObjectives } from '../services/apiService.js';

const LEVELS = [
  { value: 'I', label: 'I', color: 'bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/25' },
  { value: 'F', label: 'F', color: 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/25' },
  { value: 'V', label: 'V', color: 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/25' },
];

function normalize(value) {
  return value === null || value === undefined ? '' : String(value);
}

function Badge({ value }) {
  const config = LEVELS.find((level) => level.value === value);

  return (
    <span className={`inline-flex min-w-9 items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${config?.color ?? 'bg-slate-500/15 text-slate-200 ring-1 ring-slate-400/25'}`}>
      {value || '-'}
    </span>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-300">
      <span className="font-medium text-slate-100">{label}</span>
      {children}
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}
    </label>
  );
}

function Select(props) {
  return (
    <select
      {...props}
      className={`h-11 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-slate-100 outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10 ${
        props.className ?? ''
      }`}
    />
  );
}

function ActionButton({ children, variant = 'primary', ...props }) {
  const base = 'inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition';
  const classes =
    variant === 'ghost'
      ? `${base} border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10`
      : `${base} bg-cyan-400 text-slate-950 hover:bg-cyan-300`;

  return (
    <button {...props} className={`${classes} ${props.className ?? ''}`}>
      {children}
    </button>
  );
}

function LevelChoice({ value, selected, onChange }) {
  const config = LEVELS.find((level) => level.value === value);

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-200">
      <input
        type="radio"
        className="sr-only"
        checked={selected === value}
        onChange={() => onChange(value)}
      />
      <span
        className={`inline-flex items-center justify-center rounded-full px-3 py-1 transition ${
          selected === value ? config?.color : 'bg-white/5 text-slate-300 ring-1 ring-white/10'
        }`}
      >
        {value}
      </span>
    </label>
  );
}

export default function MatrixAssignment({ courses, objectives, loading, error, refreshAcademicData }) {
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [assignments, setAssignments] = useState({});
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const selectedCourse = useMemo(() => {
    return courses.find((course) => normalize(course.id) === normalize(selectedCourseId)) ?? null;
  }, [courses, selectedCourseId]);

  const availableObjectives = useMemo(() => {
    if (!selectedCourse) {
      return [];
    }

    const programId = normalize(selectedCourse?.program?.id ?? selectedCourse?.program_id);

    return objectives.filter((objective) => {
      return normalize(objective?.competency?.program_id) === programId;
    });
  }, [objectives, selectedCourse]);

  const previewRows = useMemo(() => {
    return availableObjectives.map((objective) => {
      const rowState = assignments[objective.id] ?? { selected: false, level: '' };

      return {
        id: objective.id,
        description: objective.description,
        competencyName: objective?.competency?.name ?? '-',
        selected: Boolean(rowState.selected),
        level: rowState.level,
      };
    });
  }, [availableObjectives, assignments]);

  const savedSummary = useMemo(() => {
    const counts = { I: 0, F: 0, V: 0 };

    (selectedCourse?.learningObjectives ?? []).forEach((objective) => {
      const level = objective?.pivot?.contribution_level;
      if (level && counts[level] !== undefined) {
        counts[level] += 1;
      }
    });

    return {
      total: selectedCourse?.learningObjectives?.length ?? 0,
      counts,
    };
  }, [selectedCourse]);

  useEffect(() => {
    if (!selectedCourse) {
      setAssignments({});
      return;
    }

    const initialAssignments = {};
    (selectedCourse.learningObjectives ?? []).forEach((objective) => {
      initialAssignments[objective.id] = {
        selected: true,
        level: objective?.pivot?.contribution_level ?? 'I',
      };
    });

    setAssignments(initialAssignments);
  }, [selectedCourse]);

  function setRowSelected(objectiveId, selected) {
    setAssignments((current) => {
      const next = { ...current };

      if (!selected) {
        delete next[objectiveId];
        return next;
      }

      next[objectiveId] = {
        selected: true,
        level: next[objectiveId]?.level ?? 'I',
      };

      return next;
    });
  }

  function setRowLevel(objectiveId, level) {
    setAssignments((current) => ({
      ...current,
      [objectiveId]: {
        selected: true,
        level,
      },
    }));
  }

  function validateForm() {
    if (!selectedCourseId) {
      setFormError('Selecciona un curso antes de guardar la matriz.');
      return false;
    }

    const selectedAssignments = Object.entries(assignments).filter(([, value]) => value?.selected);

    if (selectedAssignments.length === 0) {
      setFormError('Selecciona al menos un objetivo para asignar al curso.');
      return false;
    }

    const missingLevel = selectedAssignments.find(([, value]) => !value?.level);
    if (missingLevel) {
      setFormError('Todos los objetivos seleccionados deben tener nivel I, F o V.');
      return false;
    }

    setFormError('');
    return true;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);

      const objectiveAssignments = Object.entries(assignments)
        .filter(([, value]) => value?.selected)
        .map(([objectiveId, value]) => ({
          objective_id: Number(objectiveId),
          contribution_level: value.level,
        }));

      await syncCourseObjectives(Number(selectedCourseId), objectiveAssignments);
      await refreshAcademicData();
      setFormSuccess('Matriz guardada correctamente.');
    } catch (requestError) {
      const responseData = requestError?.response?.data;
      const message = responseData?.message || Object.values(responseData?.errors ?? {}).flat().join(' ') || requestError?.message || 'No fue posible guardar la matriz.';
      setFormError(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur-xl sm:p-8">
      <div className="border-b border-white/10 pb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200/80">Asignación</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Matriz de asociación</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
          Selecciona un curso, elige objetivos del mismo programa y marca el nivel de contribución I, F o V antes de guardar.
        </p>
      </div>

      {loading ? <p className="mt-6 text-slate-300">Cargando datos de matriz...</p> : null}
      {error ? <p className="mt-6 text-rose-200">{error}</p> : null}

      {!loading && !error ? (
        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          {formError ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {formError}
            </div>
          ) : null}

          {formSuccess ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {formSuccess}
            </div>
          ) : null}

          <Field label="Curso">
            <Select value={selectedCourseId} onChange={(event) => setSelectedCourseId(event.target.value)}>
              <option value="">Selecciona un curso</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name} {course?.program?.name ? `- ${course.program.name}` : ''}
                </option>
              ))}
            </Select>
          </Field>

          {!selectedCourse ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-300">
              Selecciona un curso para ver sus objetivos disponibles.
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4 sm:p-5">
                <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
                  <h3 className="text-lg font-semibold text-white">Objetivos disponibles</h3>
                  <p className="text-sm text-slate-400">
                    Filtrados por el programa del curso: {selectedCourse?.program?.name ?? 'Sin programa'}
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  {availableObjectives.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-300">
                      No existen objetivos asociados al programa de este curso.
                    </div>
                  ) : (
                    availableObjectives.map((objective) => {
                      const rowState = assignments[objective.id] ?? { selected: false, level: '' };

                      return (
                        <article key={objective.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <label className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={Boolean(rowState.selected)}
                                onChange={(event) => setRowSelected(objective.id, event.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950 text-cyan-400 focus:ring-cyan-400/20"
                              />
                              <div>
                                <p className="font-medium text-white">{objective.description}</p>
                                <p className="mt-1 text-sm text-slate-400">
                                  Competencia: {objective?.competency?.name ?? '-'}
                                </p>
                              </div>
                            </label>

                            <div className="flex flex-wrap items-center gap-3">
                              {LEVELS.map((level) => (
                                <LevelChoice
                                  key={level.value}
                                  value={level.value}
                                  selected={rowState.level}
                                  onChange={(nextLevel) => setRowLevel(objective.id, nextLevel)}
                                />
                              ))}
                              <Badge value={rowState.level} />
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>

              <aside className="rounded-3xl border border-white/10 bg-slate-950/40 p-4 sm:p-5">
                <div className="border-b border-white/10 pb-4">
                  <h3 className="text-lg font-semibold text-white">Vista previa de matriz</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Revisa cómo quedará la relación antes de guardar.
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  {selectedCourse ? (
                    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                      <div>
                        <p className="font-semibold text-white">{selectedCourse.name}</p>
                        <p className="mt-1 text-slate-400">Programa: {selectedCourse?.program?.name ?? '-'}</p>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-4">
                        <div className="rounded-xl bg-slate-950/60 px-3 py-2">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Vinculados</p>
                          <p className="mt-1 text-lg font-semibold text-white">{savedSummary.total}</p>
                        </div>
                        <div className="rounded-xl bg-sky-500/10 px-3 py-2">
                          <p className="text-xs uppercase tracking-[0.18em] text-sky-200/70">I</p>
                          <p className="mt-1 text-lg font-semibold text-sky-100">{savedSummary.counts.I}</p>
                        </div>
                        <div className="rounded-xl bg-amber-500/10 px-3 py-2">
                          <p className="text-xs uppercase tracking-[0.18em] text-amber-200/70">F</p>
                          <p className="mt-1 text-lg font-semibold text-amber-100">{savedSummary.counts.F}</p>
                        </div>
                        <div className="rounded-xl bg-emerald-500/10 px-3 py-2">
                          <p className="text-xs uppercase tracking-[0.18em] text-emerald-200/70">V</p>
                          <p className="mt-1 text-lg font-semibold text-emerald-100">{savedSummary.counts.V}</p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {previewRows.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-300">
                      La vista previa aparecerá cuando selecciones un curso.
                    </div>
                  ) : (
                    previewRows.map((row) => (
                      <div key={row.id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-white">{row.description}</p>
                            <p className="mt-1 text-xs text-slate-400">{row.competencyName}</p>
                            <p className="mt-2 text-xs text-slate-500">
                              Estado actual: {row.selected ? 'Vinculado' : 'Sin vincular'}
                            </p>
                          </div>
                          <Badge value={row.selected ? row.level : ''} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </aside>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <ActionButton
              type="button"
              variant="ghost"
              onClick={() => {
                setSelectedCourseId('');
                setAssignments({});
                setFormError('');
                setFormSuccess('');
              }}
            >
              Limpiar
            </ActionButton>
            <ActionButton type="submit" disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar matriz'}
            </ActionButton>
          </div>
        </form>
      ) : null}
    </section>
  );
}
