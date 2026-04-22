import { ZillowScraper } from './zillow-scraper.js';
import { ApartmentsScraper } from './apartments-scraper.js';
import { RealtorScraper } from './realtor-scraper.js';
import { CraigslistScraper } from './craigslist-scraper.js';
import { RedfinScraper } from './redfin-scraper.js';
import { ScrapedListing } from './base-scraper.js';

// Export individual scraper instances
export const zillowScraper = new ZillowScraper();
export const apartmentsScraper = new ApartmentsScraper();
export const realtorScraper = new RealtorScraper();
export const craigslistScraper = new CraigslistScraper();
export const redfinScraper = new RedfinScraper();

// Export classes for custom instantiation
export { ZillowScraper, ApartmentsScraper, RealtorScraper, CraigslistScraper, RedfinScraper };
export { BaseScraper, ScrapedListing } from './base-scraper';

// ---------------------------------------------------------------------------
// Run all scrapers concurrently and return total new listings
// ---------------------------------------------------------------------------

export interface ScrapeRunResult {
  totalScraped: number;
  totalNew: number;
  bySource: Record<string, { scraped: number; errors: string[] }>;
  durationMs: number;
}

export async function runAllScrapers(): Promise<ScrapeRunResult> {
  const start = Date.now();
  const bySource: Record<string, { scraped: number; errors: string[] }> = {};
  let totalScraped = 0;

  const scrapers = [
    zillowScraper,
    apartmentsScraper,
    realtorScraper,
    craigslistScraper,
    redfinScraper,
  ];

  // Run all scrapers concurrently with individual error isolation
  const results = await Promise.allSettled(
    scrapers.map(async (scraper) => {
      const sourceName = scraper.source;
      try {
        const listings = await scraper.scrape();
        bySource[sourceName] = { scraped: listings.length, errors: [] };
        return listings.length;
      } catch (error: any) {
        bySource[sourceName] = { scraped: 0, errors: [error.message] };
        console.error(`[ScraperRunner] ${sourceName} failed:`, error.message);
        return 0;
      }
    }),
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      totalScraped += result.value;
    }
  }

  const durationMs = Date.now() - start;

  console.log(`[ScraperRunner] Complete. ${totalScraped} total listings scraped in ${durationMs}ms.`);

  return {
    totalScraped,
    totalNew: totalScraped, // Approximate — actual new count is tracked per-scraper in deduplicateAndSave
    bySource,
    durationMs,
  };
}
