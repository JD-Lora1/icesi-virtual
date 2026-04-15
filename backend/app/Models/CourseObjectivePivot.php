<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CourseObjectivePivot extends Model
{
    use HasFactory;

    protected $table = 'course_objective_pivot';

    protected $fillable = [
        'course_id',
        'objective_id',
        'contribution_level',
    ];

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function learningObjective(): BelongsTo
    {
        return $this->belongsTo(LearningObjective::class, 'objective_id');
    }
}
