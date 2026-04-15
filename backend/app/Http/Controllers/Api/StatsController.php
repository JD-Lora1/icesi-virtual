<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Competency;
use App\Models\LearningObjective;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class StatsController extends Controller
{
    public function getStats(): JsonResponse
    {
        $totalObjectives = LearningObjective::count();
        $unassignedObjectives = LearningObjective::doesntHave('courses')->count();
        $totalCompetencies = Competency::count();
        $competenciesWithoutObjectives = Competency::doesntHave('learningObjectives')->count();

        return response()->json([
            'objectives_without_courses' => [
                'count' => $unassignedObjectives,
                'total' => $totalObjectives,
                'percentage' => $this->percentage($unassignedObjectives, $totalObjectives),
            ],
            'competencies_without_objectives' => [
                'count' => $competenciesWithoutObjectives,
                'total' => $totalCompetencies,
                'percentage' => $this->percentage($competenciesWithoutObjectives, $totalCompetencies),
            ],
        ]);
    }

    public function getAnalytics(): JsonResponse
    {
        $domainProgress = DB::table('competencies as c')
            ->leftJoin('learning_objectives as lo', 'lo.competency_id', '=', 'c.id')
            ->leftJoin('course_objective_pivot as cop', 'cop.objective_id', '=', 'lo.id')
            ->groupBy('c.id', 'c.name')
            ->orderBy('c.name')
            ->selectRaw('c.id')
            ->selectRaw('c.name')
            ->selectRaw("SUM(CASE WHEN cop.contribution_level = 'I' THEN 1 ELSE 0 END) AS level_i")
            ->selectRaw("SUM(CASE WHEN cop.contribution_level = 'F' THEN 1 ELSE 0 END) AS level_f")
            ->selectRaw("SUM(CASE WHEN cop.contribution_level = 'V' THEN 1 ELSE 0 END) AS level_v")
            ->selectRaw('COUNT(cop.objective_id) AS total')
            ->get()
            ->map(function ($row) {
                $total = (int) $row->total;
                $i = (int) $row->level_i;
                $f = (int) $row->level_f;
                $v = (int) $row->level_v;

                return [
                    'competency_id' => (int) $row->id,
                    'name' => $row->name,
                    'counts' => [
                        'I' => $i,
                        'F' => $f,
                        'V' => $v,
                        'total' => $total,
                    ],
                    'saturation_percentage' => $this->percentage($total, max($total, 1)),
                ];
            })
            ->values();

        $alerts = $this->buildAlerts();

        $workloadByCourse = Course::withCount('learningObjectives')
            ->with('program:id,name')
            ->orderBy('id')
            ->get()
            ->map(function (Course $course) {
                return [
                    'course_id' => $course->id,
                    'course_name' => $course->name,
                    'program_name' => $course->program?->name,
                    'objective_count' => $course->learning_objectives_count,
                ];
            })
            ->values();

        return response()->json([
            'domain_progress' => $domainProgress,
            'coherence_alerts' => $alerts,
            'workload_by_course' => $workloadByCourse,
        ]);
    }

    public function getReport(): JsonResponse
    {
        $totalObjectives = LearningObjective::count();
        $coveredObjectives = LearningObjective::has('courses')->count();

        $gapMap = LearningObjective::withCount('courses')
            ->orderByDesc('courses_count')
            ->orderBy('id')
            ->limit(6)
            ->get()
            ->map(function (LearningObjective $objective) {
                $levels = $objective->courses()
                    ->select('course_objective_pivot.contribution_level')
                    ->pluck('contribution_level')
                    ->filter()
                    ->values();

                $hasI = $levels->contains('I');
                $hasF = $levels->contains('F');
                $hasV = $levels->contains('V');

                return [
                    'objective_id' => $objective->id,
                    'objective_name' => $objective->description,
                    'levels' => [
                        $hasI,
                        $hasF,
                        $hasV,
                        $objective->courses_count >= 2,
                        $objective->courses_count >= 3,
                        $objective->courses_count >= 4,
                    ],
                ];
            })
            ->values();

        $recommendations = [
            [
                'title' => 'Alineacion del curso',
                'text' => 'Priorizar asignacion de objetivos sin curso en semestres base para reducir brechas tempranas.',
            ],
            [
                'title' => 'Estrategia puente',
                'text' => 'Agregar actividades de transicion para objetivos con cobertura parcial (I/F sin V).',
            ],
        ];

        return response()->json([
            'executive_summary' => [
                'total_objectives' => $totalObjectives,
                'covered_objectives' => $coveredObjectives,
                'coverage_percentage' => $this->percentage($coveredObjectives, $totalObjectives),
                'objectives_without_courses' => $totalObjectives - $coveredObjectives,
            ],
            'gap_map' => $gapMap,
            'recommendations' => $recommendations,
        ]);
    }

    private function buildAlerts(): array
    {
        $alerts = [];

        $orphanObjectives = LearningObjective::doesntHave('courses')->count();
        if ($orphanObjectives > 0) {
            $alerts[] = [
                'type' => 'Critical Conflict',
                'message' => "{$orphanObjectives} objetivos no tienen curso asociado.",
                'severity' => 'critical',
            ];
        }

        $emptyCompetencies = Competency::doesntHave('learningObjectives')->count();
        if ($emptyCompetencies > 0) {
            $alerts[] = [
                'type' => 'Coverage Gap',
                'message' => "{$emptyCompetencies} competencias no tienen objetivos definidos.",
                'severity' => 'warning',
            ];
        }

        $invalidProgression = DB::table('course_objective_pivot as cop')
            ->join('learning_objectives as lo', 'lo.id', '=', 'cop.objective_id')
            ->selectRaw('cop.course_id, lo.competency_id')
            ->groupBy('cop.course_id', 'lo.competency_id')
            ->havingRaw("SUM(CASE WHEN cop.contribution_level = 'V' THEN 1 ELSE 0 END) > 0")
            ->havingRaw("SUM(CASE WHEN cop.contribution_level IN ('I', 'F') THEN 1 ELSE 0 END) = 0")
            ->count();

        if ($invalidProgression > 0) {
            $alerts[] = [
                'type' => 'Progression Mismatch',
                'message' => "{$invalidProgression} combinaciones curso/competencia tienen solo nivel V sin base I/F.",
                'severity' => 'warning',
            ];
        }

        return $alerts;
    }

    private function percentage(int $partial, int $total): float
    {
        if ($total === 0) {
            return 0.0;
        }

        return round(($partial / $total) * 100, 2);
    }
}
