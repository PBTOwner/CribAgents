-- CribAgents Initial Migration
-- All tables for the real estate platform

-- Enums
CREATE TYPE "user_role" AS ENUM ('buyer', 'seller', 'landlord', 'tenant', 'agent');
CREATE TYPE "property_type" AS ENUM ('house', 'condo', 'townhouse', 'apartment', 'land');
CREATE TYPE "listing_type" AS ENUM ('sale', 'rent');
CREATE TYPE "property_status" AS ENUM ('active', 'pending', 'sold', 'rented', 'withdrawn');
CREATE TYPE "message_role" AS ENUM ('user', 'assistant', 'system');
CREATE TYPE "showing_status" AS ENUM ('requested', 'confirmed', 'completed', 'cancelled');
CREATE TYPE "document_type" AS ENUM ('purchase_contract', 'lease_agreement', 'seller_disclosure', 'addendum', 'inspection_report', 'closing_statement');
CREATE TYPE "document_status" AS ENUM ('draft', 'pending_signature', 'partially_signed', 'fully_signed', 'voided');
CREATE TYPE "transaction_status" AS ENUM ('initiated', 'under_contract', 'inspection', 'appraisal', 'closing', 'completed', 'cancelled');
CREATE TYPE "offer_status" AS ENUM ('pending', 'accepted', 'rejected', 'countered', 'withdrawn', 'expired');
CREATE TYPE "fee_type" AS ENUM ('buyer_commission', 'seller_commission', 'rental_fee');
CREATE TYPE "payment_status" AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
CREATE TYPE "scraped_source" AS ENUM ('zillow', 'apartments_com', 'realtor_com', 'craigslist', 'redfin');

-- Users
CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" varchar(255) NOT NULL UNIQUE,
  "password_hash" varchar(255) NOT NULL,
  "full_name" varchar(255) NOT NULL,
  "phone" varchar(20),
  "role" "user_role" NOT NULL DEFAULT 'buyer',
  "license_number" varchar(50),
  "profile_image_url" text,
  "stripe_customer_id" varchar(255),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Properties
CREATE TABLE "properties" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" varchar(500) NOT NULL,
  "description" text,
  "property_type" "property_type" NOT NULL,
  "listing_type" "listing_type" NOT NULL,
  "price" numeric(12, 2) NOT NULL,
  "bedrooms" integer,
  "bathrooms" numeric(3, 1),
  "sqft" integer,
  "address" varchar(500) NOT NULL,
  "city" varchar(100) NOT NULL DEFAULT 'West Palm Beach',
  "state" varchar(2) NOT NULL DEFAULT 'FL',
  "zip_code" varchar(10),
  "latitude" numeric(10, 7),
  "longitude" numeric(10, 7),
  "images" text[],
  "features" text[],
  "year_built" integer,
  "parking_spaces" integer,
  "pet_friendly" boolean DEFAULT false,
  "ai_generated_description" text,
  "ai_suggested_price" numeric(12, 2),
  "status" "property_status" NOT NULL DEFAULT 'active',
  "mls_number" varchar(50),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Conversations
CREATE TABLE "conversations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" varchar(500),
  "context" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Messages
CREATE TABLE "messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" uuid NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "role" "message_role" NOT NULL,
  "content" text NOT NULL,
  "tool_calls" jsonb,
  "tool_results" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- Transactions
CREATE TABLE "transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "property_id" uuid NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
  "buyer_id" uuid NOT NULL REFERENCES "users"("id"),
  "seller_id" uuid NOT NULL REFERENCES "users"("id"),
  "status" "transaction_status" NOT NULL DEFAULT 'initiated',
  "offer_price" numeric(12, 2),
  "final_price" numeric(12, 2),
  "closing_date" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Showings
CREATE TABLE "showings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "property_id" uuid NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
  "buyer_id" uuid NOT NULL REFERENCES "users"("id"),
  "seller_id" uuid NOT NULL REFERENCES "users"("id"),
  "scheduled_at" timestamptz NOT NULL,
  "status" "showing_status" NOT NULL DEFAULT 'requested',
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- Documents
CREATE TABLE "documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "transaction_id" uuid REFERENCES "transactions"("id"),
  "property_id" uuid NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
  "type" "document_type" NOT NULL,
  "title" varchar(500) NOT NULL,
  "content" text,
  "pdf_url" text,
  "status" "document_status" NOT NULL DEFAULT 'draft',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Signatures
CREATE TABLE "signatures" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "document_id" uuid NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
  "signer_id" uuid NOT NULL REFERENCES "users"("id"),
  "signature_data" text,
  "signed_at" timestamptz NOT NULL DEFAULT now(),
  "ip_address" varchar(45),
  "signer_name" varchar(255),
  "signer_email" varchar(255)
);

-- Offers
CREATE TABLE "offers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "property_id" uuid NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
  "buyer_id" uuid NOT NULL REFERENCES "users"("id"),
  "offer_price" numeric(12, 2) NOT NULL,
  "status" "offer_status" NOT NULL DEFAULT 'pending',
  "counter_price" numeric(12, 2),
  "conditions" text,
  "expires_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- Payments
CREATE TABLE "payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "transaction_id" uuid REFERENCES "transactions"("id"),
  "stripe_payment_intent_id" varchar(255),
  "amount" integer NOT NULL,
  "fee_type" "fee_type" NOT NULL,
  "status" "payment_status" NOT NULL DEFAULT 'pending',
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- Scraped Listings
CREATE TABLE "scraped_listings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "source" "scraped_source" NOT NULL,
  "external_id" varchar(255),
  "title" varchar(500),
  "price" numeric(12, 2),
  "address" varchar(500),
  "city" varchar(100),
  "state" varchar(2),
  "zip_code" varchar(10),
  "bedrooms" integer,
  "bathrooms" numeric(3, 1),
  "sqft" integer,
  "listing_url" text,
  "image_urls" text[],
  "description" text,
  "listing_type" "listing_type",
  "raw_data" jsonb,
  "dedupe_hash" varchar(64),
  "scraped_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "dedupe_hash_idx" ON "scraped_listings" ("dedupe_hash");

-- Document Templates
CREATE TABLE "document_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(255) NOT NULL,
  "type" "document_type" NOT NULL,
  "content" text NOT NULL,
  "version" integer NOT NULL DEFAULT 1,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX "idx_properties_city" ON "properties" ("city");
CREATE INDEX "idx_properties_listing_type" ON "properties" ("listing_type");
CREATE INDEX "idx_properties_status" ON "properties" ("status");
CREATE INDEX "idx_properties_price" ON "properties" ("price");
CREATE INDEX "idx_properties_owner" ON "properties" ("owner_id");
CREATE INDEX "idx_messages_conversation" ON "messages" ("conversation_id");
CREATE INDEX "idx_offers_property" ON "offers" ("property_id");
CREATE INDEX "idx_offers_buyer" ON "offers" ("buyer_id");
CREATE INDEX "idx_showings_property" ON "showings" ("property_id");
CREATE INDEX "idx_showings_buyer" ON "showings" ("buyer_id");
CREATE INDEX "idx_showings_seller" ON "showings" ("seller_id");
CREATE INDEX "idx_transactions_property" ON "transactions" ("property_id");
CREATE INDEX "idx_documents_property" ON "documents" ("property_id");
CREATE INDEX "idx_scraped_listings_source" ON "scraped_listings" ("source");
