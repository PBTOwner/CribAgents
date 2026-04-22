import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
  numeric,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ── Enums ──────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', [
  'buyer',
  'seller',
  'landlord',
  'tenant',
  'agent',
]);

export const propertyTypeEnum = pgEnum('property_type', [
  'house',
  'condo',
  'townhouse',
  'apartment',
  'land',
]);

export const listingTypeEnum = pgEnum('listing_type', ['sale', 'rent']);

export const propertyStatusEnum = pgEnum('property_status', [
  'active',
  'pending',
  'sold',
  'rented',
  'withdrawn',
]);

export const messageRoleEnum = pgEnum('message_role', [
  'user',
  'assistant',
  'system',
]);

export const showingStatusEnum = pgEnum('showing_status', [
  'requested',
  'confirmed',
  'completed',
  'cancelled',
]);

export const documentTypeEnum = pgEnum('document_type', [
  'purchase_contract',
  'lease_agreement',
  'seller_disclosure',
  'addendum',
  'inspection_report',
  'closing_statement',
]);

export const documentStatusEnum = pgEnum('document_status', [
  'draft',
  'pending_signature',
  'partially_signed',
  'fully_signed',
  'voided',
]);

export const transactionStatusEnum = pgEnum('transaction_status', [
  'initiated',
  'under_contract',
  'inspection',
  'appraisal',
  'closing',
  'completed',
  'cancelled',
]);

export const offerStatusEnum = pgEnum('offer_status', [
  'pending',
  'accepted',
  'rejected',
  'countered',
  'withdrawn',
  'expired',
]);

export const feeTypeEnum = pgEnum('fee_type', [
  'buyer_commission',
  'seller_commission',
  'rental_fee',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded',
]);

export const scrapedSourceEnum = pgEnum('scraped_source', [
  'zillow',
  'apartments_com',
  'realtor_com',
  'craigslist',
  'redfin',
]);

// ── Tables ─────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  role: userRoleEnum('role').notNull().default('buyer'),
  licenseNumber: varchar('license_number', { length: 50 }),
  profileImageUrl: text('profile_image_url'),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const properties = pgTable('properties', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  propertyType: propertyTypeEnum('property_type').notNull(),
  listingType: listingTypeEnum('listing_type').notNull(),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  bedrooms: integer('bedrooms'),
  bathrooms: numeric('bathrooms', { precision: 3, scale: 1 }),
  sqft: integer('sqft'),
  address: varchar('address', { length: 500 }).notNull(),
  city: varchar('city', { length: 100 }).notNull().default('West Palm Beach'),
  state: varchar('state', { length: 2 }).notNull().default('FL'),
  zipCode: varchar('zip_code', { length: 10 }),
  latitude: numeric('latitude', { precision: 10, scale: 7 }),
  longitude: numeric('longitude', { precision: 10, scale: 7 }),
  images: text('images').array(),
  features: text('features').array(),
  yearBuilt: integer('year_built'),
  parkingSpaces: integer('parking_spaces'),
  petFriendly: boolean('pet_friendly').default(false),
  aiGeneratedDescription: text('ai_generated_description'),
  aiSuggestedPrice: numeric('ai_suggested_price', { precision: 12, scale: 2 }),
  status: propertyStatusEnum('status').notNull().default('active'),
  mlsNumber: varchar('mls_number', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }),
  context: jsonb('context'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  toolCalls: jsonb('tool_calls'),
  toolResults: jsonb('tool_results'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const transactions = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  propertyId: uuid('property_id')
    .notNull()
    .references(() => properties.id, { onDelete: 'cascade' }),
  buyerId: uuid('buyer_id')
    .notNull()
    .references(() => users.id),
  sellerId: uuid('seller_id')
    .notNull()
    .references(() => users.id),
  status: transactionStatusEnum('status').notNull().default('initiated'),
  offerPrice: numeric('offer_price', { precision: 12, scale: 2 }),
  finalPrice: numeric('final_price', { precision: 12, scale: 2 }),
  closingDate: timestamp('closing_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const showings = pgTable('showings', {
  id: uuid('id').defaultRandom().primaryKey(),
  propertyId: uuid('property_id')
    .notNull()
    .references(() => properties.id, { onDelete: 'cascade' }),
  buyerId: uuid('buyer_id')
    .notNull()
    .references(() => users.id),
  sellerId: uuid('seller_id')
    .notNull()
    .references(() => users.id),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  status: showingStatusEnum('status').notNull().default('requested'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  transactionId: uuid('transaction_id').references(() => transactions.id),
  propertyId: uuid('property_id')
    .notNull()
    .references(() => properties.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by').references(() => users.id),
  type: documentTypeEnum('type').notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content'),
  pdfBase64: text('pdf_base64'),
  status: documentStatusEnum('status').notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const signatures = pgTable('signatures', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  signerId: uuid('signer_id')
    .notNull()
    .references(() => users.id),
  signatureData: text('signature_data'),
  signedAt: timestamp('signed_at', { withTimezone: true }).defaultNow().notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  signerName: varchar('signer_name', { length: 255 }),
  signerEmail: varchar('signer_email', { length: 255 }),
});

export const offers = pgTable('offers', {
  id: uuid('id').defaultRandom().primaryKey(),
  propertyId: uuid('property_id')
    .notNull()
    .references(() => properties.id, { onDelete: 'cascade' }),
  buyerId: uuid('buyer_id')
    .notNull()
    .references(() => users.id),
  offerPrice: numeric('offer_price', { precision: 12, scale: 2 }).notNull(),
  status: offerStatusEnum('status').notNull().default('pending'),
  counterPrice: numeric('counter_price', { precision: 12, scale: 2 }),
  conditions: text('conditions'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  transactionId: uuid('transaction_id').references(() => transactions.id),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  amount: integer('amount').notNull(), // cents
  feeType: feeTypeEnum('fee_type').notNull(),
  status: paymentStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const scrapedListings = pgTable(
  'scraped_listings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    source: scrapedSourceEnum('source').notNull(),
    externalId: varchar('external_id', { length: 255 }),
    title: varchar('title', { length: 500 }),
    price: numeric('price', { precision: 12, scale: 2 }),
    address: varchar('address', { length: 500 }),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 2 }),
    zipCode: varchar('zip_code', { length: 10 }),
    bedrooms: integer('bedrooms'),
    bathrooms: numeric('bathrooms', { precision: 3, scale: 1 }),
    sqft: integer('sqft'),
    listingUrl: text('listing_url'),
    imageUrls: text('image_urls').array(),
    description: text('description'),
    listingType: listingTypeEnum('listing_type'),
    rawData: jsonb('raw_data'),
    dedupeHash: varchar('dedupe_hash', { length: 64 }),
    scrapedAt: timestamp('scraped_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('dedupe_hash_idx').on(table.dedupeHash)]
);

export const documentTemplates = pgTable('document_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  type: documentTypeEnum('type').notNull(),
  content: text('content').notNull(),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
