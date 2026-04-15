<?php

namespace Database\Seeders;

use App\Models\Competency;
use App\Models\Course;
use App\Models\LearningObjective;
use App\Models\Program;
use Illuminate\Database\Seeder;

class CurriculumSeeder extends Seeder
{
    public function run(): void
    {
        $program = Program::create([
            'name' => 'INGENIERIA DE SISTEMAS',
        ]);

        $competencyOne = Competency::create([
            'name' => 'Competencia 1',
            'program_id' => $program->id,
        ]);

        $competencyTwo = Competency::create([
            'name' => 'Competencia 2',
            'program_id' => $program->id,
        ]);

        $objectives = collect([
            ['description' => 'Construir algoritmos que resuelvan problemas simples.', 'competency_id' => $competencyOne->id],
            ['description' => 'Implementar programas utilizando estructuras de control.', 'competency_id' => $competencyOne->id],
            ['description' => 'Depurar codigo identificando errores sintacticos y logicos.', 'competency_id' => $competencyOne->id],
            ['description' => 'Modelar problemas mediante clases y objetos.', 'competency_id' => $competencyTwo->id],
            ['description' => 'Aplicar principios de encapsulamiento, herencia y polimorfismo.', 'competency_id' => $competencyTwo->id],
            ['description' => 'Implementar aplicaciones modulares reutilizables.', 'competency_id' => $competencyTwo->id],
        ])->map(fn (array $objectiveData) => LearningObjective::create($objectiveData));

        $courses = collect([
            'Fundamentos de Programacion',
            'Programacion Orientada a Objetos',
            'Estructuras de Datos',
            'Bases de Datos',
            'Ingenieria de Software',
            'Desarrollo Web',
            'Arquitectura de Software',
            'Pruebas de Software',
            'Desarrollo de Aplicaciones Moviles',
            'Proyecto Integrador de Software',
        ])->map(fn (string $courseName) => Course::create([
            'name' => $courseName,
            'program_id' => $program->id,
        ]));

        $pivotAssignments = [
            [0, 0, 'I'],
            [0, 2, 'F'],
            [1, 1, 'I'],
            [1, 2, 'F'],
            [1, 3, 'V'],
            [3, 0, 'V'],
            [3, 2, 'F'],
            [3, 5, 'I'],
            [4, 1, 'F'],
            [4, 2, 'I'],
            [5, 3, 'I'],
            [5, 5, 'F'],
            [6, 0, 'F'],
            [6, 3, 'V'],
            [7, 1, 'V'],
            [7, 2, 'F'],
            [8, 0, 'I'],
            [8, 2, 'F'],
            [9, 1, 'I'],
            [9, 2, 'V'],
            [9, 5, 'F'],
        ];

        foreach ($pivotAssignments as [$courseIndex, $objectiveIndex, $level]) {
            $courses[$courseIndex]->learningObjectives()->attach(
                $objectives[$objectiveIndex]->id,
                ['contribution_level' => $level]
            );
        }
    }
}
