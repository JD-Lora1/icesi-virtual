import { useState } from 'react';
import {
  createCompetency,
  createCourse,
  createObjective,
  deleteCompetency,
  deleteCourse,
  deleteObjective,
  updateCompetency,
  updateCourse,
  updateObjective,
} from '../services/apiService.js';

const tabs = [
  { id: 'courses', label: 'Cursos' },
  { id: 'competencies', label: 'Competencias' },
  { id: 'objectives', label: 'Objetivos' },
];

const initialCourseForm = { name: '', programId: '' };
const initialCompetencyForm = { name: '', programId: '' };
const initialObjectiveForm = { description: '', competencyId: '' };

function normalize(value) {
  return value === null || value === undefined ? '' : String(value);
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
        active
          ? 'bg-slate-900 text-white shadow-sm'
          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
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

function Input(props) {
  return (
    <input
      {...props}
      className={`h-11 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${
        props.className ?? ''
      }`}
    />
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

function Textarea(props) {
  return (
    <textarea
      {...props}
      className={`min-h-28 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${
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

function EmptyState({ children }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
      {children}
    </div>
  );
}

export default function AcademicManagement({
  courses,
  competencies,
  objectives,
  programOptions,
  loading,
  error,
  refreshAcademicData,
}) {
  const [activeTab, setActiveTab] = useState('courses');
  const [courseForm, setCourseForm] = useState(initialCourseForm);
  const [competencyForm, setCompetencyForm] = useState(initialCompetencyForm);
  const [objectiveForm, setObjectiveForm] = useState(initialObjectiveForm);
  const [courseErrors, setCourseErrors] = useState({});
  const [competencyErrors, setCompetencyErrors] = useState({});
  const [objectiveErrors, setObjectiveErrors] = useState({});
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [editingCompetencyId, setEditingCompetencyId] = useState(null);
  const [editingObjectiveId, setEditingObjectiveId] = useState(null);
  const [mutationError, setMutationError] = useState('');
  const [mutationSuccess, setMutationSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeTabLabel = tabs.find((tab) => tab.id === activeTab)?.label ?? 'Gestión';

  function handleError(error) {
    const responseData = error?.response?.data;

    if (responseData?.message) {
      return responseData.message;
    }

    if (responseData?.errors) {
      return Object.values(responseData.errors)
        .flat()
        .join(' ');
    }

    return error?.message || 'No fue posible completar la operación.';
  }

  function validateCourseForm() {
    const nextErrors = {};

    if (!courseForm.name.trim()) {
      nextErrors.name = 'El nombre del curso es obligatorio.';
    }

    if (!courseForm.programId) {
      nextErrors.programId = 'Debes seleccionar un programa.';
    }

    setCourseErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateCompetencyForm() {
    const nextErrors = {};

    if (!competencyForm.name.trim()) {
      nextErrors.name = 'El nombre de la competencia es obligatorio.';
    }

    if (!competencyForm.programId) {
      nextErrors.programId = 'Debes seleccionar un programa.';
    }

    setCompetencyErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateObjectiveForm() {
    const nextErrors = {};

    if (!objectiveForm.description.trim()) {
      nextErrors.description = 'La descripción del objetivo es obligatoria.';
    }

    if (!objectiveForm.competencyId) {
      nextErrors.competencyId = 'Debes seleccionar una competencia.';
    }

    setObjectiveErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function clearFeedback() {
    setMutationError('');
    setMutationSuccess('');
  }

  async function submitCourse(event) {
    event.preventDefault();
    clearFeedback();

    if (!validateCourseForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name: courseForm.name.trim(),
        program_id: Number(courseForm.programId),
      };

      if (editingCourseId) {
        await updateCourse(editingCourseId, payload);
        setMutationSuccess('Curso actualizado correctamente.');
      } else {
        await createCourse(payload);
        setMutationSuccess('Curso creado correctamente.');
      }

      setCourseForm(initialCourseForm);
      setEditingCourseId(null);
      await refreshAcademicData();
    } catch (error) {
      setMutationError(handleError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitCompetency(event) {
    event.preventDefault();
    clearFeedback();

    if (!validateCompetencyForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name: competencyForm.name.trim(),
        program_id: Number(competencyForm.programId),
      };

      if (editingCompetencyId) {
        await updateCompetency(editingCompetencyId, payload);
        setMutationSuccess('Competencia actualizada correctamente.');
      } else {
        await createCompetency(payload);
        setMutationSuccess('Competencia creada correctamente.');
      }

      setCompetencyForm(initialCompetencyForm);
      setEditingCompetencyId(null);
      await refreshAcademicData();
    } catch (error) {
      setMutationError(handleError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitObjective(event) {
    event.preventDefault();
    clearFeedback();

    if (!validateObjectiveForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        description: objectiveForm.description.trim(),
        competency_id: Number(objectiveForm.competencyId),
      };

      if (editingObjectiveId) {
        await updateObjective(editingObjectiveId, payload);
        setMutationSuccess('Objetivo actualizado correctamente.');
      } else {
        await createObjective(payload);
        setMutationSuccess('Objetivo creado correctamente.');
      }

      setObjectiveForm(initialObjectiveForm);
      setEditingObjectiveId(null);
      await refreshAcademicData();
    } catch (error) {
      setMutationError(handleError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEditCourse(course) {
    setActiveTab('courses');
    setCourseForm({
      name: course.name ?? '',
      programId: normalize(course.program_id ?? course.program?.id),
    });
    setEditingCourseId(course.id);
    setCourseErrors({});
    clearFeedback();
  }

  function startEditCompetency(competency) {
    setActiveTab('competencies');
    setCompetencyForm({
      name: competency.name ?? '',
      programId: normalize(competency.program_id ?? competency.program?.id),
    });
    setEditingCompetencyId(competency.id);
    setCompetencyErrors({});
    clearFeedback();
  }

  function startEditObjective(objective) {
    setActiveTab('objectives');
    setObjectiveForm({
      description: objective.description ?? '',
      competencyId: normalize(objective.competency_id ?? objective.competency?.id),
    });
    setEditingObjectiveId(objective.id);
    setObjectiveErrors({});
    clearFeedback();
  }

  async function removeCourse(course) {
    if (!window.confirm(`Eliminar el curso "${course.name}"?`)) {
      return;
    }

    clearFeedback();

    try {
      await deleteCourse(course.id);
      setMutationSuccess('Curso eliminado correctamente.');
      await refreshAcademicData();
    } catch (error) {
      setMutationError(handleError(error));
    }
  }

  async function removeCompetency(competency) {
    if (!window.confirm(`Eliminar la competencia "${competency.name}"?`)) {
      return;
    }

    clearFeedback();

    try {
      await deleteCompetency(competency.id);
      setMutationSuccess('Competencia eliminada correctamente.');
      await refreshAcademicData();
    } catch (error) {
      setMutationError(handleError(error));
    }
  }

  async function removeObjective(objective) {
    if (!window.confirm(`Eliminar el objetivo "${objective.description}"?`)) {
      return;
    }

    clearFeedback();

    try {
      await deleteObjective(objective.id);
      setMutationSuccess('Objetivo eliminado correctamente.');
      await refreshAcademicData();
    } catch (error) {
      setMutationError(handleError(error));
    }
  }

  const canCreatePrograms = programOptions.length > 0;

  const objectiveCompetencyOptions = competencies;

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.06)] sm:p-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Gestión</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">CRUD curricular</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Cambia entre Cursos, Competencias y Objetivos con pestañas. Los formularios validan campos vacíos y muestran
            errores de API cuando algo falla.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {tabs.map((tab) => (
            <TabButton key={tab.id} active={tab.id === activeTab} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </TabButton>
          ))}
        </div>
      </div>

      {mutationError ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {mutationError}
        </div>
      ) : null}

      {mutationSuccess ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {mutationSuccess}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="h-64 rounded-3xl border border-slate-200 bg-slate-50" />
          <div className="h-64 rounded-3xl border border-slate-200 bg-slate-50" />
        </div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
          {error}
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {activeTab === 'courses' && (
            <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <form className="rounded-3xl border border-slate-200 bg-slate-50 p-6" onSubmit={submitCourse}>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">{editingCourseId ? 'Editar curso' : 'Nuevo curso'}</h3>
                    <p className="text-sm text-slate-500">Nombre y programa son obligatorios.</p>
                  </div>
                  {editingCourseId ? (
                    <ActionButton
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setCourseForm(initialCourseForm);
                        setEditingCourseId(null);
                        setCourseErrors({});
                      }}
                    >
                      Cancelar
                    </ActionButton>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <Field label="Nombre del curso" error={courseErrors.name}>
                    <Input
                      value={courseForm.name}
                      onChange={(event) => setCourseForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Ej. Fundamentos de Programación"
                    />
                  </Field>

                  <Field label="Programa" error={courseErrors.programId}>
                    <Select
                      value={courseForm.programId}
                      onChange={(event) => setCourseForm((current) => ({ ...current, programId: event.target.value }))}
                      disabled={!canCreatePrograms}
                    >
                      <option value="">Selecciona un programa</option>
                      {programOptions.map((program) => (
                        <option key={program.id} value={program.id}>
                          {program.name}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  {!canCreatePrograms ? (
                    <EmptyState>Necesitas al menos un programa existente para crear cursos desde esta vista.</EmptyState>
                  ) : null}

                  <ActionButton type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Guardando...' : editingCourseId ? 'Actualizar curso' : 'Guardar curso'}
                  </ActionButton>
                </div>
              </form>

              <div className="rounded-3xl border border-slate-200 bg-white p-6">
                <h3 className="text-xl font-semibold text-slate-900">Cursos registrados</h3>
                <p className="mt-1 text-sm text-slate-500">Lista con edición y eliminación.</p>

                <div className="mt-5 space-y-3">
                  {courses.length === 0 ? (
                    <EmptyState>No hay cursos todavía.</EmptyState>
                  ) : (
                    courses.map((course) => (
                      <article key={course.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <h4 className="font-semibold text-slate-900">{course.name}</h4>
                            <p className="mt-1 text-sm text-slate-600">
                              Programa: {course?.program?.name ?? 'Sin programa'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              ID programa: {course?.program_id ?? course?.program?.id ?? '-'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <ActionButton type="button" variant="ghost" onClick={() => startEditCourse(course)}>
                              Editar
                            </ActionButton>
                            <ActionButton type="button" onClick={() => removeCourse(course)}>
                              Eliminar
                            </ActionButton>
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'competencies' && (
            <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <form className="rounded-3xl border border-slate-200 bg-slate-50 p-6" onSubmit={submitCompetency}>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">
                      {editingCompetencyId ? 'Editar competencia' : 'Nueva competencia'}
                    </h3>
                    <p className="text-sm text-slate-500">Nombre y programa son obligatorios.</p>
                  </div>
                  {editingCompetencyId ? (
                    <ActionButton
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setCompetencyForm(initialCompetencyForm);
                        setEditingCompetencyId(null);
                        setCompetencyErrors({});
                      }}
                    >
                      Cancelar
                    </ActionButton>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <Field label="Nombre de la competencia" error={competencyErrors.name}>
                    <Input
                      value={competencyForm.name}
                      onChange={(event) => setCompetencyForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Ej. Competencia 1"
                    />
                  </Field>

                  <Field label="Programa" error={competencyErrors.programId}>
                    <Select
                      value={competencyForm.programId}
                      onChange={(event) => setCompetencyForm((current) => ({ ...current, programId: event.target.value }))}
                      disabled={!canCreatePrograms}
                    >
                      <option value="">Selecciona un programa</option>
                      {programOptions.map((program) => (
                        <option key={program.id} value={program.id}>
                          {program.name}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  {!canCreatePrograms ? (
                    <EmptyState>Necesitas al menos un programa existente para crear competencias desde esta vista.</EmptyState>
                  ) : null}

                  <ActionButton type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Guardando...' : editingCompetencyId ? 'Actualizar competencia' : 'Guardar competencia'}
                  </ActionButton>
                </div>
              </form>

              <div className="rounded-3xl border border-slate-200 bg-white p-6">
                <h3 className="text-xl font-semibold text-slate-900">Competencias registradas</h3>
                <p className="mt-1 text-sm text-slate-500">Cada competencia pertenece a un programa.</p>

                <div className="mt-5 space-y-3">
                  {competencies.length === 0 ? (
                    <EmptyState>No hay competencias todavía.</EmptyState>
                  ) : (
                    competencies.map((competency) => (
                      <article key={competency.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <h4 className="font-semibold text-slate-900">{competency.name}</h4>
                            <p className="mt-1 text-sm text-slate-600">
                              Programa: {competency?.program?.name ?? 'Sin programa'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <ActionButton type="button" variant="ghost" onClick={() => startEditCompetency(competency)}>
                              Editar
                            </ActionButton>
                            <ActionButton type="button" onClick={() => removeCompetency(competency)}>
                              Eliminar
                            </ActionButton>
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'objectives' && (
            <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <form className="rounded-3xl border border-slate-200 bg-slate-50 p-6" onSubmit={submitObjective}>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">
                      {editingObjectiveId ? 'Editar objetivo' : 'Nuevo objetivo'}
                    </h3>
                    <p className="text-sm text-slate-500">La competencia es obligatoria para un objetivo nuevo.</p>
                  </div>
                  {editingObjectiveId ? (
                    <ActionButton
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setObjectiveForm(initialObjectiveForm);
                        setEditingObjectiveId(null);
                        setObjectiveErrors({});
                      }}
                    >
                      Cancelar
                    </ActionButton>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <Field label="Descripción del objetivo" error={objectiveErrors.description}>
                    <Textarea
                      value={objectiveForm.description}
                      onChange={(event) =>
                        setObjectiveForm((current) => ({ ...current, description: event.target.value }))
                      }
                      placeholder="Describe el objetivo de aprendizaje"
                    />
                  </Field>

                  <Field label="Competencia" error={objectiveErrors.competencyId}>
                    <Select
                      value={objectiveForm.competencyId}
                      onChange={(event) =>
                        setObjectiveForm((current) => ({ ...current, competencyId: event.target.value }))
                      }
                    >
                      <option value="">Selecciona una competencia</option>
                      {objectiveCompetencyOptions.map((competency) => (
                        <option key={competency.id} value={competency.id}>
                          {competency.name}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  {objectiveCompetencyOptions.length === 0 ? (
                    <EmptyState>Debes crear competencias antes de registrar objetivos.</EmptyState>
                  ) : null}

                  <ActionButton type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Guardando...' : editingObjectiveId ? 'Actualizar objetivo' : 'Guardar objetivo'}
                  </ActionButton>
                </div>
              </form>

              <div className="rounded-3xl border border-slate-200 bg-white p-6">
                <h3 className="text-xl font-semibold text-slate-900">Objetivos registrados</h3>
                <p className="mt-1 text-sm text-slate-500">Cada objetivo pertenece a una competencia.</p>

                <div className="mt-5 space-y-3">
                  {objectives.length === 0 ? (
                    <EmptyState>No hay objetivos todavía.</EmptyState>
                  ) : (
                    objectives.map((objective) => (
                      <article key={objective.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <h4 className="font-semibold text-slate-900">{objective.description}</h4>
                            <p className="mt-1 text-sm text-slate-600">
                              Competencia: {objective?.competency?.name ?? 'Sin competencia'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Curso(s) asociado(s): {objective?.courses?.length ?? 0}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <ActionButton type="button" variant="ghost" onClick={() => startEditObjective(objective)}>
                              Editar
                            </ActionButton>
                            <ActionButton type="button" onClick={() => removeObjective(objective)}>
                              Eliminar
                            </ActionButton>
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Tab activa: <span className="font-semibold text-slate-900">{activeTabLabel}</span>
          </div>
        </div>
      )}
    </section>
  );
}
