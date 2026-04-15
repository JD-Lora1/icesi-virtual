import { useEffect, useMemo, useRef, useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
const LEVELS = ['I', 'F', 'V']
const LEVEL_NAMES = {
  I: 'Inicial',
  F: 'Formativo',
  V: 'Avanzado',
}

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
    course_id: '',
    competency_id: '',
    objective_id: '',
    contribution_level: '',
  }
}

function getCourseObjectives(course) {
  return course.learning_objectives || course.learningObjectives || []
}

function cloneObjective(objective) {
  return {
    id: objective.id,
    description: objective.description,
    competency_id: objective.competency_id,
    competency: objective.competency ? { ...objective.competency } : undefined,
  }
}

function toPercent(part, total) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

function normalizeLevel(level) {
  const normalized = String(level || '').toUpperCase()
  return LEVELS.includes(normalized) ? normalized : 'I'
}

function getLevelName(level) {
  return LEVEL_NAMES[normalizeLevel(level)]
}

function formatLevelLabel(level, count, total) {
  return `${getLevelName(level)} - ${count} (${toPercent(count, total)}%)`
}

function formatMetric(value, digits = 2) {
  if (!Number.isFinite(value)) return '0.00'
  return value.toFixed(digits)
}

function getEditorPosition(position, estimatedWidth = 380, estimatedHeight = 320) {
  if (!position) {
    return { left: 32, top: 32 }
  }

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 720
  const margin = 16
  const preferredLeft = position.left + 16
  const preferredTop = position.top + 16
  const maxLeft = Math.max(margin, viewportWidth - estimatedWidth - margin)
  const maxTop = Math.max(margin, viewportHeight - estimatedHeight - margin)

  const left = Math.min(Math.max(preferredLeft, margin), maxLeft)
  let top = preferredTop

  if (preferredTop + estimatedHeight > viewportHeight - margin) {
    top = position.top - estimatedHeight - 16
  }

  return {
    left,
    top: Math.min(Math.max(top, margin), maxTop),
  }
}

