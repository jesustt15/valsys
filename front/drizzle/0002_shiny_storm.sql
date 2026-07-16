CREATE TYPE "public"."inspection_source" AS ENUM('gnc', 'utp');--> statement-breakpoint
ALTER TYPE "public"."cylinder_status" ADD VALUE 'desmontado' BEFORE 'en_planta';--> statement-breakpoint
ALTER TYPE "public"."inspection_status" ADD VALUE 'standby';--> statement-breakpoint
ALTER TABLE "inspections" ADD COLUMN "source" "inspection_source" DEFAULT 'gnc' NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_inspections_source" ON "inspections" USING btree ("source");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_owners_phone_unique" ON "owners" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_owners_email_unique" ON "owners" USING btree ("email");