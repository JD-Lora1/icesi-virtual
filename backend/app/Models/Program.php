<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Program extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
    ];

    public function competencies(): HasMany
    {
        return $this->hasMany(Competency::class);
    }

    public function courses(): HasMany
    {
        return $this->hasMany(Course::class);
    }
}
