-- Data migration: map old enum values to new ones
UPDATE "inspections" SET "status" = 'recalificacion' WHERE "status"::text = 'en_planta';--> statement-breakpoint
UPDATE "inspections" SET "status" = 'certificado' WHERE "status"::text = 'finalizado';--> statement-breakpoint

-- Type swap: text → drop old type → create new type → cast back
ALTER TABLE "inspections" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "inspections" ALTER COLUMN "status" SET DEFAULT 'inspeccion_inicial'::text;--> statement-breakpoint
DROP TYPE IF EXISTS "public"."inspection_status";--> statement-breakpoint
CREATE TYPE "public"."inspection_status" AS ENUM('inspeccion_inicial', 'recalificacion', 'por_programar', 'certificado');--> statement-breakpoint
ALTER TABLE "inspections" ALTER COLUMN "status" SET DEFAULT 'inspeccion_inicial'::"public"."inspection_status";--> statement-breakpoint
ALTER TABLE "inspections" ALTER COLUMN "status" SET DATA TYPE "public"."inspection_status" USING "status"::"public"."inspection_status";