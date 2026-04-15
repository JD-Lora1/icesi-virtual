<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Competency;
use App\Models\LearningObjective;
use Illuminate\Http\JsonResponse;

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

    private function percentage(int $partial, int $total): float
    {
        if ($total === 0) {
            return 0.0;
        }

        return round(($partial / $total) * 100, 2);
    }
}
