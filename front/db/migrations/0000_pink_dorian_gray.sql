CREATE TYPE "public"."attachment_category" AS ENUM('initial', 'removal', 'post_mount', 'plant', 'signature');--> statement-breakpoint
CREATE TYPE "public"."cylinder_status" AS ENUM('montado', 'en_planta', 'pendiente_reinstalacion', 'de_baja');--> statement-breakpoint
CREATE TYPE "public"."inspection_status" AS ENUM('inspeccion_inicial', 'en_planta', 'finalizado');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'operator', 'viewer');--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inspection_id" uuid,
	"correlative_number" varchar NOT NULL,
	"plant_doc_key" varchar,
	"final_cert_key" varchar,
	"issue_date" date,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "certificates_correlative_number_unique" UNIQUE("correlative_number")
);
--> statement-breakpoint
CREATE TABLE "gnc_cylinders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid,
	"brand" varchar NOT NULL,
	"capacity" varchar NOT NULL,
	"initial_serial" varchar NOT NULL,
	"actual_serial" varchar,
	"status" "cylinder_status" DEFAULT 'montado',
	"recalification_date" date,
	"location" varchar NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inspection_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inspection_id" uuid,
	"section" varchar NOT NULL,
	"question_key" varchar NOT NULL,
	"answer" boolean,
	"observations" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inspection_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inspection_id" uuid,
	"file_name" varchar NOT NULL,
	"minio_key" varchar NOT NULL,
	"file_type" varchar NOT NULL,
	"file_size" integer,
	"category" "attachment_category" DEFAULT 'initial' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "inspection_attachments_minio_key_unique" UNIQUE("minio_key")
);
--> statement-breakpoint
CREATE TABLE "inspections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid,
	"operator_id" uuid,
	"owner_signature_id" uuid,
	"status" "inspection_status" DEFAULT 'inspeccion_inicial',
	"km_current" integer NOT NULL,
	"inspection_date" timestamp DEFAULT now(),
	"observations" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "owners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" varchar NOT NULL,
	"full_name" varchar NOT NULL,
	"phone" varchar,
	"email" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "owners_document_id_unique" UNIQUE("document_id")
);
--> statement-breakpoint
CREATE TABLE "signatures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"minio_key" varchar NOT NULL,
	"signed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "signatures_minio_key_unique" UNIQUE("minio_key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar NOT NULL,
	"full_name" varchar NOT NULL,
	"email" varchar NOT NULL,
	"password_hash" varchar NOT NULL,
	"role" "user_role" DEFAULT 'operator',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid,
	"registered_by" uuid,
	"vin" varchar NOT NULL,
	"license_plate" varchar NOT NULL,
	"vehicle_type" varchar NOT NULL,
	"brand" varchar,
	"model" varchar,
	"year" integer,
	"specific_attributes" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "vehicles_vin_unique" UNIQUE("vin"),
	CONSTRAINT "vehicles_license_plate_unique" UNIQUE("license_plate")
);
--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_inspection_id_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."inspections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gnc_cylinders" ADD CONSTRAINT "gnc_cylinders_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gnc_cylinders" ADD CONSTRAINT "gnc_cylinders_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_answers" ADD CONSTRAINT "inspection_answers_inspection_id_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."inspections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_attachments" ADD CONSTRAINT "inspection_attachments_inspection_id_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."inspections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_owner_signature_id_signatures_id_fk" FOREIGN KEY ("owner_signature_id") REFERENCES "public"."signatures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_certificates_correlative" ON "certificates" USING btree ("correlative_number");--> statement-breakpoint
CREATE INDEX "idx_certificates_inspection" ON "certificates" USING btree ("inspection_id");--> statement-breakpoint
CREATE INDEX "idx_cylinders_vehicle" ON "gnc_cylinders" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "idx_cylinders_serial" ON "gnc_cylinders" USING btree ("initial_serial","actual_serial");--> statement-breakpoint
CREATE INDEX "idx_answers_inspection" ON "inspection_answers" USING btree ("inspection_id");--> statement-breakpoint
CREATE INDEX "idx_attachments_inspection" ON "inspection_attachments" USING btree ("inspection_id");--> statement-breakpoint
CREATE INDEX "idx_attachments_category" ON "inspection_attachments" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_inspections_vehicle" ON "inspections" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "idx_inspections_status" ON "inspections" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_owners_document_id" ON "owners" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_vehicles_vin" ON "vehicles" USING btree ("vin");--> statement-breakpoint
CREATE INDEX "idx_vehicles_license_plate" ON "vehicles" USING btree ("license_plate");--> statement-breakpoint
CREATE INDEX "idx_vehicles_owner" ON "vehicles" USING btree ("owner_id");