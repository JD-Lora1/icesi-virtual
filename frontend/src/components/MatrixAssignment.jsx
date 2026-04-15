import { useEffect, useMemo, useState } from 'react';
import { syncCourseObjectives } from '../services/apiService.js';

const LEVELS = [
  { value: 'I', label: 'I', color: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' },
  { value: 'F', label: 'F', color: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  { value: 'V', label: 'V', color: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
];

function normalize(value) {
  return value === null || value === undefined ? '' : String(value);
}

function Badge({ value }) {
  const config = LEVELS.find((level) => level.value === value);

  return (
    <span className={`inline-flex min-w-9 items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${config?.color ?? 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'}`}>
      {value || '-'}
    </span>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-600">
      <span className="font-medium text-slate-900">{label}</span>
      {children}
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </label>
  );
}

function Select(props) {
  return (
    <select
      {...props}
      className={`h-11 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${
        props.className ?? ''
      }`}
    />
  );
}

function ActionButton({ children, variant = 'primary', ...props }) {
  const base = 'inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition';
  const classes =
    variant === 'ghost'
      ? `${base} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`
      : `${base} bg-slate-900 text-white hover:bg-slate-800`;

  return (
    <button {...props} className={`${classes} ${props.className ?? ''}`}>
      {children}
    </button>
  );
}

function LevelChoice({ value, selected, onChange }) {
  const config = LEVELS.find((level) => level.value === value);

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
      <input
        type="radio"
        className="sr-only"
        checked={selected === value}
        onChange={() => onChange(value)}
      />
      <span
        className={`inline-flex items-center justify-center rounded-full px-3 py-1 transition ${
          selected === value ? config?.color : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
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
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.06)] sm:p-8">
      <div className="border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Asignación</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-900">Matriz de asociación</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Selecciona un curso, elige objetivos del mismo programa y marca el nivel de contribución I, F o V antes de guardar.
        </p>
      </div>

      {loading ? <p className="mt-6 text-slate-600">Cargando datos de matriz...</p> : null}
      {error ? <p className="mt-6 text-rose-600">{error}</p> : null}

      {!loading && !error ? (
        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          {formError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {formError}
            </div>
          ) : null}

          {formSuccess ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
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
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
              Selecciona un curso para ver sus objetivos disponibles.
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="flex flex-col gap-2 border-b border-slate-200 pb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Objetivos disponibles</h3>
                  <p className="text-sm text-slate-600">
                    Filtrados por el programa del curso: {selectedCourse?.program?.name ?? 'Sin programa'}
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  {availableObjectives.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-600">
                      No existen objetivos asociados al programa de este curso.
                    </div>
                  ) : (
                    availableObjectives.map((objective) => {
                      const rowState = assignments[objective.id] ?? { selected: false, level: '' };

                      return (
                        <article key={objective.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <label className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={Boolean(rowState.selected)}
                                onChange={(event) => setRowSelected(objective.id, event.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200"
                              />
                              <div>
                                <p className="font-medium text-slate-900">{objective.description}</p>
                                <p className="mt-1 text-sm text-slate-600">
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

              <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="border-b border-slate-200 pb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Vista previa de matriz</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Revisa cómo quedará la relación antes de guardar.
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  {selectedCourse ? (
                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                      <div>
                        <p className="font-semibold text-slate-900">{selectedCourse.name}</p>
                        <p className="mt-1 text-slate-600">Programa: {selectedCourse?.program?.name ?? '-'}</p>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-4">
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Vinculados</p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">{savedSummary.total}</p>
                        </div>
                        <div className="rounded-xl bg-sky-50 px-3 py-2">
                          <p className="text-xs uppercase tracking-[0.18em] text-sky-700">I</p>
                          <p className="mt-1 text-lg font-semibold text-sky-700">{savedSummary.counts.I}</p>
                        </div>
                        <div className="rounded-xl bg-amber-50 px-3 py-2">
                          <p className="text-xs uppercase tracking-[0.18em] text-amber-700">F</p>
                          <p className="mt-1 text-lg font-semibold text-amber-700">{savedSummary.counts.F}</p>
                        </div>
                        <div className="rounded-xl bg-emerald-50 px-3 py-2">
                          <p className="text-xs uppercase tracking-[0.18em] text-emerald-700">V</p>
                          <p className="mt-1 text-lg font-semibold text-emerald-700">{savedSummary.counts.V}</p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {previewRows.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-600">
                      La vista previa aparecerá cuando selecciones un curso.
                    </div>
                  ) : (
                    previewRows.map((row) => (
                      <div key={row.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{row.description}</p>
                            <p className="mt-1 text-xs text-slate-600">{row.competencyName}</p>
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
