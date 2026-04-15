import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getCourses,
  getCompetencies,
  getObjectives,
  getStats,
} from '../services/apiService.js';

const initialFilters = {
  programId: '',
  competencyId: '',
  level: '',
};

function normalizeId(value) {
  return value === '' || value === null || value === undefined ? '' : String(value);
}

function matchesProgram(course, programId) {
  if (!programId) {
    return true;
  }

  return normalizeId(course?.program?.id) === normalizeId(programId);
}

function matchesCompetency(course, competencyId) {
  if (!competencyId) {
    return true;
  }

  return (course?.learningObjectives ?? []).some((objective) => {
    return normalizeId(objective?.competency?.id) === normalizeId(competencyId);
  });
}

function matchesLevel(course, level) {
  if (!level) {
    return true;
  }

  return (course?.learningObjectives ?? []).some((objective) => {
    return normalizeId(objective?.pivot?.contribution_level) === normalizeId(level);
  });
}

export function useAcademicData() {
  const [courses, setCourses] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAcademicData = useCallback(async () => {
    setLoading(true);

    try {
      const [coursesData, competenciesData, objectivesData, statsData] = await Promise.all([
        getCourses(),
        getCompetencies(),
        getObjectives(),
        getStats(),
      ]);

      setCourses(coursesData);
      setCompetencies(competenciesData);
      setObjectives(objectivesData);
      setStats(statsData);
      setError('');
    } catch (requestError) {
      setError(requestError?.message || 'No fue posible cargar la matriz académica.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    loadAcademicData().finally(() => {
      if (!active) {
        return;
      }
    });

    return () => {
      active = false;
    };
  }, [loadAcademicData]);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      return (
        matchesProgram(course, filters.programId) &&
        matchesCompetency(course, filters.competencyId) &&
        matchesLevel(course, filters.level)
      );
    });
  }, [courses, filters]);

  const programOptions = useMemo(() => {
    return courses.reduce((options, course) => {
      const program = course?.program;
      if (!program) {
        return options;
      }

      if (!options.some((option) => normalizeId(option.id) === normalizeId(program.id))) {
        options.push(program);
      }

      return options;
    }, []);
  }, [courses]);

  const competencyOptions = useMemo(() => competencies, [competencies]);

  const levelOptions = useMemo(() => {
    const levels = new Set();

    courses.forEach((course) => {
      (course?.learningObjectives ?? []).forEach((objective) => {
        const level = objective?.pivot?.contribution_level;
        if (level) {
          levels.add(level);
        }
      });
    });

    return Array.from(levels).sort();
  }, [courses]);

  function setFilter(field, value) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  }

  function resetFilters() {
    setFilters(initialFilters);
  }

  return {
    courses,
    competencies,
    objectives,
    stats,
    filteredCourses,
    filters,
    programOptions,
    competencyOptions,
    levelOptions,
    loading,
    error,
    setFilter,
    resetFilters,
    refreshAcademicData: loadAcademicData,
  };
}
