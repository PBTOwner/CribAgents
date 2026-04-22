import axios from 'axios';
import * as cheerio from 'cheerio';
import { BaseScraper, ScrapedListing } from './base-scraper';

export class ApartmentsScraper extends BaseScraper {
  source = 'apartments.com';

  private baseUrl = 'https://www.apartments.com/west-palm-beach-fl/';

  private headers = {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
  };

  async scrape(): Promise<ScrapedListing[]> {
    const listings: ScrapedListing[] = [];
    const maxPages = 5;

    try {
      for (let page = 1; page <= maxPages; page++) {
        const url = page === 1 ? this.baseUrl : `${this.baseUrl}${page}/`;

        console.log(`[Apartments.com] Scraping page ${page}: ${url}`);

        const response = await axios.get(url, {
          headers: this.headers,
          timeout: 30000,
        });

        const $ = cheerio.load(response.data);
        let foundOnPage = 0;

        // Apartments.com placard selectors
        $('li.mortar-wrapper article.placard, .placard-container .placard').each((_i, el) => {
          try {
            const $el = $(el);

            const title = $el.find('.property-title, .js-placardTitle').text().trim();
            const addressText = $el.find('.property-address, .js-placardAddress').text().trim();
            if (!addressText) return;

            const priceText = $el.find('.property-pricing, .price-range').text().trim();
            // Handle price ranges like "$1,500 - $2,200" — take the lower bound
            const priceMatch = priceText.match(/\$?([\d,]+)/);
            const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 0;
            if (!price) return;

            const bedsText = $el.find('.property-beds, .bed-range').text().trim();
            const bedsMatch = bedsText.match(/(\d+)/);
            const bedrooms = bedsMatch ? parseInt(bedsMatch[1]) : null;

            const bathsText = $el.find('.property-baths, .bath-range').text().trim();
            const bathsMatch = bathsText.match(/(\d+\.?\d*)/);
            const bathrooms = bathsMatch ? parseFloat(bathsMatch[1]) : null;

            const sqftText = $el.find('.property-sqft, .sqft-range').text().trim();
            const sqftMatch = sqftText.match(/([\d,]+)/);
            const sqft = sqftMatch ? parseInt(sqftMatch[1].replace(/,/g, '')) : null;

            const link = $el.find('a.property-link, a[data-listingid]').attr('href') || '';
            const imgSrc = $el.find('img.lazyload, img[data-src]').attr('data-src') ||
              $el.find('img').first().attr('src') || '';

            // Parse address
            const addressParts = addressText.split(',').map((s: string) => s.trim());
            const streetAddress = addressParts[0] || addressText;
            const city = addressParts[1] || 'West Palm Beach';
            const stateZip = (addressParts[2] || 'FL 33401').trim().split(/\s+/);
            const state = stateZip[0] || 'FL';
            const zip = stateZip[1] || '33401';

            listings.push({
              source: this.source,
              externalId: $el.attr('data-listingid') || undefined,
              url: link.startsWith('http') ? link : `https://www.apartments.com${link}`,
              title: title || streetAddress,
              address: streetAddress,
              city,
              state,
              zip,
              price,
              bedrooms,
              bathrooms,
              sqft,
              propertyType: 'apartment',
              listingType: 'rent',
              description: $el.find('.property-amenities').text().trim() || null,
              imageUrls: imgSrc ? [imgSrc] : [],
              latitude: parseFloat($el.attr('data-lat') || '') || null,
              longitude: parseFloat($el.attr('data-lng') || '') || null,
              scrapedAt: new Date(),
            });

            foundOnPage++;
          } catch {
            // Skip malformed listing
          }
        });

        // If no listings found on this page, stop pagination
        if (foundOnPage === 0) break;

        // Rate limit: 2-4 seconds between pages
        if (page < maxPages) {
          await this.randomDelay(2000, 4000);
        }
      }

      const newCount = await this.deduplicateAndSave(listings);
      console.log(`[Apartments.com] Scraped ${listings.length} listings, ${newCount} new.`);

      return listings;
    } catch (error: any) {
      console.error(`[Apartments.com] Scraping failed:`, error.message);
      if (listings.length > 0) {
        await this.deduplicateAndSave(listings);
      }
      return listings;
    }
  }
}
