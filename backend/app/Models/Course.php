<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Course extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'program_id',
    ];

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }

    public function learningObjectives(): BelongsToMany
    {
        return $this->belongsToMany(
            LearningObjective::class,
            'course_objective_pivot',
            'course_id',
            'objective_id'
        )->withPivot('contribution_level')->withTimestamps();
    }
}
