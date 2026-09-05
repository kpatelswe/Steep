DROP INDEX "digests_user_local_date_idx";--> statement-breakpoint
ALTER TABLE "digests" ADD COLUMN "kind" text DEFAULT 'scheduled' NOT NULL;--> statement-breakpoint
CREATE INDEX "digests_user_sent_idx" ON "digests" USING btree ("user_id","sent_at");--> statement-breakpoint
CREATE UNIQUE INDEX "digests_user_local_date_idx" ON "digests" USING btree ("user_id","local_date") WHERE "digests"."kind" = 'scheduled';