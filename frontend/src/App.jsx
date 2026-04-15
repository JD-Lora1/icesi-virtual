import { useEffect, useMemo, useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
const LEVELS = ['I', 'F', 'V']

async function apiRequest(path, options = {}) {
  const config = {
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    ...options,
  }

  const response = await fetch(`${API_BASE_URL}${path}`, config)
  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json') ? await response.json() : null

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.errors?.[Object.keys(payload?.errors || {})[0]]?.[0] ||
      `Error ${response.status}`
    throw new Error(message)
  }

  return payload
}

function emptyFilters() {
  return {
    program_id: '',
    competency_id: '',
    objective_id: '',
    contribution_level: '',
  }
}

function getCourseObjectives(course) {
  return course.learning_objectives || course.learningObjectives || []
}

function App() {
  const [theme, setTheme] = useState('light')
  const [activeView, setActiveView] = useState('inicio')
  const [programs, setPrograms] = useState([])
  const [competencies, setCompetencies] = useState([])
  const [objectives, setObjectives] = useState([])
  const [courses, setCourses] = useState([])
  const [stats, setStats] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [report, setReport] = useState(null)
  const [filters, setFilters] = useState(emptyFilters)

  const [programForm, setProgramForm] = useState({ id: null, name: '' })
  const [competencyForm, setCompetencyForm] = useState({ id: null, name: '', program_id: '' })
  const [objectiveForm, setObjectiveForm] = useState({ id: null, description: '', competency_id: '' })
  const [courseForm, setCourseForm] = useState({ id: null, name: '', program_id: '' })

  const [assignmentDraft, setAssignmentDraft] = useState([])
  const [assignmentInput, setAssignmentInput] = useState({ objective_id: '', contribution_level: 'I' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const courseOptionsObjectives = useMemo(() => {
    if (!courseForm.program_id) return objectives

    const competencyIds = new Set(
      competencies
        .filter((competency) => Number(competency.program_id) === Number(courseForm.program_id))
        .map((competency) => competency.id),
    )

    return objectives.filter((objective) => competencyIds.has(objective.competency_id))
  }, [competencies, courseForm.program_id, objectives])

  const quickKpis = useMemo(() => {
    const orphanObjectives = stats?.objectives_without_courses?.count || 0
    const bottlenecks = courses.filter((course) => getCourseObjectives(course).length >= 4).length
    const coherenceErrors = (analytics?.coherence_alerts || []).length

    return {
      orphanObjectives,
      bottlenecks,
      coherenceErrors,
      healthScore: Math.max(0, 100 - orphanObjectives * 8 - coherenceErrors * 6),
    }
  }, [stats, analytics, courses])

  const coberturaGeneral = report?.executive_summary?.coverage_percentage ?? 0
  const coberturaObjetivos = stats?.objectives_without_courses?.percentage ?? 0
  const coberturaCompetencias = stats?.competencies_without_objectives?.percentage ?? 0

  const distribucionNiveles = useMemo(() => {
    return (analytics?.domain_progress || []).reduce(
      (acc, item) => {
        acc.I += item.counts?.I || 0
        acc.F += item.counts?.F || 0
        acc.V += item.counts?.V || 0
        return acc
      },
      { I: 0, F: 0, V: 0 },
    )
  }, [analytics])

  const alertasPorSeveridad = useMemo(() => {
    return (analytics?.coherence_alerts || []).reduce(
      (acc, alert) => {
        if (alert.severity === 'high') acc.alta += 1
        else if (alert.severity === 'medium') acc.media += 1
        else acc.baja += 1
        return acc
      },
      { alta: 0, media: 0, baja: 0 },
    )
  }, [analytics])

  const loadCatalog = async () => {
    const [programData, competencyData, objectiveData] = await Promise.all([
      apiRequest('/programs'),
      apiRequest('/competencies'),
      apiRequest('/learning-objectives'),
    ])

    setPrograms(programData)
    setCompetencies(competencyData)
    setObjectives(objectiveData)
  }

  const loadCourses = async (nextFilters = filters) => {
    const query = new URLSearchParams(Object.entries(nextFilters).filter(([, value]) => value)).toString()
    const endpoint = query ? `/courses?${query}` : '/courses'
    const courseData = await apiRequest(endpoint)
    setCourses(courseData)
  }

  const loadAnalysis = async () => {
    const [statsData, analyticsData, reportData] = await Promise.all([
      apiRequest('/stats'),
      apiRequest('/stats/analytics'),
      apiRequest('/stats/report'),
    ])

    setStats(statsData)
    setAnalytics(analyticsData)
    setReport(reportData)
  }

  const reloadAll = async (nextFilters = filters) => {
    setError('')
    setLoading(true)
    try {
      await Promise.all([loadCatalog(), loadCourses(nextFilters), loadAnalysis()])
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reloadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetProgramForm = () => setProgramForm({ id: null, name: '' })
  const resetCompetencyForm = () => setCompetencyForm({ id: null, name: '', program_id: '' })
  const resetObjectiveForm = () => setObjectiveForm({ id: null, description: '', competency_id: '' })
  const resetCourseForm = () => {
    setCourseForm({ id: null, name: '', program_id: '' })
    setAssignmentDraft([])
    setAssignmentInput({ objective_id: '', contribution_level: 'I' })
  }

  const saveProgram = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const method = programForm.id ? 'PATCH' : 'POST'
      const path = programForm.id ? `/programs/${programForm.id}` : '/programs'
      await apiRequest(path, {
        method,
        body: JSON.stringify({ name: programForm.name }),
      })
      resetProgramForm()
      await reloadAll()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  const saveCompetency = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const method = competencyForm.id ? 'PATCH' : 'POST'
      const path = competencyForm.id ? `/competencies/${competencyForm.id}` : '/competencies'

      await apiRequest(path, {
        method,
        body: JSON.stringify({
          name: competencyForm.name,
          program_id: Number(competencyForm.program_id),
        }),
      })

      resetCompetencyForm()
      await reloadAll()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  const saveObjective = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const method = objectiveForm.id ? 'PATCH' : 'POST'
      const path = objectiveForm.id ? `/learning-objectives/${objectiveForm.id}` : '/learning-objectives'

      await apiRequest(path, {
        method,
        body: JSON.stringify({
          description: objectiveForm.description,
          competency_id: Number(objectiveForm.competency_id),
        }),
      })

      resetObjectiveForm()
      await reloadAll()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  const saveCourse = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const method = courseForm.id ? 'PATCH' : 'POST'
      const path = courseForm.id ? `/courses/${courseForm.id}` : '/courses'
      const course = await apiRequest(path, {
        method,
        body: JSON.stringify({
          name: courseForm.name,
          program_id: Number(courseForm.program_id),
        }),
      })

      await apiRequest(`/courses/${course.id}/objectives`, {
        method: 'POST',
        body: JSON.stringify({
          objective_assignments: assignmentDraft.map((entry) => ({
            objective_id: Number(entry.objective_id),
            contribution_level: entry.contribution_level,
          })),
        }),
      })

      resetCourseForm()
      await reloadAll()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteEntity = async (path, message) => {
    if (!window.confirm(message)) return

    setSaving(true)
    setError('')

    try {
      await apiRequest(path, { method: 'DELETE' })
      await reloadAll()
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setSaving(false)
    }
  }

  const startCourseEdit = (course) => {
    setCourseForm({ id: course.id, name: course.name, program_id: String(course.program_id) })
    setAssignmentDraft(
      getCourseObjectives(course).map((item) => ({
        objective_id: item.id,
        contribution_level: item.pivot?.contribution_level || 'I',
      })),
    )
    setActiveView('crud')
  }

  const addAssignment = () => {
    if (!assignmentInput.objective_id) return

    const exists = assignmentDraft.some(
      (entry) => Number(entry.objective_id) === Number(assignmentInput.objective_id),
    )

    if (exists) {
      setError('El objetivo ya esta asignado en este curso.')
      return
    }

    setAssignmentDraft((current) => [...current, assignmentInput])
    setAssignmentInput({ objective_id: '', contribution_level: 'I' })
  }

  const removeAssignment = (objectiveId) => {
    setAssignmentDraft((current) =>
      current.filter((entry) => Number(entry.objective_id) !== Number(objectiveId)),
    )
  }

  const updateFilter = async (key, value) => {
    const nextFilters = { ...filters, [key]: value }
    setFilters(nextFilters)
    setLoading(true)
    setError('')

    try {
      await loadCourses(nextFilters)
    } catch (filterError) {
      setError(filterError.message)
    } finally {
      setLoading(false)
    }
  }

  const resetFilters = async () => {
    const nextFilters = emptyFilters()
    setFilters(nextFilters)
    setLoading(true)

    try {
      await loadCourses(nextFilters)
    } catch (resetError) {
      setError(resetError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`ss-app theme-${theme}`}>
      <aside className="ss-sidebar">
        <div className="ss-brand">
          <div className="ss-brand-icon">GC</div>
          <div>
            <h2>Versión</h2>
            <small>v4.2.0</small>
          </div>
        </div>

        <nav className="ss-nav">
          <button className={activeView === 'inicio' ? 'ss-nav-item active' : 'ss-nav-item'} onClick={() => setActiveView('inicio')}>
            Inicio
          </button>
          <button className={activeView === 'map' ? 'ss-nav-item active' : 'ss-nav-item'} onClick={() => setActiveView('map')}>
            Vista detalle
          </button>
          <button className={activeView === 'objectives' ? 'ss-nav-item active' : 'ss-nav-item'} onClick={() => setActiveView('objectives')}>
            Objetivos
          </button>
          <button className={activeView === 'crud' ? 'ss-nav-item active' : 'ss-nav-item'} onClick={() => setActiveView('crud')}>
            Gestión académica
          </button>
        </nav>

        <div className="ss-sidebar-footer">
          <button className="ss-btn ss-btn-primary" onClick={() => reloadAll()} disabled={loading || saving}>
            Actualizar datos
          </button>
        </div>
      </aside>

      <section className="ss-shell">
        <header className="ss-topbar">
          <div>
            <p className="ss-overline">Icesi Virtual</p>
            <h1>Gestión curricular</h1>
          </div>
          <div className="ss-topbar-actions">
            <div className="ss-theme-switch" role="group" aria-label="Selector de tema">
              <button
                className={theme === 'light' ? 'ss-theme-btn active' : 'ss-theme-btn'}
                onClick={() => setTheme('light')}
                type="button"
              >
                Light
              </button>
              <button
                className={theme === 'black' ? 'ss-theme-btn active' : 'ss-theme-btn'}
                onClick={() => setTheme('black')}
                type="button"
              >
                Dark
              </button>
            </div>
            <div className="ss-health-box">
              <span>Estado general</span>
              <strong>Índice de salud: {quickKpis.healthScore}%</strong>
            </div>
          </div>
        </header>

        <div className={activeView === 'inicio' ? 'ss-body' : 'ss-body ss-body-single'}>
          <main className="ss-content">
            {error && <div className="ss-alert ss-alert-error">{error}</div>}

            {activeView === 'inicio' && (
              <section className="ss-inicio-grid">
                <article className="ss-card">
                  <h3>Panel de métricas y calidad</h3>
                  <div className="ss-donut-grid">
                    <div className="ss-donut-card">
                      <div className="ss-donut" style={{ '--valor': `${coberturaGeneral}%` }}>
                        <span>{coberturaGeneral}%</span>
                      </div>
                      <p>Cobertura curricular total</p>
                    </div>
                    <div className="ss-donut-card">
                      <div className="ss-donut ss-donut-warning" style={{ '--valor': `${Math.min(100, coberturaObjetivos)}%` }}>
                        <span>{coberturaObjetivos}%</span>
                      </div>
                      <p>Objetivos sin cursos</p>
                    </div>
                    <div className="ss-donut-card">
                      <div className="ss-donut ss-donut-danger" style={{ '--valor': `${Math.min(100, coberturaCompetencias)}%` }}>
                        <span>{coberturaCompetencias}%</span>
                      </div>
                      <p>Competencias sin objetivos</p>
                    </div>
                  </div>
                </article>

                <article className="ss-card">
                  <h3>Distribución de niveles I/F/V</h3>
                  <div className="ss-bars">
                    <div className="ss-bar-row">
                      <div className="ss-bar-head">
                        <span>Total consolidado</span>
                        <span>{distribucionNiveles.I + distribucionNiveles.F + distribucionNiveles.V} relaciones</span>
                      </div>
                      <div className="ss-bar-stack" role="img" aria-label="Distribución de niveles I F V">
                        <div className="ss-bar i" style={{ flexGrow: Math.max(distribucionNiveles.I, 0.4) }}>I {distribucionNiveles.I}</div>
                        <div className="ss-bar f" style={{ flexGrow: Math.max(distribucionNiveles.F, 0.4) }}>F {distribucionNiveles.F}</div>
                        <div className="ss-bar v" style={{ flexGrow: Math.max(distribucionNiveles.V, 0.4) }}>V {distribucionNiveles.V}</div>
                      </div>
                    </div>

                    {(analytics?.domain_progress || []).slice(0, 5).map((item) => (
                      <div key={item.competency_id} className="ss-bar-row">
                        <div className="ss-bar-head">
                          <span>{item.name}</span>
                          <span>{item.saturation_percentage}%</span>
                        </div>
                        <div className="ss-bar-stack" role="img" aria-label={`Niveles para ${item.name}`}>
                          <div className="ss-bar i" style={{ flexGrow: Math.max(item.counts.I, 0.4) }}>I {item.counts.I}</div>
                          <div className="ss-bar f" style={{ flexGrow: Math.max(item.counts.F, 0.4) }}>F {item.counts.F}</div>
                          <div className="ss-bar v" style={{ flexGrow: Math.max(item.counts.V, 0.4) }}>V {item.counts.V}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="ss-card">
                  <h3>Alertas por severidad</h3>
                  <div className="ss-mini-bars">
                    <div className="ss-mini-row">
                      <span>Alta</span>
                      <div className="ss-mini-track">
                        <div className="ss-mini-fill high" style={{ width: `${Math.min(100, alertasPorSeveridad.alta * 25)}%` }} />
                      </div>
                      <strong>{alertasPorSeveridad.alta}</strong>
                    </div>
                    <div className="ss-mini-row">
                      <span>Media</span>
                      <div className="ss-mini-track">
                        <div className="ss-mini-fill medium" style={{ width: `${Math.min(100, alertasPorSeveridad.media * 25)}%` }} />
                      </div>
                      <strong>{alertasPorSeveridad.media}</strong>
                    </div>
                    <div className="ss-mini-row">
                      <span>Baja</span>
                      <div className="ss-mini-track">
                        <div className="ss-mini-fill low" style={{ width: `${Math.min(100, alertasPorSeveridad.baja * 25)}%` }} />
                      </div>
                      <strong>{alertasPorSeveridad.baja}</strong>
                    </div>
                  </div>
                </article>

                <article className="ss-card">
                  <h3>Recomendaciones priorizadas</h3>
                  <div className="ss-priority-list">
                    {(report?.recommendations || []).slice(0, 4).map((recommendation, index) => (
                      <div key={recommendation.title} className="ss-priority-item">
                        <div className="ss-priority-head">
                          <strong>{recommendation.title}</strong>
                          <span>Prioridad {index + 1}</span>
                        </div>
                        <div className="ss-mini-track">
                          <div className="ss-mini-fill i" style={{ width: `${100 - index * 15}%` }} />
                        </div>
                        <p>{recommendation.text}</p>
                      </div>
                    ))}
                  </div>
                </article>
              </section>
            )}

            {activeView === 'map' && (
              <>
                <section className="ss-kpi-row">
                  <article className="ss-kpi-card">
                    <label>Huérfanos</label>
                    <strong>{quickKpis.orphanObjectives}</strong>
                  </article>
                  <article className="ss-kpi-card">
                    <label>Cuellos de botella</label>
                    <strong>{quickKpis.bottlenecks}</strong>
                  </article>
                  <article className="ss-kpi-card">
                    <label>Errores de coherencia</label>
                    <strong>{quickKpis.coherenceErrors}</strong>
                  </article>
                </section>

                <section className="ss-card">
                  <div className="ss-card-header">
                    <h3>Navegación inteligente</h3>
                    <button className="ss-btn ss-btn-ghost" onClick={resetFilters} disabled={loading}>
                      Limpiar filtros
                    </button>
                  </div>
                  <div className="ss-filters">
                    <label>
                      Programa
                      <select value={filters.program_id} onChange={(event) => updateFilter('program_id', event.target.value)}>
                        <option value="">Todos</option>
                        {programs.map((program) => (
                          <option key={program.id} value={program.id}>{program.name}</option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Competencia
                      <select value={filters.competency_id} onChange={(event) => updateFilter('competency_id', event.target.value)}>
                        <option value="">Todas</option>
                        {competencies.map((competency) => (
                          <option key={competency.id} value={competency.id}>{competency.name}</option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Objetivo
                      <select value={filters.objective_id} onChange={(event) => updateFilter('objective_id', event.target.value)}>
                        <option value="">Todos</option>
                        {objectives.map((objective) => (
                          <option key={objective.id} value={objective.id}>{objective.description.slice(0, 72)}</option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Nivel
                      <select value={filters.contribution_level} onChange={(event) => updateFilter('contribution_level', event.target.value)}>
                        <option value="">Todos</option>
                        {LEVELS.map((level) => (
                          <option key={level} value={level}>{level}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>

                <section className="ss-card">
                  <h3>Matriz curricular</h3>
                  <div className="ss-table-wrap">
                    <table className="ss-table">
                      <thead>
                        <tr>
                          <th>Cursos / asignaturas</th>
                          <th>Programa</th>
                          <th>Competencias y objetivos</th>
                          <th>Niveles</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {courses.map((course) => {
                          const courseObjectives = getCourseObjectives(course)

                          return (
                            <tr key={course.id}>
                              <td>
                                <strong>{course.name}</strong>
                              </td>
                              <td>{course.program?.name || 'Sin programa'}</td>
                              <td>
                                <div className="ss-token-list">
                                  {courseObjectives.length === 0 && <span className="ss-token muted">Sin objetivos</span>}
                                  {courseObjectives.map((objective) => (
                                    <span key={`${course.id}-${objective.id}`} className="ss-token">
                                      <strong>{objective.competency?.name || 'Competencia'}</strong>
                                      <small>{objective.description.slice(0, 55)}</small>
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td>
                                <div className="ss-level-group">
                                  {courseObjectives.map((objective) => (
                                    <span key={`lvl-${course.id}-${objective.id}`} className={`ss-level-pill lvl-${objective.pivot?.contribution_level || 'E'}`}>
                                      {objective.pivot?.contribution_level || '-'}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td>
                                <div className="ss-actions">
                                  <button className="ss-btn ss-btn-ghost" onClick={() => startCourseEdit(course)}>Editar</button>
                                  <button
                                    className="ss-btn ss-btn-danger"
                                    onClick={() => deleteEntity(`/courses/${course.id}`, 'Eliminar este curso quitara sus asignaciones. Deseas continuar?')}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}

                        {courses.length === 0 && (
                          <tr>
                            <td colSpan="5" className="ss-empty-row">No hay cursos para los filtros seleccionados.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}

            {activeView === 'objectives' && (
              <section className="ss-card">
                <h3>Gestor de objetivos</h3>
                <div className="ss-table-wrap">
                  <table className="ss-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Objetivo</th>
                        <th>Competencia</th>
                        <th>Cursos</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {objectives.map((objective) => {
                        const linkedCourses = courses.filter((course) =>
                          getCourseObjectives(course).some((item) => item.id === objective.id),
                        )

                        return (
                          <tr key={objective.id}>
                            <td>OBJ-{objective.id}</td>
                            <td>{objective.description}</td>
                            <td>{objective.competency?.name || 'Sin competencia'}</td>
                            <td>{linkedCourses.length}</td>
                            <td>
                              <span className={linkedCourses.length > 0 ? 'ss-badge ok' : 'ss-badge danger'}>
                                {linkedCourses.length > 0 ? 'Cubierto' : 'No cubierto'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeView === 'crud' && (
              <section className="ss-crud-grid">
                <article className="ss-card">
                  <h3>Programas</h3>
                  <form onSubmit={saveProgram} className="ss-form">
                    <input value={programForm.name} onChange={(event) => setProgramForm({ ...programForm, name: event.target.value })} placeholder="Nombre del programa" required />
                    <div className="ss-actions">
                      <button className="ss-btn ss-btn-primary" type="submit" disabled={saving}>{programForm.id ? 'Actualizar' : 'Crear'}</button>
                      {programForm.id && <button className="ss-btn ss-btn-ghost" type="button" onClick={resetProgramForm}>Cancelar</button>}
                    </div>
                  </form>
                  <ul className="ss-list">
                    {programs.map((program) => (
                      <li key={program.id}>
                        <div>
                          <strong>{program.name}</strong>
                          <small>{program.courses_count || 0} cursos · {program.competencies_count || 0} competencias</small>
                        </div>
                        <div className="ss-actions">
                          <button className="ss-btn ss-btn-ghost" onClick={() => setProgramForm({ id: program.id, name: program.name })}>Editar</button>
                          <button className="ss-btn ss-btn-danger" onClick={() => deleteEntity(`/programs/${program.id}`, 'Eliminar programa?')}>Eliminar</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </article>

                <article className="ss-card">
                  <h3>Competencias</h3>
                  <form onSubmit={saveCompetency} className="ss-form">
                    <input value={competencyForm.name} onChange={(event) => setCompetencyForm({ ...competencyForm, name: event.target.value })} placeholder="Nombre de la competencia" required />
                    <select value={competencyForm.program_id} onChange={(event) => setCompetencyForm({ ...competencyForm, program_id: event.target.value })} required>
                      <option value="">Programa</option>
                      {programs.map((program) => (
                        <option key={program.id} value={program.id}>{program.name}</option>
                      ))}
                    </select>
                    <div className="ss-actions">
                      <button className="ss-btn ss-btn-primary" type="submit" disabled={saving}>{competencyForm.id ? 'Actualizar' : 'Crear'}</button>
                      {competencyForm.id && <button className="ss-btn ss-btn-ghost" type="button" onClick={resetCompetencyForm}>Cancelar</button>}
                    </div>
                  </form>
                  <ul className="ss-list">
                    {competencies.map((competency) => (
                      <li key={competency.id}>
                        <div>
                          <strong>{competency.name}</strong>
                          <small>{programs.find((program) => program.id === competency.program_id)?.name || 'Sin programa'}</small>
                        </div>
                        <div className="ss-actions">
                          <button className="ss-btn ss-btn-ghost" onClick={() => setCompetencyForm({ id: competency.id, name: competency.name, program_id: String(competency.program_id) })}>Editar</button>
                          <button className="ss-btn ss-btn-danger" onClick={() => deleteEntity(`/competencies/${competency.id}`, 'Eliminar competencia?')}>Eliminar</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </article>

                <article className="ss-card">
                  <h3>Objetivos</h3>
                  <form onSubmit={saveObjective} className="ss-form">
                    <textarea value={objectiveForm.description} onChange={(event) => setObjectiveForm({ ...objectiveForm, description: event.target.value })} placeholder="Descripcion del objetivo" required />
                    <select value={objectiveForm.competency_id} onChange={(event) => setObjectiveForm({ ...objectiveForm, competency_id: event.target.value })} required>
                      <option value="">Competencia</option>
                      {competencies.map((competency) => (
                        <option key={competency.id} value={competency.id}>{competency.name}</option>
                      ))}
                    </select>
                    <div className="ss-actions">
                      <button className="ss-btn ss-btn-primary" type="submit" disabled={saving}>{objectiveForm.id ? 'Actualizar' : 'Crear'}</button>
                      {objectiveForm.id && <button className="ss-btn ss-btn-ghost" type="button" onClick={resetObjectiveForm}>Cancelar</button>}
                    </div>
                  </form>
                  <ul className="ss-list">
                    {objectives.map((objective) => (
                      <li key={objective.id}>
                        <div>
                          <strong>{objective.description.slice(0, 90)}</strong>
                          <small>{objective.competency?.name || 'Sin competencia'}</small>
                        </div>
                        <div className="ss-actions">
                          <button className="ss-btn ss-btn-ghost" onClick={() => setObjectiveForm({ id: objective.id, description: objective.description, competency_id: String(objective.competency_id) })}>Editar</button>
                          <button className="ss-btn ss-btn-danger" onClick={() => deleteEntity(`/learning-objectives/${objective.id}`, 'Eliminar objetivo?')}>Eliminar</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </article>

                <article className="ss-card ss-span-two">
                  <h3>Cursos y niveles I/F/V</h3>
                  <form onSubmit={saveCourse} className="ss-form">
                    <div className="ss-grid-two">
                      <input value={courseForm.name} onChange={(event) => setCourseForm({ ...courseForm, name: event.target.value })} placeholder="Nombre del curso" required />
                      <select value={courseForm.program_id} onChange={(event) => setCourseForm({ ...courseForm, program_id: event.target.value })} required>
                        <option value="">Programa</option>
                        {programs.map((program) => (
                          <option key={program.id} value={program.id}>{program.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="ss-assignment-builder">
                      <select value={assignmentInput.objective_id} onChange={(event) => setAssignmentInput({ ...assignmentInput, objective_id: event.target.value })}>
                        <option value="">Objetivo para asignar</option>
                        {courseOptionsObjectives.map((objective) => (
                          <option key={objective.id} value={objective.id}>{objective.description.slice(0, 58)}</option>
                        ))}
                      </select>

                      <select value={assignmentInput.contribution_level} onChange={(event) => setAssignmentInput({ ...assignmentInput, contribution_level: event.target.value })}>
                        {LEVELS.map((level) => (
                          <option key={level} value={level}>Nivel {level}</option>
                        ))}
                      </select>

                      <button className="ss-btn ss-btn-ghost" type="button" onClick={addAssignment}>Agregar</button>
                    </div>

                    <div className="ss-token-list compact">
                      {assignmentDraft.map((entry) => {
                        const objectiveName = objectives.find((objective) => objective.id === Number(entry.objective_id))?.description || `Objetivo ${entry.objective_id}`
                        return (
                          <span key={`draft-${entry.objective_id}`} className="ss-token">
                            <small>{objectiveName}</small>
                            <strong>{entry.contribution_level}</strong>
                            <button type="button" className="ss-token-remove" onClick={() => removeAssignment(entry.objective_id)}>x</button>
                          </span>
                        )
                      })}
                    </div>

                    <div className="ss-actions">
                      <button className="ss-btn ss-btn-primary" type="submit" disabled={saving}>{courseForm.id ? 'Actualizar' : 'Crear'}</button>
                      {courseForm.id && <button className="ss-btn ss-btn-ghost" type="button" onClick={resetCourseForm}>Cancelar</button>}
                    </div>
                  </form>
                </article>
              </section>
            )}
          </main>

          {activeView === 'inicio' && (
            <aside className="ss-right">
              <div className="ss-card">
                <h3>Cobertura KPI</h3>
                <div className="ss-donut-grid ss-donut-grid-side">
                  <div className="ss-donut-card">
                    <div className="ss-donut" style={{ '--valor': `${coberturaGeneral}%` }}>
                      <span>{coberturaGeneral}%</span>
                    </div>
                    <p>Cobertura total</p>
                  </div>
                  <div className="ss-donut-card">
                    <div className="ss-donut ss-donut-warning" style={{ '--valor': `${Math.min(100, coberturaObjetivos)}%` }}>
                      <span>{coberturaObjetivos}%</span>
                    </div>
                    <p>Objetivos sin cursos</p>
                  </div>
                </div>
                <button className="ss-btn ss-btn-primary" onClick={() => setActiveView('crud')}>Ir a gestión académica</button>
              </div>
            </aside>
          )}
        </div>
      </section>
    </div>
  )
}

export default App
