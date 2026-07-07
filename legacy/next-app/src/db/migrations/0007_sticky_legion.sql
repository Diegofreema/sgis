ALTER TABLE "admission_settings" ADD COLUMN "school_name" text DEFAULT 'Sankt Georg International School' NOT NULL;--> statement-breakpoint
ALTER TABLE "admission_settings" ADD COLUMN "school_email" text;--> statement-breakpoint
ALTER TABLE "admission_settings" ADD COLUMN "school_phone" text;--> statement-breakpoint
ALTER TABLE "admission_settings" ADD COLUMN "maintenance_mode" boolean DEFAULT false NOT NULL;--> statement-breakpoint
