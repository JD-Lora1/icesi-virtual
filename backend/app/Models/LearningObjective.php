<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class LearningObjective extends Model
{
    use HasFactory;

    protected $fillable = [
        'description',
        'competency_id',
    ];

    public function competency(): BelongsTo
    {
        return $this->belongsTo(Competency::class);
    }

    public function courses(): BelongsToMany
    {
        return $this->belongsToMany(
            Course::class,
            'course_objective_pivot',
            'objective_id',
            'course_id'
        )->withPivot('contribution_level')->withTimestamps();
    }
}
