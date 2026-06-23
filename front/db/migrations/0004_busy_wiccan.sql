-- Drop index on vin (will be replaced)
DROP INDEX IF EXISTS "idx_vehicles_vin";--> statement-breakpoint

-- Remove unique constraint on vin before dropping column
ALTER TABLE "vehicles" DROP CONSTRAINT "vehicles_vin_unique";--> statement-breakpoint

-- Drop vin column
ALTER TABLE "vehicles" DROP COLUMN IF EXISTS "vin";--> statement-breakpoint

-- Drop year column
ALTER TABLE "vehicles" DROP COLUMN IF EXISTS "year";--> statement-breakpoint

-- Add codigo_unico_gnc (nullable, unique)
ALTER TABLE "vehicles" ADD COLUMN "codigo_unico_gnc" varchar;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_codigo_unico_gnc_unique" UNIQUE ("codigo_unico_gnc");--> statement-breakpoint

-- Add marca_kit (nullable)
ALTER TABLE "vehicles" ADD COLUMN "marca_kit" varchar;--> statement-breakpoint

-- Create index for codigo_unico_gnc
CREATE INDEX "idx_vehicles_codigo_unico_gnc" ON "vehicles" USING btree ("codigo_unico_gnc");--> statement-breakpoint

-- Make km_current nullable in inspections
ALTER TABLE "inspections" ALTER COLUMN "km_current" DROP NOT NULL;--> statement-breakpoint

-- Make email nullable in users
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint

-- Add check constraint for notification related_entity_type
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_entity_type_check" CHECK ("related_entity_type" IN ('inspection', 'cylinder'));
