import axios from 'axios';
import * as cheerio from 'cheerio';
import { BaseScraper, ScrapedListing } from './base-scraper';

export class RealtorScraper extends BaseScraper {
  source = 'realtor.com';

  private baseUrl = 'https://www.realtor.com/realestateandhomes-search/West-Palm-Beach_FL/type-single-family-home,condo-townhome-row-home-co-op,multi-family-home';

  private headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: 'https://www.realtor.com/',
    'Cache-Control': 'no-cache',
  };

  async scrape(): Promise<ScrapedListing[]> {
    const listings: ScrapedListing[] = [];
    const maxPages = 5;

    try {
      for (let page = 1; page <= maxPages; page++) {
        const url = page === 1 ? this.baseUrl : `${this.baseUrl}/pg-${page}`;

        console.log(`[Realtor.com] Scraping page ${page}: ${url}`);

        const response = await axios.get(url, {
          headers: this.headers,
          timeout: 30000,
        });

        const $ = cheerio.load(response.data);
        let foundOnPage = 0;

        // Try to extract from __NEXT_DATA__ JSON first
        const scriptTag = $('script#__NEXT_DATA__').html();
        if (scriptTag) {
          try {
            const data = JSON.parse(scriptTag);
            const results =
              data?.props?.pageProps?.searchResults?.home_search?.results || [];

            for (const result of results) {
              const listing = this.parseJsonResult(result);
              if (listing) {
                listings.push(listing);
                foundOnPage++;
              }
            }
          } catch {
            // Fall through to HTML parsing
          }
        }

        // Fallback: HTML parsing
        if (foundOnPage === 0) {
          $('[data-testid="property-card"], .BasePropertyCard_propertyCardWrap__J0xUj, .property-card').each((_i, el) => {
            try {
              const $el = $(el);

              const priceText = $el.find('[data-testid="card-price"], .card-price').text().trim();
              const price = parseInt(priceText.replace(/[^0-9]/g, ''));
              if (!price) return;

              const addressLine1 = $el.find('[data-testid="card-address-1"], .card-address').first().text().trim();
              const addressLine2 = $el.find('[data-testid="card-address-2"]').text().trim();
              if (!addressLine1) return;

              const bedsMatch = $el.find('[data-testid="property-meta-beds"], .property-meta-beds').text().match(/(\d+)/);
              const bathsMatch = $el.find('[data-testid="property-meta-baths"], .property-meta-baths').text().match(/(\d+\.?\d*)/);
              const sqftMatch = $el.find('[data-testid="property-meta-sqft"], .property-meta-sqft').text().match(/([\d,]+)/);

              const link = $el.find('a[data-testid="property-card-link"]').attr('href') ||
                $el.find('a').first().attr('href') || '';
              const fullUrl = link.startsWith('http') ? link : `https://www.realtor.com${link}`;

              const imgSrc = $el.find('img[data-testid="property-card-img"]').attr('src') ||
                $el.find('img').first().attr('src') || '';

              // Parse city/state/zip from address line 2
              const parts2 = addressLine2.split(',').map((s: string) => s.trim());
              const city = parts2[0] || 'West Palm Beach';
              const stateZip = (parts2[1] || 'FL 33401').trim().split(/\s+/);

              listings.push({
                source: this.source,
                url: fullUrl,
                title: addressLine1,
                address: addressLine1,
                city,
                state: stateZip[0] || 'FL',
                zip: stateZip[1] || '33401',
                price,
                bedrooms: bedsMatch ? parseInt(bedsMatch[1]) : null,
                bathrooms: bathsMatch ? parseFloat(bathsMatch[1]) : null,
                sqft: sqftMatch ? parseInt(sqftMatch[1].replace(/,/g, '')) : null,
                propertyType: null,
                listingType: 'sale',
                description: null,
                imageUrls: imgSrc ? [imgSrc] : [],
                latitude: null,
                longitude: null,
                scrapedAt: new Date(),
              });

              foundOnPage++;
            } catch {
              // Skip
            }
          });
        }

        if (foundOnPage === 0) break;

        if (page < maxPages) {
          await this.randomDelay(3000, 6000);
        }
      }

      const newCount = await this.deduplicateAndSave(listings);
      console.log(`[Realtor.com] Scraped ${listings.length} listings, ${newCount} new.`);

      return listings;
    } catch (error: any) {
      console.error(`[Realtor.com] Scraping failed:`, error.message);
      if (listings.length > 0) {
        await this.deduplicateAndSave(listings);
      }
      return listings;
    }
  }

  private parseJsonResult(result: any): ScrapedListing | null {
    try {
      const location = result.location || {};
      const address = location.address || {};
      const streetAddress = address.line || '';
      const city = address.city || 'West Palm Beach';
      const state = address.state_code || 'FL';
      const zip = address.postal_code || '33401';

      const price = result.list_price || 0;
      if (!price) return null;

      const description = result.description || {};

      return {
        source: this.source,
        externalId: result.property_id || undefined,
        url: result.href
          ? (result.href.startsWith('http') ? result.href : `https://www.realtor.com${result.href}`)
          : '',
        title: streetAddress,
        address: streetAddress,
        city,
        state,
        zip,
        price,
        bedrooms: description.beds ?? null,
        bathrooms: description.baths ?? null,
        sqft: description.sqft ?? null,
        propertyType: description.type || result.prop_type || null,
        listingType: 'sale',
        description: description.text || null,
        imageUrls: result.primary_photo?.href ? [result.primary_photo.href] : [],
        latitude: location.address?.coordinate?.lat ?? null,
        longitude: location.address?.coordinate?.lon ?? null,
        scrapedAt: new Date(),
      };
    } catch {
      return null;
    }
  }
}
