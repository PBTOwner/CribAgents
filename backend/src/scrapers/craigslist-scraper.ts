import axios from 'axios';
import * as cheerio from 'cheerio';
import { BaseScraper, ScrapedListing } from './base-scraper';

export class CraigslistScraper extends BaseScraper {
  source = 'craigslist';

  // South Florida Craigslist housing/apts section
  private baseUrl = 'https://sflorida.craigslist.org/search/west-palm-beach-fl/apa';

  private headers = {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  async scrape(): Promise<ScrapedListing[]> {
    const listings: ScrapedListing[] = [];
    const maxPages = 5;
    const resultsPerPage = 120;

    try {
      for (let page = 0; page < maxPages; page++) {
        const offset = page * resultsPerPage;
        const url = offset === 0 ? this.baseUrl : `${this.baseUrl}?s=${offset}`;

        console.log(`[Craigslist] Scraping page ${page + 1}: ${url}`);

        const response = await axios.get(url, {
          headers: this.headers,
          timeout: 30000,
        });

        const $ = cheerio.load(response.data);
        let foundOnPage = 0;

        // Craigslist gallery/list result selectors
        $('li.cl-static-search-result, .result-row, li.cl-search-result').each((_i, el) => {
          try {
            const $el = $(el);

            // Title and link
            const $link = $el.find('a.titlestring, a.posting-title, a.result-title').first();
            const title = $link.text().trim() || $el.find('.title').text().trim();
            const link = $link.attr('href') || $el.find('a').first().attr('href') || '';
            if (!title || !link) return;

            const fullUrl = link.startsWith('http') ? link : `https://sflorida.craigslist.org${link}`;

            // Price
            const priceText = $el.find('.priceinfo, .result-price, span.price').text().trim();
            const price = parseInt(priceText.replace(/[^0-9]/g, ''));
            if (!price || price > 50000) return; // Filter out obviously wrong prices for rentals

            // Housing info (e.g., "2br - 1200ft²")
            const housingText = $el.find('.housing, .meta').text().trim();
            const bedsMatch = housingText.match(/(\d+)\s*br/i);
            const sqftMatch = housingText.match(/([\d,]+)\s*ft/i);

            // Location
            const locationText = $el.find('.result-hood, .nearby, .supertitle').text().trim();
            const cleanLocation = locationText.replace(/[()]/g, '').trim();

            // Image
            const imgSrc = $el.find('img').first().attr('src') || '';

            // Craigslist doesn't give structured address — use title + location as best effort
            const address = cleanLocation || title;

            listings.push({
              source: this.source,
              externalId: $el.attr('data-pid') || undefined,
              url: fullUrl,
              title,
              address,
              city: 'West Palm Beach',
              state: 'FL',
              zip: '33401',
              price,
              bedrooms: bedsMatch ? parseInt(bedsMatch[1]) : null,
              bathrooms: null, // Craigslist rarely shows bathrooms in list view
              sqft: sqftMatch ? parseInt(sqftMatch[1].replace(/,/g, '')) : null,
              propertyType: null,
              listingType: 'rent',
              description: null,
              imageUrls: imgSrc ? [imgSrc] : [],
              latitude: null,
              longitude: null,
              scrapedAt: new Date(),
            });

            foundOnPage++;
          } catch {
            // Skip malformed
          }
        });

        if (foundOnPage === 0) break;

        // Rate limit: 3-7 seconds (Craigslist is stricter)
        if (page < maxPages - 1) {
          await this.randomDelay(3000, 7000);
        }
      }

      const newCount = await this.deduplicateAndSave(listings);
      console.log(`[Craigslist] Scraped ${listings.length} listings, ${newCount} new.`);

      return listings;
    } catch (error: any) {
      console.error(`[Craigslist] Scraping failed:`, error.message);
      if (listings.length > 0) {
        await this.deduplicateAndSave(listings);
      }
      return listings;
    }
  }
}
