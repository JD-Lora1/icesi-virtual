CREATE TABLE "programs" (
  "id" serial PRIMARY KEY,
  "name" varchar NOT NULL
);

CREATE TABLE "competencies" (
  "id" serial PRIMARY KEY,
  "name" varchar NOT NULL,
  "program_id" integer NOT NULL
);

CREATE TABLE "learning_objectives" (
  "id" serial PRIMARY KEY,
  "description" text NOT NULL,
  "competency_id" integer NOT NULL
);

CREATE TABLE "courses" (
  "id" serial PRIMARY KEY,
  "name" varchar NOT NULL,
  "program_id" integer NOT NULL
);

CREATE TABLE "course_objective_pivot" (
  "id" serial PRIMARY KEY,
  "course_id" integer NOT NULL,
  "objective_id" integer NOT NULL,
  "contribution_level" char(1) NOT NULL
);

COMMENT ON COLUMN "course_objective_pivot"."contribution_level" IS 'Values: I (Introduce), F (Fortify), V (Validate)';

ALTER TABLE "competencies" ADD FOREIGN KEY ("program_id") REFERENCES "programs" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "learning_objectives" ADD FOREIGN KEY ("competency_id") REFERENCES "competencies" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "courses" ADD FOREIGN KEY ("program_id") REFERENCES "programs" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "course_objective_pivot" ADD FOREIGN KEY ("course_id") REFERENCES "courses" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "course_objective_pivot" ADD FOREIGN KEY ("objective_id") REFERENCES "learning_objectives" ("id") DEFERRABLE INITIALLY IMMEDIATE;

-- Constratint to ensure contribution_level is one of the specified values
ALTER TABLE course_objective_pivot 
ADD CONSTRAINT check_contribution_level 
CHECK (contribution_level IN ('I', 'F', 'V'));
