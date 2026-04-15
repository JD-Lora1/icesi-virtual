BEGIN;

INSERT INTO programs (name)
VALUES ('INGENIERIA DE SISTEMAS');

INSERT INTO competencies (name, program_id)
VALUES
  ('Competencia 1', 1),
  ('Competencia 2', 1);

INSERT INTO learning_objectives (description, competency_id)
VALUES
  ('Construir algoritmos que resuelvan problemas simples.', 1),
  ('Implementar programas utilizando estructuras de control.', 1),
  ('Depurar codigo identificando errores sintacticos y logicos.', 1),
  ('Modelar problemas mediante clases y objetos.', 2),
  ('Aplicar principios de encapsulamiento, herencia y polimorfismo.', 2),
  ('Implementar aplicaciones modulares reutilizables.', 2);

INSERT INTO courses (name, program_id)
VALUES
  ('Fundamentos de Programacion', 1),
  ('Programacion Orientada a Objetos', 1),
  ('Estructuras de Datos', 1),
  ('Bases de Datos', 1),
  ('Ingenieria de Software', 1),
  ('Desarrollo Web', 1),
  ('Arquitectura de Software', 1),
  ('Pruebas de Software', 1),
  ('Desarrollo de Aplicaciones Moviles', 1),
  ('Proyecto Integrador de Software', 1);

INSERT INTO course_objective_pivot (course_id, objective_id, contribution_level)
VALUES
  (1, 1, 'I'),
  (1, 3, 'F'),

  (2, 2, 'I'),
  (2, 3, 'F'),
  (2, 4, 'V'),

  (4, 1, 'V'),
  (4, 3, 'F'),
  (4, 6, 'I'),

  (5, 2, 'F'),
  (5, 3, 'I'),

  (6, 4, 'I'),
  (6, 6, 'F'),

  (7, 1, 'F'),
  (7, 4, 'V'),

  (8, 2, 'V'),
  (8, 3, 'F'),

  (9, 1, 'I'),
  (9, 3, 'F'),

  (10, 2, 'I'),
  (10, 3, 'V'),
  (10, 6, 'F');

COMMIT;
