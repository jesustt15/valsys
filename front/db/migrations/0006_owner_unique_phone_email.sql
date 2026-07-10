-- Add unique indexes on phone and email for owners
-- PostgreSQL allows multiple NULLs in unique indexes, so optional fields work correctly.
CREATE UNIQUE INDEX "idx_owners_phone_unique" ON "owners" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_owners_email_unique" ON "owners" USING btree ("email");
