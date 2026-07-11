CREATE TYPE "public"."capsule_status" AS ENUM('draft', 'scheduled', 'delivered', 'failed');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('text', 'image', 'audio', 'video');--> statement-breakpoint
CREATE TYPE "public"."delivery_channel" AS ENUM('email', 'sms', 'push');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."wall_visibility" AS ENUM('public', 'unlisted', 'private');--> statement-breakpoint
CREATE TABLE "capsule_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"capsule_id" uuid NOT NULL,
	"content_type" "content_type" NOT NULL,
	"content_text" text,
	"content_url" text,
	"uploadthing_key" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" uuid NOT NULL,
	"channel" "delivery_channel" NOT NULL,
	"status" "notification_status" DEFAULT 'pending' NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"failure_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipient" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"capsule_id" uuid NOT NULL,
	"name" text,
	"email" text,
	"phone" text,
	"channel" "delivery_channel" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wall" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"slug" text NOT NULL,
	"open_date" timestamp with time zone NOT NULL,
	"created_by" text NOT NULL,
	"visibility" "wall_visibility" DEFAULT 'public' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "capsule" ADD COLUMN "wall_id" uuid;--> statement-breakpoint
ALTER TABLE "capsule" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "capsule" ADD COLUMN "delivery_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "capsule" ADD COLUMN "status" "capsule_status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "capsule" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "capsule" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "capsule" ADD COLUMN "delivered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "capsule_content" ADD CONSTRAINT "capsule_content_capsule_id_capsule_id_fk" FOREIGN KEY ("capsule_id") REFERENCES "public"."capsule"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_recipient_id_recipient_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipient" ADD CONSTRAINT "recipient_capsule_id_capsule_id_fk" FOREIGN KEY ("capsule_id") REFERENCES "public"."capsule"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wall" ADD CONSTRAINT "wall_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "capsuleContent_capsuleId_idx" ON "capsule_content" USING btree ("capsule_id");--> statement-breakpoint
CREATE INDEX "notification_recipientId_idx" ON "notification" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "notification_status_scheduledFor_idx" ON "notification" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "recipient_capsuleId_idx" ON "recipient" USING btree ("capsule_id");--> statement-breakpoint
CREATE INDEX "recipient_email_idx" ON "recipient" USING btree ("email");--> statement-breakpoint
CREATE INDEX "recipient_phone_idx" ON "recipient" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "wall_slug_unique" ON "wall" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "wall_openDate_idx" ON "wall" USING btree ("open_date");--> statement-breakpoint
CREATE INDEX "wall_createdBy_idx" ON "wall" USING btree ("created_by");--> statement-breakpoint
ALTER TABLE "capsule" ADD CONSTRAINT "capsule_wall_id_wall_id_fk" FOREIGN KEY ("wall_id") REFERENCES "public"."wall"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "capsule_ownerId_idx" ON "capsule" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "capsule_wallId_idx" ON "capsule" USING btree ("wall_id");--> statement-breakpoint
CREATE INDEX "capsule_status_deliveryDate_idx" ON "capsule" USING btree ("status","delivery_date");