import crypto from 'crypto';
import { db } from '../db/index.js';
import { scrapedListings } from '../db/schema.js';
import { eq, inArray } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScrapedListing {
  source: string;
  externalId?: string;
  url: string;
  title: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  propertyType: string | null;
  listingType: 'sale' | 'rent';
  description: string | null;
  imageUrls: string[];
  latitude: number | null;
  longitude: number | null;
  scrapedAt: Date;
}

// ---------------------------------------------------------------------------
// Base Scraper
// ---------------------------------------------------------------------------

export abstract class BaseScraper {
  abstract source: string;
  abstract scrape(): Promise<ScrapedListing[]>;

  /**
   * Generate a deduplication hash from address + price + source.
   */
  protected generateHash(listing: ScrapedListing): string {
    const raw = `${listing.address.toLowerCase().trim()}|${listing.price}|${listing.source}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Deduplicate against existing records and save new listings.
   * Returns the count of newly saved listings.
   */
  protected async deduplicateAndSave(listings: ScrapedListing[]): Promise<number> {
    if (listings.length === 0) return 0;

    // Generate hashes for all incoming listings
    const listingsWithHash = listings.map((l) => ({
      ...l,
      dedupeHash: this.generateHash(l),
    }));

    const incomingHashes = listingsWithHash.map((l) => l.dedupeHash);

    // Check which hashes already exist in the database
    const existing = await db
      .select({ dedupeHash: scrapedListings.dedupeHash })
      .from(scrapedListings)
      .where(inArray(scrapedListings.dedupeHash, incomingHashes));

    const existingSet = new Set(existing.map((e: any) => e.dedupeHash));

    // Filter to only new listings
    const newListings = listingsWithHash.filter((l) => !existingSet.has(l.dedupeHash));

    if (newListings.length === 0) return 0;

    // Batch insert new listings
    await db.insert(scrapedListings).values(
      newListings.map((l) => ({
        source: l.source,
        externalId: l.externalId || null,
        url: l.url,
        title: l.title,
        address: l.address,
        city: l.city,
        state: l.state,
        zip: l.zip,
        price: l.price.toString(),
        bedrooms: l.bedrooms,
        bathrooms: l.bathrooms,
        sqft: l.sqft,
        propertyType: l.propertyType,
        listingType: l.listingType,
        description: l.description,
        imageUrls: JSON.stringify(l.imageUrls),
        latitude: l.latitude?.toString() || null,
        longitude: l.longitude?.toString() || null,
        dedupeHash: l.dedupeHash,
        scrapedAt: l.scrapedAt,
      })),
    );

    return newListings.length;
  }

  /**
   * Delay helper for rate limiting between requests.
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Random delay between min and max milliseconds.
   */
  protected randomDelay(minMs: number, maxMs: number): Promise<void> {
    const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return this.delay(ms);
  }
}
