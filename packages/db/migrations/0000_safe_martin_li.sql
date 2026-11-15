-- Points are stored as PostGIS geometry. Added by hand: the generator does not write extensions.
CREATE EXTENSION IF NOT EXISTS postgis;--> statement-breakpoint
CREATE TYPE "public"."city" AS ENUM('Bangalore', 'Hyderabad', 'Pune', 'Chennai', 'Mumbai', 'Delhi', 'Gurgaon', 'Noida', 'Kolkata', 'Ahmedabad');--> statement-breakpoint
CREATE TYPE "public"."furnishing" AS ENUM('furnished', 'semi_furnished', 'unfurnished');--> statement-breakpoint
CREATE TYPE "public"."lister_role" AS ENUM('owner', 'flatmate');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('draft', 'active', 'paused', 'filled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."room_tag" AS ENUM('bedroom', 'living', 'kitchen', 'bathroom', 'balcony', 'building');--> statement-breakpoint
CREATE TYPE "public"."room_type" AS ENUM('private_room', 'shared_room', 'whole_flat');--> statement-breakpoint
CREATE TYPE "public"."swipe_action" AS ENUM('like', 'pass', 'save', 'superlike');--> statement-breakpoint
CREATE TABLE "listing_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"url" text NOT NULL,
	"room_tag" "room_tag" NOT NULL,
	"dominant_color" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lister_id" uuid NOT NULL,
	"status" "listing_status" DEFAULT 'active' NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"locality_id" uuid NOT NULL,
	"society_name" text NOT NULL,
	"address_text" text NOT NULL,
	"location_exact" geometry(point) NOT NULL,
	"location_public" geometry(point) NOT NULL,
	"rent" integer NOT NULL,
	"deposit" integer DEFAULT 0 NOT NULL,
	"maintenance" integer DEFAULT 0 NOT NULL,
	"utilities_est" integer DEFAULT 0 NOT NULL,
	"room_type" "room_type" NOT NULL,
	"bhk" integer NOT NULL,
	"furnishing" "furnishing" NOT NULL,
	"available_from" date NOT NULL,
	"available_in_days" integer,
	"amenities" text[] DEFAULT '{}'::text[] NOT NULL,
	"nearby" text[] DEFAULT '{}'::text[] NOT NULL,
	"house_rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"society_rules" text[] DEFAULT '{}'::text[] NOT NULL,
	"expectations" text[] DEFAULT '{}'::text[] NOT NULL,
	"lister_role" "lister_role" DEFAULT 'flatmate' NOT NULL,
	"flatmate_count" integer DEFAULT 0 NOT NULL,
	"quality_score" real DEFAULT 0 NOT NULL,
	"seed_compat" jsonb,
	"seed_commute_minutes" integer,
	"seed_stretch_label" text,
	"is_seed" boolean DEFAULT false NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"seed_key" text,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listings_seed_key_unique" UNIQUE("seed_key")
);
--> statement-breakpoint
CREATE TABLE "localities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city" "city" NOT NULL,
	"name" text NOT NULL,
	"centroid" geometry(point) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "swipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"action" "swipe_action" NOT NULL,
	"client_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text DEFAULT '' NOT NULL,
	"about" text DEFAULT '' NOT NULL,
	"is_seed" boolean DEFAULT false NOT NULL,
	"is_guest" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listing_photos" ADD CONSTRAINT "listing_photos_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_lister_id_users_id_fk" FOREIGN KEY ("lister_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_locality_id_localities_id_fk" FOREIGN KEY ("locality_id") REFERENCES "public"."localities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipes" ADD CONSTRAINT "swipes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipes" ADD CONSTRAINT "swipes_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "listing_photos_order" ON "listing_photos" USING btree ("listing_id","position");--> statement-breakpoint
CREATE INDEX "listings_location_exact" ON "listings" USING gist ("location_exact");--> statement-breakpoint
CREATE INDEX "listings_active_rent" ON "listings" USING btree ("rent") WHERE "listings"."status" = 'active';--> statement-breakpoint
CREATE INDEX "listings_active_available" ON "listings" USING btree ("available_from") WHERE "listings"."status" = 'active';--> statement-breakpoint
CREATE INDEX "listings_locality" ON "listings" USING btree ("locality_id");--> statement-breakpoint
CREATE INDEX "listings_feed_order" ON "listings" USING btree ("quality_score" DESC NULLS LAST,"id");--> statement-breakpoint
CREATE UNIQUE INDEX "localities_city_name" ON "localities" USING btree ("city","name");--> statement-breakpoint
CREATE UNIQUE INDEX "swipes_user_listing" ON "swipes" USING btree ("user_id","listing_id");--> statement-breakpoint
CREATE INDEX "swipes_user_action" ON "swipes" USING btree ("user_id","action","updated_at" DESC NULLS LAST);