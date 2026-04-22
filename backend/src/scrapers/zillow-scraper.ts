import axios from 'axios';
import * as cheerio from 'cheerio';
import { BaseScraper, ScrapedListing } from './base-scraper';

export class ZillowScraper extends BaseScraper {
  source = 'zillow';

  private baseUrl = 'https://www.zillow.com/west-palm-beach-fl/rentals/';

  private headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  };

  async scrape(): Promise<ScrapedListing[]> {
    const listings: ScrapedListing[] = [];
    const maxPages = 5;

    try {
      for (let page = 1; page <= maxPages; page++) {
        const url = page === 1 ? this.baseUrl : `${this.baseUrl}${page}_p/`;

        console.log(`[Zillow] Scraping page ${page}: ${url}`);

        const response = await axios.get(url, {
          headers: this.headers,
          timeout: 30000,
        });

        const $ = cheerio.load(response.data);

        // Zillow embeds listing data in a script tag as JSON
        const scriptTag = $('script#__NEXT_DATA__').html();

        if (scriptTag) {
          try {
            const data = JSON.parse(scriptTag);
            const searchResults =
              data?.props?.pageProps?.searchPageState?.cat1?.searchResults?.listResults || [];

            for (const result of searchResults) {
              const listing = this.parseJsonResult(result);
              if (listing) listings.push(listing);
            }
          } catch {
            // Fallback to HTML parsing
            this.parseHtmlListings($, listings);
          }
        } else {
          // Parse from HTML directly
          this.parseHtmlListings($, listings);
        }

        // Rate limit: 2-5 second delay between pages
        if (page < maxPages) {
          await this.randomDelay(2000, 5000);
        }
      }

      // Save to database
      const newCount = await this.deduplicateAndSave(listings);
      console.log(`[Zillow] Scraped ${listings.length} listings, ${newCount} new.`);

      return listings;
    } catch (error: any) {
      console.error(`[Zillow] Scraping failed:`, error.message);
      // Return whatever we collected before the error
      if (listings.length > 0) {
        const newCount = await this.deduplicateAndSave(listings);
        console.log(`[Zillow] Partial scrape: ${listings.length} listings, ${newCount} new.`);
      }
      return listings;
    }
  }

  private parseJsonResult(result: any): ScrapedListing | null {
    try {
      const address = result.address || '';
      const addressParts = address.split(',').map((s: string) => s.trim());
      const streetAddress = addressParts[0] || address;
      const city = addressParts[1] || 'West Palm Beach';
      const stateZip = (addressParts[2] || 'FL 33401').split(' ');
      const state = stateZip[0] || 'FL';
      const zip = stateZip[1] || '33401';

      const price = result.unformattedPrice || result.price ? parseInt(String(result.unformattedPrice || result.price).replace(/[^0-9]/g, '')) : 0;
      if (!price || price === 0) return null;

      return {
        source: this.source,
        externalId: result.zpid ? String(result.zpid) : undefined,
        url: result.detailUrl
          ? (result.detailUrl.startsWith('http') ? result.detailUrl : `https://www.zillow.com${result.detailUrl}`)
          : '',
        title: streetAddress,
        address: streetAddress,
        city,
        state,
        zip,
        price,
        bedrooms: result.beds ?? null,
        bathrooms: result.baths ?? null,
        sqft: result.area ?? null,
        propertyType: result.buildingType || result.homeType || null,
        listingType: 'rent',
        description: result.statusText || null,
        imageUrls: result.imgSrc ? [result.imgSrc] : [],
        latitude: result.latLong?.latitude ?? null,
        longitude: result.latLong?.longitude ?? null,
        scrapedAt: new Date(),
      };
    } catch {
      return null;
    }
  }

  private parseHtmlListings($: cheerio.CheerioAPI, listings: ScrapedListing[]): void {
    // Zillow property card selectors
    $('article[data-test="property-card"], .property-card-data, .list-card-info').each((_i, el) => {
      try {
        const $el = $(el);

        const addressEl = $el.find('address, [data-test="property-card-addr"]');
        const address = addressEl.text().trim();
        if (!address) return;

        const priceText = $el.find('[data-test="property-card-price"], .list-card-price').text().trim();
        const price = parseInt(priceText.replace(/[^0-9]/g, ''));
        if (!price) return;

        const detailsText = $el.find('[data-test="property-card-details"], .list-card-details').text();
        const bedsMatch = detailsText.match(/(\d+)\s*(?:bd|bed)/i);
        const bathsMatch = detailsText.match(/(\d+\.?\d*)\s*(?:ba|bath)/i);
        const sqftMatch = detailsText.match(/([\d,]+)\s*sqft/i);

        const link = $el.find('a[data-test="property-card-link"], a.list-card-link').attr('href') || '';
        const fullUrl = link.startsWith('http') ? link : `https://www.zillow.com${link}`;

        const imgSrc = $el.find('img').first().attr('src') || '';

        const addressParts = address.split(',').map((s: string) => s.trim());

        listings.push({
          source: this.source,
          url: fullUrl,
          title: addressParts[0] || address,
          address: addressParts[0] || address,
          city: addressParts[1] || 'West Palm Beach',
          state: 'FL',
          zip: (addressParts[2] || '').replace(/[^0-9]/g, '') || '33401',
          price,
          bedrooms: bedsMatch ? parseInt(bedsMatch[1]) : null,
          bathrooms: bathsMatch ? parseFloat(bathsMatch[1]) : null,
          sqft: sqftMatch ? parseInt(sqftMatch[1].replace(/,/g, '')) : null,
          propertyType: null,
          listingType: 'rent',
          description: null,
          imageUrls: imgSrc ? [imgSrc] : [],
          latitude: null,
          longitude: null,
          scrapedAt: new Date(),
        });
      } catch {
        // Skip malformed listing
      }
    });
  }
}
