<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_objective_pivot', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
            $table->foreignId('objective_id')->constrained('learning_objectives')->cascadeOnDelete();
            $table->char('contribution_level', 1);
            $table->timestamps();

            $table->unique(['course_id', 'objective_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_objective_pivot');
    }
};
