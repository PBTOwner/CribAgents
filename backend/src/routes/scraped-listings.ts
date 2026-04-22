import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { scrapedListings } from '../db/schema.js';
import { eq, and, gte, lte, desc, sql, count } from 'drizzle-orm';
import { runAllScrapers } from '../scrapers/index.js';

const router = Router();

// GET / — list scraped listings with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      source,
      min_price,
      max_price,
      bedrooms,
      city,
      listing_type,
      page = '1',
      limit = '50',
    } = req.query;

    const conditions: any[] = [];

    if (source && typeof source === 'string') {
      conditions.push(eq(scrapedListings.source, source));
    }
    if (min_price) {
      conditions.push(gte(scrapedListings.price, String(min_price)));
    }
    if (max_price) {
      conditions.push(lte(scrapedListings.price, String(max_price)));
    }
    if (bedrooms) {
      conditions.push(gte(scrapedListings.bedrooms, parseInt(String(bedrooms))));
    }
    if (city && typeof city === 'string') {
      conditions.push(sql`LOWER(${scrapedListings.city}) = LOWER(${city})`);
    }
    if (listing_type && typeof listing_type === 'string') {
      conditions.push(eq(scrapedListings.listingType, listing_type));
    }

    const pageNum = Math.max(1, parseInt(String(page)));
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit))));
    const offset = (pageNum - 1) * limitNum;

    const query = conditions.length > 0
      ? db.select().from(scrapedListings).where(and(...conditions))
      : db.select().from(scrapedListings);

    const results = await query
      .orderBy(desc(scrapedListings.scrapedAt))
      .limit(limitNum)
      .offset(offset);

    // Get total count for pagination
    const countQuery = conditions.length > 0
      ? db.select({ total: count() }).from(scrapedListings).where(and(...conditions))
      : db.select({ total: count() }).from(scrapedListings);

    const [{ total }] = await countQuery;

    res.json({
      success: true,
      listings: results,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(Number(total) / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error listing scraped listings:', error);
    res.status(500).json({ error: 'Failed to list scraped listings', details: error.message });
  }
});

// POST /scrape — trigger a scrape run (protected, agent/admin only)
router.post('/scrape', async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).userRole;

    // Only allow agents or admins to trigger scrapes
    if (userRole !== 'agent' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only agents and admins can trigger scrapes' });
    }

    // Run scraping in the background and return immediately
    const resultPromise = runAllScrapers();

    // If the client wants to wait, they can — otherwise respond quickly
    if (req.query.wait === 'true') {
      const result = await resultPromise;
      res.json({ success: true, result });
    } else {
      // Fire and forget
      resultPromise
        .then((result) => console.log('[ScrapeRoute] Completed:', result))
        .catch((err) => console.error('[ScrapeRoute] Failed:', err));

      res.json({
        success: true,
        message: 'Scrape job started. Check /stats for progress.',
      });
    }
  } catch (error: any) {
    console.error('Error triggering scrape:', error);
    res.status(500).json({ error: 'Failed to trigger scrape', details: error.message });
  }
});

// GET /stats — scraping statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Count by source
    const sourceCounts = await db
      .select({
        source: scrapedListings.source,
        count: count(),
        latestScrape: sql<string>`MAX(${scrapedListings.scrapedAt})`,
      })
      .from(scrapedListings)
      .groupBy(scrapedListings.source);

    // Total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(scrapedListings);

    // Count by listing type
    const typeCounts = await db
      .select({
        listingType: scrapedListings.listingType,
        count: count(),
      })
      .from(scrapedListings)
      .groupBy(scrapedListings.listingType);

    res.json({
      success: true,
      stats: {
        total,
        bySource: sourceCounts,
        byListingType: typeCounts,
      },
    });
  } catch (error: any) {
    console.error('Error fetching scraping stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
  }
});

export default router;
