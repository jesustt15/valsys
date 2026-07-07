-- Drop DEFAULT before renaming 'montado' (value literal would fail to cast after rename)
ALTER TABLE "gnc_cylinders" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint

-- Rename montado → instalado (pure rename, all existing rows)
ALTER TYPE "cylinder_status" RENAME VALUE 'montado' TO 'instalado';--> statement-breakpoint

-- Rename de_baja → condenado
ALTER TYPE "cylinder_status" RENAME VALUE 'de_baja' TO 'condenado';--> statement-breakpoint

-- Add reinstalado status (appends after condenado)
ALTER TYPE "cylinder_status" ADD VALUE 'reinstalado';--> statement-breakpoint

-- Restore DEFAULT with new name
ALTER TABLE "gnc_cylinders" ALTER COLUMN "status" SET DEFAULT 'instalado';--> statement-breakpoint

-- Add cita to inspection_status after por_programar
ALTER TYPE "inspection_status" ADD VALUE 'cita' AFTER 'por_programar';--> statement-breakpoint

-- Add appointment_date column to inspections
ALTER TABLE "inspections" ADD COLUMN "appointment_date" timestamp;--> statement-breakpoint

-- Create index on appointment_date
CREATE INDEX "idx_inspections_appointment_date" ON "inspections" USING btree ("appointment_date");
