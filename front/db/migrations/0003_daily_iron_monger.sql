CREATE TYPE "public"."document_type" AS ENUM('cedula', 'carnet');--> statement-breakpoint
CREATE TABLE "vehicle_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"type" "document_type" NOT NULL,
	"minio_key" varchar NOT NULL,
	"original_name" varchar,
	"uploaded_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "vehicle_documents" ADD CONSTRAINT "vehicle_documents_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_vehicle_docs_vehicle_type" ON "vehicle_documents" USING btree ("vehicle_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_vehicle_docs_minio_key" ON "vehicle_documents" USING btree ("minio_key");