function App() {
  const [theme, setTheme] = useState('light')
  const [activeView, setActiveView] = useState('inicio')

  const [programs, setPrograms] = useState([])
  const [competencies, setCompetencies] = useState([])
  const [objectives, setObjectives] = useState([])
  const [courses, setCourses] = useState([])
  const [filters, setFilters] = useState(emptyFilters)

  const [programForm, setProgramForm] = useState({ id: null, name: '' })
  const [competencyForm, setCompetencyForm] = useState({ id: null, name: '', program_id: '' })
  const [objectiveForm, setObjectiveForm] = useState({ id: null, description: '', competency_id: '' })
  const [courseForm, setCourseForm] = useState({ id: null, name: '', program_id: '' })

  const [assignmentDraft, setAssignmentDraft] = useState([])
  const [assignmentInput, setAssignmentInput] = useState({ objective_id: '', contribution_level: 'I' })

  const [isObjectivesEditing, setIsObjectivesEditing] = useState(false)
  const [isAddingObjective, setIsAddingObjective] = useState(false)
  const [newObjectiveDraft, setNewObjectiveDraft] = useState({ description: '', competency_id: '' })
  const [objectiveDrafts, setObjectiveDrafts] = useState({})

  const [selectedCrudProgramId, setSelectedCrudProgramId] = useState('')
  const [matrixEditor, setMatrixEditor] = useState(null)
  const [objectiveEditor, setObjectiveEditor] = useState(null)

  const [historyUndo, setHistoryUndo] = useState([])
  const [historyRedo, setHistoryRedo] = useState([])
  const [undoToast, setUndoToast] = useState(null)
  const undoToastTimerRef = useRef(null)

  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const pushHistory = (action, clearRedo = true) => {
    setHistoryUndo((current) => [...current, action].slice(-3))

    if (clearRedo) {
      setHistoryRedo([])
    }

    setUndoToast(action)

    if (undoToastTimerRef.current) {
      clearTimeout(undoToastTimerRef.current)
    }

    undoToastTimerRef.current = setTimeout(() => {
      setUndoToast(null)
      undoToastTimerRef.current = null
    }, 5000)
  }

  const executeUndo = async () => {
    if (historyUndo.length === 0 || saving) return

    const action = historyUndo[historyUndo.length - 1]

    setSaving(true)
    setError('')

    try {
      const redoAction = await action.undo()

      setHistoryUndo((current) => current.slice(0, -1))
      setHistoryRedo((current) => [...current, redoAction || action].slice(-3))
      setUndoToast(null)

      if (undoToastTimerRef.current) {
        clearTimeout(undoToastTimerRef.current)
        undoToastTimerRef.current = null
      }
    } catch (undoError) {
      setError(undoError.message)
    } finally {
      setSaving(false)
    }
  }

  const executeRedo = async () => {
    if (historyRedo.length === 0 || saving) return

    const action = historyRedo[historyRedo.length - 1]

    setSaving(true)
    setError('')

    try {
      const undoAction = await action.redo()

      setHistoryRedo((current) => current.slice(0, -1))
      setHistoryUndo((current) => [...current, undoAction || action].slice(-3))
      setUndoToast(action)

      if (undoToastTimerRef.current) {
        clearTimeout(undoToastTimerRef.current)
      }

      undoToastTimerRef.current = setTimeout(() => {
        setUndoToast(null)
        undoToastTimerRef.current = null
      }, 5000)
    } catch (redoError) {
      setError(redoError.message)
    } finally {
      setSaving(false)
    }
  }

  const displayedCourses = useMemo(() => {
    let nextCourses = courses

    if (filters.program_id) {
      nextCourses = nextCourses.filter((course) => Number(course.program_id) === Number(filters.program_id))
    }

    if (filters.course_id) {
      nextCourses = nextCourses.filter((course) => Number(course.id) === Number(filters.course_id))
    }

    if (filters.competency_id) {
      nextCourses = nextCourses.filter((course) =>
        getCourseObjectives(course).some(
          (objective) => Number(objective.competency_id) === Number(filters.competency_id),
        ),
      )
    }

    if (filters.objective_id) {
      nextCourses = nextCourses.filter((course) =>
        getCourseObjectives(course).some((objective) => Number(objective.id) === Number(filters.objective_id)),
      )
    }

    if (filters.contribution_level) {
      nextCourses = nextCourses.filter((course) =>
        getCourseObjectives(course).some(
          (objective) =>
            String(objective.pivot?.contribution_level || '').toUpperCase() ===
            String(filters.contribution_level).toUpperCase(),
        ),
      )
    }

    return nextCourses
  }, [courses, filters])

  const availableCoursesForFilters = useMemo(() => {
    let nextCourses = courses

    if (filters.program_id) {
      nextCourses = nextCourses.filter((course) => Number(course.program_id) === Number(filters.program_id))
    }

    if (filters.competency_id) {
      nextCourses = nextCourses.filter((course) =>
        getCourseObjectives(course).some((objective) => Number(objective.competency_id) === Number(filters.competency_id)),
      )
    }

    if (filters.objective_id) {
      nextCourses = nextCourses.filter((course) =>
        getCourseObjectives(course).some((objective) => Number(objective.id) === Number(filters.objective_id)),
      )
    }

    if (filters.contribution_level) {
      nextCourses = nextCourses.filter((course) =>
        getCourseObjectives(course).some(
          (objective) =>
            String(objective.pivot?.contribution_level || '').toUpperCase() ===
            String(filters.contribution_level).toUpperCase(),
        ),
      )
    }

    return nextCourses
  }, [courses, filters])

  const availableCompetenciesForFilters = useMemo(() => {
    let nextCompetencies = competencies

    if (filters.program_id) {
      nextCompetencies = nextCompetencies.filter((competency) => Number(competency.program_id) === Number(filters.program_id))
    }

    if (filters.course_id) {
      const competencyIdsInCourse = new Set(
        getCourseObjectives(displayedCourses.find((course) => Number(course.id) === Number(filters.course_id)) || { learning_objectives: [] })
          .map((objective) => Number(objective.competency_id)),
      )
      nextCompetencies = nextCompetencies.filter((competency) => competencyIdsInCourse.has(Number(competency.id)))
    }

    if (filters.objective_id) {
      const objective = objectives.find((item) => Number(item.id) === Number(filters.objective_id))
      if (objective) {
        nextCompetencies = nextCompetencies.filter((competency) => Number(competency.id) === Number(objective.competency_id))
      }
    }

    if (filters.contribution_level) {
      const competencyIdsWithLevel = new Set(
        displayedCourses.flatMap((course) =>
          getCourseObjectives(course)
            .filter(
              (objective) =>
                String(objective.pivot?.contribution_level || '').toUpperCase() ===
                String(filters.contribution_level).toUpperCase(),
            )
            .map((objective) => Number(objective.competency_id)),
        ),
      )
      nextCompetencies = nextCompetencies.filter((competency) => competencyIdsWithLevel.has(Number(competency.id)))
    }

    return nextCompetencies
  }, [competencies, displayedCourses, filters, objectives])

  const availableObjectivesForFilters = useMemo(() => {
    let nextObjectives = objectives

    if (filters.program_id) {
      const competencyIds = new Set(
        competencies
          .filter((competency) => Number(competency.program_id) === Number(filters.program_id))
          .map((competency) => Number(competency.id)),
      )
      nextObjectives = nextObjectives.filter((objective) => competencyIds.has(Number(objective.competency_id)))
    }

    if (filters.competency_id) {
      nextObjectives = nextObjectives.filter((objective) => Number(objective.competency_id) === Number(filters.competency_id))
    }

    if (filters.course_id) {
      const objectiveIdsInCourse = new Set(
        displayedCourses.flatMap((course) => getCourseObjectives(course).map((objective) => Number(objective.id))),
      )
      nextObjectives = nextObjectives.filter((objective) => objectiveIdsInCourse.has(Number(objective.id)))
    }

    if (filters.contribution_level) {
      nextObjectives = nextObjectives.filter((objective) =>
        displayedCourses.some((course) =>
          getCourseObjectives(course).some(
            (courseObjective) =>
              Number(courseObjective.id) === Number(objective.id) &&
              String(courseObjective.pivot?.contribution_level || '').toUpperCase() ===
                String(filters.contribution_level).toUpperCase(),
          ),
        ),
      )
    }

    return nextObjectives
  }, [competencies, displayedCourses, filters, objectives])

  const displayedObjectives = useMemo(() => {
    let nextObjectives = objectives

    if (filters.program_id) {
      const competencyIds = new Set(
        competencies
          .filter((competency) => Number(competency.program_id) === Number(filters.program_id))
          .map((competency) => competency.id),
      )
      nextObjectives = nextObjectives.filter((objective) => competencyIds.has(objective.competency_id))
    }

    if (filters.competency_id) {
      nextObjectives = nextObjectives.filter(
        (objective) => Number(objective.competency_id) === Number(filters.competency_id),
      )
    }

    if (filters.objective_id) {
      nextObjectives = nextObjectives.filter((objective) => Number(objective.id) === Number(filters.objective_id))
    }

    if (filters.course_id) {
      const objectiveIdsInCourse = new Set(
        displayedCourses.flatMap((course) => getCourseObjectives(course).map((objective) => objective.id)),
      )
      nextObjectives = nextObjectives.filter((objective) => objectiveIdsInCourse.has(objective.id))
    }

    return nextObjectives
  }, [competencies, displayedCourses, filters, objectives])

  const crudCompetencies = useMemo(() => {
    if (!selectedCrudProgramId) return competencies
    return competencies.filter((competency) => Number(competency.program_id) === Number(selectedCrudProgramId))
  }, [competencies, selectedCrudProgramId])

  const crudCompetencyIds = useMemo(() => new Set(crudCompetencies.map((competency) => competency.id)), [crudCompetencies])

  const crudObjectives = useMemo(() => {
    if (!selectedCrudProgramId) return objectives
    return objectives.filter((objective) => crudCompetencyIds.has(objective.competency_id))
  }, [crudCompetencyIds, objectives, selectedCrudProgramId])

  const crudCourses = useMemo(() => {
    if (!selectedCrudProgramId) return courses
    return courses.filter((course) => Number(course.program_id) === Number(selectedCrudProgramId))
  }, [courses, selectedCrudProgramId])

  const courseOptionsObjectives = useMemo(() => {
    const chosenProgramId = courseForm.program_id || selectedCrudProgramId
    if (!chosenProgramId) return objectives

    const competencyIds = new Set(
      competencies
        .filter((competency) => Number(competency.program_id) === Number(chosenProgramId))
        .map((competency) => competency.id),
    )

    return objectives.filter((objective) => competencyIds.has(objective.competency_id))
  }, [competencies, courseForm.program_id, objectives, selectedCrudProgramId])

  const getCourseObjectiveOptions = (course) => {
    const programId = course.program_id || selectedCrudProgramId
    if (!programId) return objectives

    const competencyIds = new Set(
      competencies
        .filter((competency) => Number(competency.program_id) === Number(programId))
        .map((competency) => competency.id),
    )

    return objectives.filter((objective) => competencyIds.has(objective.competency_id))
  }

  const openMatrixEditor = (course, assignment = null, position = null) => {
    const objective = assignment
      ? objectives.find((item) => Number(item.id) === Number(assignment.objective_id))
      : null

    setMatrixEditor({
      courseId: course.id,
      position: getEditorPosition(position, 380, 320),
      originalObjectiveId: assignment ? String(assignment.objective_id) : null,
      competency_id: objective ? String(objective.competency_id) : '',
      objective_id: assignment ? String(assignment.objective_id) : '',
      contribution_level: assignment ? normalizeLevel(assignment.contribution_level) : 'I',
    })
  }

  const closeMatrixEditor = () => setMatrixEditor(null)

  const saveMatrixEditor = async () => {
    if (!matrixEditor) return

    setSaving(true)
    setError('')

    try {
      const course = courses.find((item) => Number(item.id) === Number(matrixEditor.courseId))
      if (!course) throw new Error('No se encontró el curso seleccionado.')

      const currentAssignments = getCourseObjectives(course).map((objective) => ({
        objective_id: String(objective.id),
        contribution_level: normalizeLevel(objective.pivot?.contribution_level),
      }))

      const nextAssignments = currentAssignments.filter(
        (assignment) => String(assignment.objective_id) !== String(matrixEditor.originalObjectiveId),
      )

      if (matrixEditor.objective_id) {
        nextAssignments.push({
          objective_id: String(matrixEditor.objective_id),
          contribution_level: normalizeLevel(matrixEditor.contribution_level),
        })
      }

      await apiRequest(`/courses/${course.id}/objectives`, {
        method: 'POST',
        body: JSON.stringify({
          objective_assignments: nextAssignments.map((assignment) => ({
            objective_id: Number(assignment.objective_id),
            contribution_level: assignment.contribution_level,
          })),
        }),
      })

      setMatrixEditor(null)
      await reloadAll()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  const removeMatrixEditorAssignment = async () => {
    if (!matrixEditor) return

    setSaving(true)
    setError('')

    try {
      const course = courses.find((item) => Number(item.id) === Number(matrixEditor.courseId))
      if (!course) throw new Error('No se encontró el curso seleccionado.')

      const nextAssignments = getCourseObjectives(course)
        .map((objective) => ({
          objective_id: String(objective.id),
          contribution_level: normalizeLevel(objective.pivot?.contribution_level),
        }))
        .filter((assignment) => String(assignment.objective_id) !== String(matrixEditor.originalObjectiveId))

      await apiRequest(`/courses/${course.id}/objectives`, {
        method: 'POST',
        body: JSON.stringify({
          objective_assignments: nextAssignments.map((assignment) => ({
            objective_id: Number(assignment.objective_id),
            contribution_level: assignment.contribution_level,
          })),
        }),
      })

      setMatrixEditor(null)
      await reloadAll()
    } catch (removeError) {
      setError(removeError.message)
    } finally {
      setSaving(false)
    }
  }

  const openObjectiveEditor = (objective, position = null) => {
    setObjectiveEditor({
      objectiveId: objective.id,
      position: getEditorPosition(position, 420, 340),
      description: objective.description,
      competency_id: String(objective.competency_id ?? objective.competency?.id ?? ''),
    })
  }

  const closeObjectiveEditor = () => setObjectiveEditor(null)

  const removeObjectiveEditor = async () => {
    if (!objectiveEditorTarget) return

    if (!window.confirm(`Quitar el objetivo OBJ-${objectiveEditorTarget.id}? Esta acción se puede deshacer.`)) return

    try {
      await deleteObjectiveWithHistory(cloneObjective(objectiveEditorTarget))
      setObjectiveEditor(null)
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  const saveObjectiveEditor = async () => {
    if (!objectiveEditor) return

    setSaving(true)
    setError('')

    try {
      await updateObjectiveRequest(objectiveEditor.objectiveId, {
        description: objectiveEditor.description,
        competency_id: Number(objectiveEditor.competency_id),
      })

      setObjectiveEditor(null)
      await reloadAll()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  const objectiveUsageMap = useMemo(() => {
    const usage = new Map()

    displayedCourses.forEach((course) => {
      getCourseObjectives(course).forEach((objective) => {
        const key = Number(objective.id)
        usage.set(key, (usage.get(key) || 0) + 1)
      })
    })

    return usage
  }, [displayedCourses])

  const displayedCompetencies = useMemo(() => {
    if (filters.competency_id) {
      return competencies.filter((competency) => Number(competency.id) === Number(filters.competency_id))
    }

    if (displayedObjectives.length === 0) {
      return availableCompetenciesForFilters
    }

    const competencyIds = new Set(displayedObjectives.map((objective) => Number(objective.competency_id)))
    return availableCompetenciesForFilters.filter((competency) => competencyIds.has(Number(competency.id)))
  }, [availableCompetenciesForFilters, competencies, displayedObjectives, filters.competency_id])

  const objectivesWithoutCoursesCount = useMemo(
    () => displayedObjectives.filter((objective) => !objectiveUsageMap.has(Number(objective.id))).length,
    [displayedObjectives, objectiveUsageMap],
  )

  const competenciesWithoutObjectivesCount = useMemo(() => {
    const objectiveCompetencyIds = new Set(displayedObjectives.map((objective) => Number(objective.competency_id)))
    return displayedCompetencies.filter((competency) => !objectiveCompetencyIds.has(Number(competency.id))).length
  }, [displayedCompetencies, displayedObjectives])

  const coursesWithoutObjectivesCount = useMemo(
    () => displayedCourses.filter((course) => getCourseObjectives(course).length === 0).length,
    [displayedCourses],
  )

  const coverageSummary = useMemo(() => {
    const totalObjectives = displayedObjectives.length
    const totalCompetencies = displayedCompetencies.length
    const coveredObjectives = totalObjectives - objectivesWithoutCoursesCount
    const coveredCompetencies = totalCompetencies - competenciesWithoutObjectivesCount

    return {
      totalObjectives,
      totalCompetencies,
      coveredObjectives,
      coveredCompetencies,
      objectiveCoverage: toPercent(coveredObjectives, totalObjectives),
      objectiveWithoutCoursePct: toPercent(objectivesWithoutCoursesCount, totalObjectives),
      competencyWithoutObjectivePct: toPercent(competenciesWithoutObjectivesCount, totalCompetencies),
      globalCoverage: toPercent(
        coveredObjectives + coveredCompetencies,
        totalObjectives + totalCompetencies,
      ),
    }
  }, [
    competenciesWithoutObjectivesCount,
    displayedCompetencies.length,
    displayedObjectives.length,
    objectivesWithoutCoursesCount,
  ])

  const competencyLevelSeries = useMemo(() => {
    const byCompetency = new Map()

    displayedCompetencies.forEach((competency) => {
      byCompetency.set(Number(competency.id), {
        id: competency.id,
        name: competency.name,
        I: 0,
        F: 0,
        V: 0,
        total: 0,
      })
    })

    displayedCourses.forEach((course) => {
      getCourseObjectives(course).forEach((objective) => {
        const competencyId = Number(objective.competency_id)
        if (!byCompetency.has(competencyId)) return

        const entry = byCompetency.get(competencyId)
        const level = normalizeLevel(objective.pivot?.contribution_level)
        entry[level] += 1
        entry.total += 1
      })
    })

    return Array.from(byCompetency.values())
      .filter((entry) => entry.total > 0)
      .sort((a, b) => b.total - a.total)
  }, [displayedCompetencies, displayedCourses])

  const heatmapObjectives = useMemo(() => {
    if (displayedObjectives.length <= 12) return displayedObjectives

    return [...displayedObjectives]
      .sort((a, b) => {
        const usageA = objectiveUsageMap.get(Number(a.id)) || 0
        const usageB = objectiveUsageMap.get(Number(b.id)) || 0
        return usageB - usageA
      })
      .slice(0, 12)
  }, [displayedObjectives, objectiveUsageMap])

  const radarData = useMemo(() => {
    const base = competencyLevelSeries.length > 0 ? competencyLevelSeries : displayedCompetencies.map((competency) => ({
      id: competency.id,
      name: competency.name,
      I: 0,
      F: 0,
      V: 0,
      total: 0,
    }))

    const selected = base.slice(0, 5)
    const scored = selected.map((entry) => {
      const weighted = entry.I + entry.F * 2 + entry.V * 3
      const score = entry.total > 0 ? (weighted / (entry.total * 3)) * 10 : 0
      return {
        ...entry,
        score,
      }
    })

    const scores = scored.map((item) => item.score)
    const avg = scores.length ? scores.reduce((acc, value) => acc + value, 0) / scores.length : 0
    const deviation =
      scores.length > 1
        ? Math.sqrt(scores.reduce((acc, value) => acc + (value - avg) ** 2, 0) / scores.length) / 10
        : 0

    return {
      points: scored,
      cohesion: avg,
      deviation,
    }
  }, [competencyLevelSeries, displayedCompetencies])

  const radarPolygon = useMemo(() => {
    if (radarData.points.length === 0) return ''

    const center = 110
    const radius = 80

    return radarData.points
      .map((point, index) => {
        const angle = (-Math.PI / 2) + ((Math.PI * 2) / radarData.points.length) * index
        const distance = (point.score / 10) * radius
        const x = center + Math.cos(angle) * distance
        const y = center + Math.sin(angle) * distance
        return `${x},${y}`
      })
      .join(' ')
  }, [radarData.points])

  const radarAxes = useMemo(() => {
    if (radarData.points.length === 0) return []

    const center = 110
    const radius = 80

    return radarData.points.map((point, index) => {
      const angle = (-Math.PI / 2) + ((Math.PI * 2) / radarData.points.length) * index
      const x = center + Math.cos(angle) * radius
      const y = center + Math.sin(angle) * radius
      const labelX = center + Math.cos(angle) * (radius + 26)
      const labelY = center + Math.sin(angle) * (radius + 26)

      return {
        id: point.id,
        x,
        y,
        labelX,
        labelY,
        label: point.name,
      }
    })
  }, [radarData.points])

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

  const loadCourses = async () => {
    const courseData = await apiRequest('/courses')
    setCourses(courseData)
  }

  const reloadAll = async () => {
    setError('')
    try {
      await Promise.all([loadCatalog(), loadCourses()])
    } catch (loadError) {
      setError(loadError.message)
    }
  }

  useEffect(() => {
    reloadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedCrudProgramId && programs.length > 0) {
      setSelectedCrudProgramId(String(programs[0].id))
    }
  }, [programs, selectedCrudProgramId])

  useEffect(() => {
    document.body.classList.toggle('body-theme-light', theme === 'light')
    document.body.classList.toggle('body-theme-black', theme === 'black')

    return () => {
      document.body.classList.remove('body-theme-light', 'body-theme-black')
    }
  }, [theme])

  useEffect(() => {
    return () => {
      if (undoToastTimerRef.current) {
        clearTimeout(undoToastTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!selectedCrudProgramId) return

    if (!competencyForm.id && competencyForm.program_id !== selectedCrudProgramId) {
      setCompetencyForm((current) => ({ ...current, program_id: selectedCrudProgramId }))
    }

    if (!courseForm.id && courseForm.program_id !== selectedCrudProgramId) {
      setCourseForm((current) => ({ ...current, program_id: selectedCrudProgramId }))
    }
  }, [competencyForm.id, competencyForm.program_id, courseForm.id, courseForm.program_id, selectedCrudProgramId])

  const resetProgramForm = () => setProgramForm({ id: null, name: '' })
  const resetCompetencyForm = () => setCompetencyForm({ id: null, name: '', program_id: selectedCrudProgramId || '' })
  const resetObjectiveForm = () => setObjectiveForm({ id: null, description: '', competency_id: '' })
  const resetCourseForm = () => {
    setCourseForm({ id: null, name: '', program_id: selectedCrudProgramId || '' })
    setAssignmentDraft([])
    setAssignmentInput({ objective_id: '', contribution_level: 'I' })
  }

  const loadCourseIntoForm = (courseId) => {
    if (!courseId) {
      resetCourseForm()
      return
    }

    const selectedCourse = courses.find((course) => Number(course.id) === Number(courseId))
    if (!selectedCourse) return

    setCourseForm({
      id: selectedCourse.id,
      name: selectedCourse.name,
      program_id: String(selectedCourse.program_id ?? ''),
    })
    setAssignmentDraft(
      getCourseObjectives(selectedCourse).map((objective) => ({
        objective_id: String(objective.id),
        contribution_level: normalizeLevel(objective.pivot?.contribution_level),
      })),
    )
    setAssignmentInput({ objective_id: '', contribution_level: 'I' })
  }

  const saveProgram = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const isUpdate = Boolean(programForm.id)
      const previous = isUpdate
        ? programs.find((item) => Number(item.id) === Number(programForm.id))
        : null

      const method = isUpdate ? 'PATCH' : 'POST'
      const path = isUpdate ? `/programs/${programForm.id}` : '/programs'
      const saved = await apiRequest(path, {
        method,
        body: JSON.stringify({ name: programForm.name }),
      })

      if (isUpdate && previous) {
        pushHistory({
          label: `Programa ${saved.name}`,
          undo: async () => {
            await apiRequest(`/programs/${saved.id}`, {
              method: 'PATCH',
              body: JSON.stringify({ name: previous.name }),
            })
            return {
              label: `Programa ${saved.name}`,
              undo: async () => {},
              redo: async () => {},
            }
          },
          redo: async () => {
            await apiRequest(`/programs/${saved.id}`, {
              method: 'PATCH',
              body: JSON.stringify({ name: saved.name }),
            })
            return null
          },
        })
      }

      if (!isUpdate) {
        pushHistory({
          label: `Programa ${saved.name}`,
          undo: async () => {
            await apiRequest(`/programs/${saved.id}`, { method: 'DELETE' })
            return null
          },
          redo: async () => {
            await apiRequest('/programs', {
              method: 'POST',
              body: JSON.stringify({ name: saved.name }),
            })
            return null
          },
        })
      }

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
          program_id: Number(competencyForm.program_id || selectedCrudProgramId),
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
          program_id: Number(courseForm.program_id || selectedCrudProgramId),
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

  const buildProgramSnapshot = async (programId) => {
    const allCourses = await apiRequest('/courses')
    const program = programs.find((item) => Number(item.id) === Number(programId))
    const programCompetencies = competencies.filter((item) => Number(item.program_id) === Number(programId))
    const competencyIds = new Set(programCompetencies.map((item) => item.id))
    const programObjectives = objectives.filter((item) => competencyIds.has(item.competency_id))
    const objectiveIds = new Set(programObjectives.map((item) => item.id))
    const programCourses = allCourses.filter((item) => Number(item.program_id) === Number(programId))

    return {
      program,
      competencies: programCompetencies.map((item) => ({ id: item.id, name: item.name })),
      objectives: programObjectives.map((item) => ({
        id: item.id,
        description: item.description,
        competency_id: item.competency_id,
      })),
      courses: programCourses.map((course) => ({
        name: course.name,
        objectives: getCourseObjectives(course)
          .filter((objective) => objectiveIds.has(objective.id))
          .map((objective) => ({
            objective_id: objective.id,
            contribution_level: objective.pivot?.contribution_level || 'I',
          })),
      })),
    }
  }

  const restoreProgramSnapshot = async (snapshot) => {
    const restoredProgram = await apiRequest('/programs', {
      method: 'POST',
      body: JSON.stringify({ name: snapshot.program.name }),
    })

    const competencyIdMap = new Map()
    for (const competency of snapshot.competencies) {
      const restoredCompetency = await apiRequest('/competencies', {
        method: 'POST',
        body: JSON.stringify({
          name: competency.name,
          program_id: Number(restoredProgram.id),
        }),
      })
      competencyIdMap.set(competency.id, restoredCompetency.id)
    }

    const objectiveIdMap = new Map()
    for (const objective of snapshot.objectives) {
      const restoredObjective = await apiRequest('/learning-objectives', {
        method: 'POST',
        body: JSON.stringify({
          description: objective.description,
          competency_id: Number(competencyIdMap.get(objective.competency_id)),
        }),
      })
      objectiveIdMap.set(objective.id, restoredObjective.id)
    }

    for (const course of snapshot.courses) {
      const restoredCourse = await apiRequest('/courses', {
        method: 'POST',
        body: JSON.stringify({
          name: course.name,
          program_id: Number(restoredProgram.id),
        }),
      })

      if (course.objectives.length > 0) {
        await apiRequest(`/courses/${restoredCourse.id}/objectives`, {
          method: 'POST',
          body: JSON.stringify({
            objective_assignments: course.objectives
              .map((entry) => ({
                objective_id: Number(objectiveIdMap.get(entry.objective_id)),
                contribution_level: entry.contribution_level,
              }))
              .filter((entry) => Number.isFinite(entry.objective_id)),
          }),
        })
      }
    }

    return restoredProgram
  }

  const deleteEntity = async (path, message) => {
    if (!window.confirm(message)) return

    setSaving(true)
    setError('')

    try {
      const isProgramDelete = /^\/programs\/\d+$/.test(path)
      let snapshot = null

      if (isProgramDelete) {
        const programId = Number(path.split('/').pop())
        snapshot = await buildProgramSnapshot(programId)
      }

      await apiRequest(path, { method: 'DELETE' })

      if (isProgramDelete && snapshot?.program) {
        const action = {
          label: `Se eliminó Programa ${snapshot.program.name}`,
          undo: async () => {
            const restoredProgram = await restoreProgramSnapshot(snapshot)
            return {
              label: `Se eliminó Programa ${snapshot.program.name}`,
              undo: async () => {
                await apiRequest(`/programs/${restoredProgram.id}`, { method: 'DELETE' })
                return action
              },
              redo: async () => {
                await restoreProgramSnapshot(snapshot)
                return action
              },
            }
          },
          redo: async () => {
            return action
          },
        }

        pushHistory(action, true)
      }

      await reloadAll()
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setSaving(false)
    }
  }

  const addAssignment = () => {
    if (!assignmentInput.objective_id) return

    const exists = assignmentDraft.some(
      (entry) => Number(entry.objective_id) === Number(assignmentInput.objective_id),
    )

    if (exists) {
      setError('El objetivo ya está asignado en este curso.')
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

  const updateFilter = (key, value) => {
    const nextFilters = { ...filters, [key]: value }

    if (key === 'program_id') {
      nextFilters.course_id = ''
      nextFilters.competency_id = ''
      nextFilters.objective_id = ''
    }

    if (key === 'course_id') {
      nextFilters.objective_id = ''
    }

    if (key === 'competency_id') {
      nextFilters.objective_id = ''
    }

    setFilters(nextFilters)
  }

  const resetFilters = () => {
    setFilters(emptyFilters())
  }

  const startObjectivesEditing = () => {
    const drafts = Object.fromEntries(
      displayedObjectives.map((objective) => [
        objective.id,
        {
          description: objective.description,
          competency_id: String(objective.competency_id ?? objective.competency?.id ?? ''),
        },
      ]),
    )

    setObjectiveDrafts(drafts)
    setIsObjectivesEditing(true)
  }

  const cancelObjectivesEditing = () => {
    setIsObjectivesEditing(false)
    setObjectiveDrafts({})
  }

  const updateObjectiveDraft = (objectiveId, field, value) => {
    setObjectiveDrafts((current) => ({
      ...current,
      [objectiveId]: {
        ...current[objectiveId],
        [field]: value,
      },
    }))
  }

  const updateObjectiveRequest = async (objectiveId, payload) => {
    return apiRequest(`/learning-objectives/${objectiveId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  }

  const saveObjectivesEditing = async () => {
    const updates = displayedObjectives.filter((objective) => {
      const draft = objectiveDrafts[objective.id]
      if (!draft) return false

      return (
        draft.description !== objective.description ||
        Number(draft.competency_id) !== Number(objective.competency_id)
      )
    })

    setSaving(true)
    setError('')

    try {
      await Promise.all(
        updates.map((objective) => {
          const draft = objectiveDrafts[objective.id]
          return updateObjectiveRequest(objective.id, {
            description: draft.description,
            competency_id: Number(draft.competency_id),
          })
        }),
      )

      setIsObjectivesEditing(false)
      setObjectiveDrafts({})
      await reloadAll()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  const saveNewObjective = async () => {
    if (!newObjectiveDraft.description || !newObjectiveDraft.competency_id) {
      setError('Debes completar el nombre del objetivo y la competencia.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const createdObjective = await apiRequest('/learning-objectives', {
        method: 'POST',
        body: JSON.stringify({
          description: newObjectiveDraft.description,
          competency_id: Number(newObjectiveDraft.competency_id),
        }),
      })

      setHistoryUndo((current) => [
        ...current.slice(-2),
        {
          label: `Se creó objetivo ${createdObjective.id}`,
          undo: async () => {
            await apiRequest(`/learning-objectives/${createdObjective.id}`, { method: 'DELETE' })
            return null
          },
          redo: async () => {
            await apiRequest('/learning-objectives', {
              method: 'POST',
              body: JSON.stringify({
                description: createdObjective.description,
                competency_id: Number(createdObjective.competency_id),
              }),
            })
            return null
          },
        },
      ])
      setHistoryRedo([])

      setIsAddingObjective(false)
      setNewObjectiveDraft({ description: '', competency_id: '' })
      await reloadAll()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteObjectiveWithHistory = async (objective) => {
    const allCourses = await apiRequest('/courses')
    const relatedCourses = allCourses
      .filter((course) => getCourseObjectives(course).some((item) => item.id === objective.id))
      .map((course) => ({
        courseId: course.id,
        assignments: getCourseObjectives(course).map((item) => ({
          objective_id: item.id,
          contribution_level: item.pivot?.contribution_level || 'I',
        })),
      }))

    const message =
      relatedCourses.length > 0
        ? `Este objetivo tiene ${relatedCourses.length} cursos asociados. ¿Seguro que deseas eliminarlo?`
        : '¿Seguro que deseas eliminar este objetivo?'

    if (!window.confirm(message)) return

    setSaving(true)
    setError('')

    try {
      await apiRequest(`/learning-objectives/${objective.id}`, { method: 'DELETE' })

      const action = {
        label: `Se eliminó objetivo ${objective.id}`,
        undo: async () => {
          const restoredObjective = await apiRequest('/learning-objectives', {
            method: 'POST',
            body: JSON.stringify({
              description: objective.description,
              competency_id: Number(objective.competency_id),
            }),
          })

          const restoredObjectiveId = restoredObjective.id
          await Promise.all(
            relatedCourses.map((courseEntry) =>
              apiRequest(`/courses/${courseEntry.courseId}/objectives`, {
                method: 'POST',
                body: JSON.stringify({
                  objective_assignments: courseEntry.assignments.map((assignment) => ({
                    objective_id:
                      Number(assignment.objective_id) === Number(objective.id)
                        ? Number(restoredObjectiveId)
                        : Number(assignment.objective_id),
                    contribution_level: assignment.contribution_level,
                  })),
                }),
              }),
            ),
          )

          return {
            label: `Se eliminó objetivo ${objective.id}`,
            undo: action.undo,
            redo: async () => {
              await apiRequest(`/learning-objectives/${restoredObjectiveId}`, { method: 'DELETE' })
              return action
            },
          }
        },
        redo: async () => {
          await apiRequest(`/learning-objectives/${objective.id}`, { method: 'DELETE' })
          return action
        },
      }

      pushHistory(action, true)
      await reloadAll()
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setSaving(false)
    }
  }

  const matrixEditorCourse = matrixEditor
    ? courses.find((course) => Number(course.id) === Number(matrixEditor.courseId))
    : null

  const matrixEditorCompetencies = matrixEditorCourse
    ? competencies.filter((competency) => Number(competency.program_id) === Number(matrixEditorCourse.program_id))
    : []

  const matrixEditorObjectives = matrixEditorCourse
    ? objectives.filter((objective) => {
        const competencyMatches = !matrixEditor.competency_id || Number(objective.competency_id) === Number(matrixEditor.competency_id)
        const programMatches = Number(
          competencies.find((competency) => Number(competency.id) === Number(objective.competency_id))?.program_id,
        ) === Number(matrixEditorCourse.program_id)

        return competencyMatches && programMatches
      })
    : []

  const objectiveEditorTarget = objectiveEditor
    ? objectives.find((objective) => Number(objective.id) === Number(objectiveEditor.objectiveId))
    : null

  const objectiveEditorCompetencies = objectiveEditorTarget?.competency?.program_id
    ? competencies.filter((competency) => Number(competency.program_id) === Number(objectiveEditorTarget.competency?.program_id))
    : competencies

  return (
    <div className={`ss-app theme-${theme}`}>
      <section className="ss-shell">
        <header className="ss-topbar ss-topbar-sticky">
          <div className="ss-topbar-main">
            <div>
              <p className="ss-overline">Icesi Virtual</p>
              <button className="ss-home-link" onClick={() => setActiveView('inicio')}>
                Gestión curricular
              </button>
            </div>
            <div className="ss-topbar-actions">
              <button className={activeView === 'crud' ? 'ss-btn ss-btn-primary' : 'ss-btn ss-btn-ghost'} onClick={() => setActiveView('crud')}>
                Configuración
              </button>
            </div>
          </div>

          <div className="ss-topbar-filters">
            {activeView === 'inicio' ? (
              <div className="ss-topbar-filter-row">
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
                    Curso
                    <select value={filters.course_id} onChange={(event) => updateFilter('course_id', event.target.value)}>
                      <option value="">Todos</option>
                      {availableCoursesForFilters.map((course) => (
                        <option key={course.id} value={course.id}>{course.name}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Competencia
                    <select value={filters.competency_id} onChange={(event) => updateFilter('competency_id', event.target.value)}>
                      <option value="">Todas</option>
                      {availableCompetenciesForFilters.map((competency) => (
                        <option key={competency.id} value={competency.id}>{competency.name}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Objetivo
                    <select value={filters.objective_id} onChange={(event) => updateFilter('objective_id', event.target.value)}>
                      <option value="">Todos</option>
                      {availableObjectivesForFilters.map((objective) => (
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

                <div className="ss-topbar-secondary-actions">
                  <button className="ss-btn ss-btn-ghost" onClick={resetFilters}>
                    Limpiar filtros
                  </button>
                </div>
              </div>
            ) : (
              <div className="ss-topbar-filter-row ss-topbar-filter-row-actions-only">
                <div className="ss-topbar-secondary-actions">
                  <button className="ss-btn ss-btn-ghost" onClick={() => setActiveView('inicio')}>
                    Volver
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="ss-body ss-body-single">
          <main className="ss-content">
            {error && <div className="ss-alert ss-alert-error">{error}</div>}

            {activeView === 'inicio' && (
              <>
                <section className="ss-inicio-grid">
                  <article className="ss-card">
                    <h3>Panel de métricas y calidad</h3>
                    <div className="ss-donut-grid">
                      <div className="ss-donut-card">
                        <div className="ss-donut" style={{ '--valor': `${coverageSummary.globalCoverage}%` }}>
                          <span>{coverageSummary.globalCoverage}%</span>
                        </div>
                        <p>Cobertura global filtrada</p>
                      </div>
                      <div className="ss-donut-card">
                        <div className="ss-donut ss-donut-warning" style={{ '--valor': `${Math.min(100, coverageSummary.objectiveWithoutCoursePct)}%` }}>
                          <span>{coverageSummary.objectiveWithoutCoursePct}%</span>
                        </div>
                        <p>Objetivos sin cursos</p>
                        <small className="ss-donut-meta">
                          {objectivesWithoutCoursesCount} / {coverageSummary.totalObjectives}
                        </small>
                      </div>
                      <div className="ss-donut-card">
                        <div className="ss-donut ss-donut-danger" style={{ '--valor': `${Math.min(100, coverageSummary.competencyWithoutObjectivePct)}%` }}>
                          <span>{coverageSummary.competencyWithoutObjectivePct}%</span>
                        </div>
                        <p>Competencias sin objetivos</p>
                      </div>
                    </div>
                  </article>
                </section>

                <section className="ss-kpi-row">
                  <article className="ss-kpi-card">
                    <label>Total de cursos del programa</label>
                    <strong>{displayedCourses.length}</strong>
                    <small>{filters.program_id ? programs.find((program) => String(program.id) === String(filters.program_id))?.name || 'Programa activo' : 'Todos los programas'}</small>
                  </article>
                  <article className="ss-kpi-card">
                    <label>Total de competencias</label>
                    <strong>{displayedCompetencies.length}</strong>
                    <small>{filters.program_id ? 'Competencias del programa' : 'Todas las competencias'}</small>
                  </article>
                  <article className="ss-kpi-card">
                    <label>Cursos sin objetivos</label>
                    <strong>{coursesWithoutObjectivesCount}</strong>
                    <small>Cursos sin competencias asignadas</small>
                  </article>
                </section>

                <section className="ss-card">
                  <h3>Niveles por competencia</h3>
                  <p className="ss-section-help">Distribución de niveles I, F y V por competencia según los cursos filtrados.</p>
                  <div className="ss-level-chart">
                    {competencyLevelSeries.length === 0 && (
                      <p className="ss-empty-row">No hay asignaciones de niveles para los filtros actuales.</p>
                    )}

                    {competencyLevelSeries.map((entry) => (
                      <div key={`comp-level-${entry.id}`} className="ss-level-row">
                        <div className="ss-level-title" title={entry.name}>{entry.name}</div>
                        <div className="ss-level-stack">
                          <div className="ss-level-segment i" style={{ width: `${(entry.I / entry.total) * 100}%` }} title={formatLevelLabel('I', entry.I, entry.total)}>
                            {getLevelName('I')} - {entry.I} ({toPercent(entry.I, entry.total)}%)
                          </div>
                          <div className="ss-level-segment f" style={{ width: `${(entry.F / entry.total) * 100}%` }} title={formatLevelLabel('F', entry.F, entry.total)}>
                            {getLevelName('F')} - {entry.F} ({toPercent(entry.F, entry.total)}%)
                          </div>
                          <div className="ss-level-segment v" style={{ width: `${(entry.V / entry.total) * 100}%` }} title={formatLevelLabel('V', entry.V, entry.total)}>
                            {getLevelName('V')} - {entry.V} ({toPercent(entry.V, entry.total)}%)
                          </div>
                        </div>
                        <div className="ss-level-total">Total cursos {entry.total}</div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="ss-card">
                  <h3>Mapa de cursos por objetivo y nivel</h3>
                  <p className="ss-section-help">Filas: cursos. Columnas: objetivos. Cada celda muestra el nivel asociado (I/F/V).</p>
                  <div className="ss-heatmap-wrap">
                    <table className="ss-heatmap">
                      <thead>
                        <tr>
                          <th>Curso</th>
                          {heatmapObjectives.map((objective) => (
                            <th
                              key={`heat-head-${objective.id}`}
                              className="ss-heat-head"
                            >
                              <span className="ss-heat-head-label">OBJ-{objective.id}</span>
                              <span className="ss-heat-tooltip">{objective.description}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {displayedCourses.map((course) => {
                          const levelsByObjective = new Map(
                            getCourseObjectives(course).map((objective) => [
                              Number(objective.id),
                              normalizeLevel(objective.pivot?.contribution_level),
                            ]),
                          )

                          return (
                            <tr key={`heat-row-${course.id}`}>
                              <td className="ss-heat-course" title={course.name}>{course.name}</td>
                              {heatmapObjectives.map((objective) => {
                                const level = levelsByObjective.get(Number(objective.id))
                                return (
                                  <td key={`heat-cell-${course.id}-${objective.id}`} className="ss-heat-cell">
                                    {level ? (
                                      <span className={`ss-heat-chip lvl-${level}`}>{level}</span>
                                    ) : (
                                      <span className="ss-heat-dot" aria-hidden="true" />
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}

                        {displayedCourses.length === 0 && (
                          <tr>
                            <td colSpan={Math.max(2, heatmapObjectives.length + 1)} className="ss-empty-row">
                              No hay cursos para visualizar en el heatmap.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="ss-card ss-competency-balance">
                  <div>
                    <h3>Balance de competencias</h3>
                    <p className="ss-section-help">Radar de distribución por competencia basado en la mezcla de niveles I, F y V.</p>

                    <div className="ss-radar-wrap">
                      <svg viewBox="-24 -24 268 268" role="img" aria-label="Radar de competencias">
                        <circle cx="110" cy="110" r="80" className="ss-radar-grid" />
                        <circle cx="110" cy="110" r="53" className="ss-radar-grid" />
                        <circle cx="110" cy="110" r="26" className="ss-radar-grid" />

                        {radarAxes.map((axis) => (
                          <g key={`axis-${axis.id}`}>
                            <line x1="110" y1="110" x2={axis.x} y2={axis.y} className="ss-radar-axis" />
                            <text x={axis.labelX} y={axis.labelY} className="ss-radar-label" textAnchor="middle">
                              {axis.label.length > 14 ? `${axis.label.slice(0, 14)}...` : axis.label}
                            </text>
                          </g>
                        ))}

                        {radarPolygon && <polygon points={radarPolygon} className="ss-radar-shape" />}
                      </svg>
                    </div>
                  </div>

                  <div className="ss-radar-metrics">
                    <article>
                      <label>Cohesión</label>
                      <strong>{formatMetric(radarData.cohesion, 1)}</strong>
                    </article>
                    <article>
                      <label>Desviación</label>
                      <strong>{formatMetric(radarData.deviation, 2)}</strong>
                    </article>
                    <article>
                      <label>Objetivos cubiertos</label>
                      <strong>{coverageSummary.coveredObjectives}</strong>
                      <small>de {coverageSummary.totalObjectives}</small>
                    </article>
                  </div>
                </section>

                <section className="ss-card">
                  <div className="ss-card-header ss-objectives-header">
                    <h3>Matriz curricular</h3>
                  </div>
                  <div className="ss-table-wrap">
                    <table className="ss-table">
                      <thead>
                        <tr>
                          <th></th>
                          <th>Programa</th>
                          <th>Cursos / asignaturas</th>
                          <th>Competencias y objetivos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedCourses.map((course) => {
                          const courseObjectives = getCourseObjectives(course)
                          const matrixAssignments = courseObjectives.map((objective) => ({
                            objective_id: String(objective.id),
                            contribution_level: normalizeLevel(objective.pivot?.contribution_level),
                          }))

                          return (
                            <tr key={course.id}>
                              <td className="ss-matrix-plus-cell">
                                <button
                                  className="ss-matrix-plus-button"
                                  type="button"
                                  onClick={(event) => {
                                    const rect = event.currentTarget.getBoundingClientRect()
                                    openMatrixEditor(course, null, { left: rect.left, top: rect.bottom + 8 })
                                  }}
                                >
                                  +
                                </button>
                              </td>
                              <td>{course.program?.name || 'Sin programa'}</td>
                              <td><strong>{course.name}</strong></td>
                              <td>
                                <div className="ss-matrix-editor">
                                  {matrixAssignments.length === 0 && <span className="ss-token muted">Sin objetivos</span>}
                                  {matrixAssignments.map((assignment) => {
                                    const objective = objectives.find((item) => Number(item.id) === Number(assignment.objective_id))

                                    return (
                                      <div
                                        key={`${course.id}-${assignment.objective_id}`}
                                        className="ss-matrix-chip"
                                        onContextMenu={(event) => {
                                          event.preventDefault()
                                          openMatrixEditor(course, assignment, { left: event.clientX, top: event.clientY })
                                        }}
                                      >
                                        <div className="ss-matrix-chip-body">
                                          <strong>{objective?.competency?.name || 'Competencia'}</strong>
                                          <small>{objective?.description.slice(0, 55)}</small>
                                        </div>
                                        <span className={`ss-level-pill lvl-${assignment.contribution_level}`}>
                                          {getLevelName(assignment.contribution_level)}
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </td>
                            </tr>
                          )
                        })}

                        {displayedCourses.length === 0 && (
                          <tr>
                            <td colSpan="4" className="ss-empty-row">No hay cursos para los filtros seleccionados.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="ss-card">
                  <div className="ss-card-header ss-objectives-header">
                    <h3>Gestor de objetivos</h3>
                    <div className="ss-actions">
                      {isObjectivesEditing && (
                        <>
                          <button className="ss-btn ss-btn-save" onClick={saveObjectivesEditing} disabled={saving}>Guardar</button>
                          <button className="ss-btn ss-btn-cancel" onClick={cancelObjectivesEditing} disabled={saving}>Cancelar</button>
                        </>
                      )}
                      {isAddingObjective && (
                        <>
                          <button className="ss-btn ss-btn-primary" onClick={saveNewObjective} disabled={saving}>Guardar nuevo</button>
                          <button className="ss-btn ss-btn-ghost" onClick={() => {
                            setIsAddingObjective(false)
                            setNewObjectiveDraft({ description: '', competency_id: '' })
                          }} disabled={saving}>Cancelar</button>
                        </>
                      )}
                      <button className="ss-btn ss-btn-ghost" onClick={isObjectivesEditing ? cancelObjectivesEditing : startObjectivesEditing} disabled={saving}>
                        {isObjectivesEditing ? 'Editando' : 'Editar'}
                      </button>
                      <button className="ss-btn ss-btn-primary" onClick={() => setIsAddingObjective((current) => !current)} disabled={saving}>
                        + Añadir objetivo
                      </button>
                    </div>
                  </div>

                  <div className="ss-kpi-row">
                    <article className="ss-kpi-card">
                      <label>Objetivos sin cursos</label>
                      <strong>{coverageSummary.objectiveWithoutCoursePct}%</strong>
                      <small>{objectivesWithoutCoursesCount} / {coverageSummary.totalObjectives}</small>
                    </article>
                  </div>

                  <div className="ss-table-wrap">
                    <table className="ss-table">
                      <thead>
                        <tr>
                          <th>Programa</th>
                          <th>ID</th>
                          <th>Objetivo</th>
                          <th>Competencia</th>
                          <th>Cursos</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isAddingObjective && (
                          <tr>
                            <td>Programa</td>
                            <td>Nuevo</td>
                            <td>
                              <input
                                value={newObjectiveDraft.description}
                                onChange={(event) => setNewObjectiveDraft((current) => ({ ...current, description: event.target.value }))}
                                placeholder="Nombre del objetivo"
                              />
                            </td>
                            <td>
                              <select
                                value={newObjectiveDraft.competency_id}
                                onChange={(event) => setNewObjectiveDraft((current) => ({ ...current, competency_id: event.target.value }))}
                              >
                                <option value="">Competencia</option>
                                {crudCompetencies.map((competency) => (
                                  <option key={competency.id} value={competency.id}>{competency.name}</option>
                                ))}
                              </select>
                            </td>
                            <td>-</td>
                            <td><span className="ss-badge">Borrador</span></td>
                          </tr>
                        )}

                        {displayedObjectives.map((objective) => {
                          const linkedCourses = displayedCourses.filter((course) =>
                            getCourseObjectives(course).some((item) => item.id === objective.id),
                          )
                          const objectiveProgramName = objective.competency?.program?.name || 'Sin programa'

                          return (
                            <tr
                              key={objective.id}
                            >
                              <td>{objectiveProgramName}</td>
                              <td>OBJ-{objective.id}</td>
                              <td
                                className="ss-context-editable"
                                onContextMenu={(event) => {
                                  event.preventDefault()
                                  openObjectiveEditor(objective, { left: event.clientX, top: event.clientY })
                                }}
                              >
                                {isObjectivesEditing ? (
                                  <input
                                    value={objectiveDrafts[objective.id]?.description ?? objective.description}
                                    onChange={(event) => updateObjectiveDraft(objective.id, 'description', event.target.value)}
                                  />
                                ) : (
                                  objective.description
                                )}
                              </td>
                              <td
                                className="ss-context-editable"
                                onContextMenu={(event) => {
                                  event.preventDefault()
                                  openObjectiveEditor(objective, { left: event.clientX, top: event.clientY })
                                }}
                              >
                                {isObjectivesEditing ? (
                                  <select
                                    value={objectiveDrafts[objective.id]?.competency_id ?? String(objective.competency_id ?? objective.competency?.id ?? '')}
                                    onChange={(event) => updateObjectiveDraft(objective.id, 'competency_id', event.target.value)}
                                  >
                                    <option value="">Competencia</option>
                                    {crudCompetencies.map((competency) => (
                                      <option key={competency.id} value={competency.id}>{competency.name}</option>
                                    ))}
                                  </select>
                                ) : (
                                  objective.competency?.name || 'Sin competencia'
                                )}
                              </td>
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
              </>
            )}

            {activeView === 'crud' && (
              <section className="ss-crud-grid">
                <article className="ss-card ss-span-two">
                  <div className="ss-card-header">
                    <h3>Controles de configuración</h3>
                    <div className="ss-actions">
                      <button className="ss-btn ss-btn-ghost" onClick={executeUndo} disabled={saving || historyUndo.length === 0}>Deshacer</button>
                      <button className="ss-btn ss-btn-ghost" onClick={executeRedo} disabled={saving || historyRedo.length === 0}>Rehacer</button>
                    </div>
                  </div>
                  <div className="ss-theme-switch" role="group" aria-label="Selector de tema">
                    <button className={theme === 'light' ? 'ss-theme-btn active' : 'ss-theme-btn'} onClick={() => setTheme('light')} type="button">Light</button>
                    <button className={theme === 'black' ? 'ss-theme-btn active' : 'ss-theme-btn'} onClick={() => setTheme('black')} type="button">Black</button>
                  </div>
                </article>

                <article className="ss-card ss-span-two">
                  <div className="ss-card-header">
                    <h3>Selector de programa</h3>
                    <button className="ss-btn ss-btn-ghost" type="button" onClick={() => setSelectedCrudProgramId('')}>Ver todo</button>
                  </div>
                  <div className="ss-filters ss-crud-selector">
                    <label>
                      Programa
                      <select value={selectedCrudProgramId} onChange={(event) => setSelectedCrudProgramId(event.target.value)}>
                        <option value="">Todos los programas</option>
                        {programs.map((program) => (
                          <option key={program.id} value={program.id}>{program.name}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Cursos visibles
                      <input value={crudCourses.length} readOnly />
                    </label>
                    <label>
                      Competencias visibles
                      <input value={crudCompetencies.length} readOnly />
                    </label>
                    <label>
                      Objetivos visibles
                      <input value={crudObjectives.length} readOnly />
                    </label>
                  </div>
                </article>

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
                          <button className="ss-btn ss-btn-danger" onClick={() => deleteEntity(`/programs/${program.id}`, 'Eliminar este programa puede borrar cursos y competencias asociadas. ¿Deseas continuar?')}>Eliminar</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </article>

                <article className="ss-card">
                  <h3>Competencias</h3>
                  <form onSubmit={saveCompetency} className="ss-form">
                    <input value={competencyForm.name} onChange={(event) => setCompetencyForm({ ...competencyForm, name: event.target.value })} placeholder="Nombre de la competencia" required />
                    <select value={competencyForm.program_id || selectedCrudProgramId || ''} onChange={(event) => setCompetencyForm({ ...competencyForm, program_id: event.target.value })} required>
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
                    {crudCompetencies.map((competency) => (
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
                    <textarea value={objectiveForm.description} onChange={(event) => setObjectiveForm({ ...objectiveForm, description: event.target.value })} placeholder="Descripción del objetivo" required />
                    <select value={objectiveForm.competency_id} onChange={(event) => setObjectiveForm({ ...objectiveForm, competency_id: event.target.value })} required>
                      <option value="">Competencia</option>
                      {crudCompetencies.map((competency) => (
                        <option key={competency.id} value={competency.id}>{competency.name}</option>
                      ))}
                    </select>
                    <div className="ss-actions">
                      <button className="ss-btn ss-btn-primary" type="submit" disabled={saving}>{objectiveForm.id ? 'Actualizar' : 'Crear'}</button>
                      {objectiveForm.id && <button className="ss-btn ss-btn-ghost" type="button" onClick={resetObjectiveForm}>Cancelar</button>}
                    </div>
                  </form>
                  <ul className="ss-list">
                    {crudObjectives.map((objective) => (
                      <li key={objective.id}>
                        <div>
                          <strong>{objective.description.slice(0, 90)}</strong>
                          <small>{objective.competency?.name || 'Sin competencia'}</small>
                        </div>
                        <div className="ss-actions">
                          <button className="ss-btn ss-btn-ghost" onClick={() => setObjectiveForm({ id: objective.id, description: objective.description, competency_id: String(objective.competency_id) })}>Editar</button>
                          <button className="ss-btn ss-btn-danger" onClick={() => deleteObjectiveWithHistory(cloneObjective(objective))}>Eliminar</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </article>

                <article className="ss-card ss-span-two">
                  <h3>Cursos y niveles I/F/V</h3>
                  <form onSubmit={saveCourse} className="ss-form">
                    <div className="ss-grid-two">
                      <label className="ss-span-two">
                        Curso existente
                        <select value={courseForm.id || ''} onChange={(event) => loadCourseIntoForm(event.target.value)}>
                          <option value="">Crear nuevo curso</option>
                          {crudCourses.map((course) => (
                            <option key={course.id} value={course.id}>{course.name}</option>
                          ))}
                        </select>
                      </label>
                      <input value={courseForm.name} onChange={(event) => setCourseForm({ ...courseForm, name: event.target.value })} placeholder="Nombre del curso" required />
                      <select value={courseForm.program_id || selectedCrudProgramId || ''} onChange={(event) => setCourseForm({ ...courseForm, program_id: event.target.value })} required>
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
        </div>

        {matrixEditor && matrixEditorCourse && (
          <div className="ss-editor-overlay" onClick={closeMatrixEditor}>
            <div
              className="ss-editor-popover"
              style={{ left: `${matrixEditor.position?.left ?? 32}px`, top: `${matrixEditor.position?.top ?? 32}px` }}
              onClick={(event) => event.stopPropagation()}
            >
              <h4>{matrixEditor.originalObjectiveId ? 'Editar relación' : 'Agregar relación'}</h4>
              <label>
                Competencia
                <select
                  value={matrixEditor.competency_id}
                  onChange={(event) => setMatrixEditor((current) => ({ ...current, competency_id: event.target.value, objective_id: '' }))}
                >
                  <option value="">Selecciona una competencia</option>
                  {matrixEditorCompetencies.map((competency) => (
                    <option key={competency.id} value={competency.id}>{competency.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Objetivo
                <select
                  value={matrixEditor.objective_id}
                  onChange={(event) => setMatrixEditor((current) => ({ ...current, objective_id: event.target.value }))}
                >
                  <option value="">Selecciona un objetivo</option>
                  {matrixEditorObjectives.map((objective) => (
                    <option key={objective.id} value={objective.id}>{objective.description}</option>
                  ))}
                </select>
              </label>
              <label>
                Nivel
                <select
                  value={matrixEditor.contribution_level}
                  onChange={(event) => setMatrixEditor((current) => ({ ...current, contribution_level: event.target.value }))}
                >
                  {LEVELS.map((level) => (
                    <option key={level} value={level}>{getLevelName(level)}</option>
                  ))}
                </select>
              </label>
              <div className="ss-actions ss-editor-actions">
                {matrixEditor.originalObjectiveId && (
                  <button className="ss-btn ss-btn-danger" type="button" onClick={removeMatrixEditorAssignment} disabled={saving}>
                    Quitar
                  </button>
                )}
                <button className="ss-btn ss-btn-ghost" type="button" onClick={closeMatrixEditor} disabled={saving}>
                  Cancelar
                </button>
                <button className="ss-btn ss-btn-primary" type="button" onClick={saveMatrixEditor} disabled={saving || !matrixEditor.objective_id}>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {objectiveEditor && objectiveEditorTarget && (
          <div className="ss-editor-overlay" onClick={closeObjectiveEditor}>
            <div
              className="ss-editor-popover"
              style={{ left: `${objectiveEditor.position?.left ?? 32}px`, top: `${objectiveEditor.position?.top ?? 32}px` }}
              onClick={(event) => event.stopPropagation()}
            >
              <h4>Editar objetivo</h4>
              <label>
                Descripción
                <textarea
                  value={objectiveEditor.description}
                  onChange={(event) => setObjectiveEditor((current) => ({ ...current, description: event.target.value }))}
                />
              </label>
              <label>
                Competencia
                <select
                  value={objectiveEditor.competency_id}
                  onChange={(event) => setObjectiveEditor((current) => ({ ...current, competency_id: event.target.value }))}
                >
                  <option value="">Selecciona una competencia</option>
                  {objectiveEditorCompetencies.map((competency) => (
                    <option key={competency.id} value={competency.id}>{competency.name}</option>
                  ))}
                </select>
              </label>
              <p className="ss-editor-meta">
                {objectiveEditorTarget.competency?.program?.name || 'Sin programa'}
              </p>
              <div className="ss-actions ss-editor-actions">
                <button className="ss-btn ss-btn-danger" type="button" onClick={removeObjectiveEditor} disabled={saving}>
                  Quitar
                </button>
                <button className="ss-btn ss-btn-ghost" type="button" onClick={closeObjectiveEditor} disabled={saving}>
                  Cancelar
                </button>
                <button className="ss-btn ss-btn-primary" type="button" onClick={saveObjectiveEditor} disabled={saving || !objectiveEditor.competency_id}>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {undoToast && (
          <div className="ss-undo-toast" role="status" aria-live="polite">
            <p>{undoToast.label}</p>
            <button className="ss-btn ss-btn-save" onClick={executeUndo} disabled={saving || historyUndo.length === 0}>Deshacer</button>
          </div>
        )}
      </section>
    </div>
  )
}

export default App
