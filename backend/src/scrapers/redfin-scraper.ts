import axios from 'axios';
import * as cheerio from 'cheerio';
import { BaseScraper, ScrapedListing } from './base-scraper';

export class RedfinScraper extends BaseScraper {
  source = 'redfin';

  private baseUrl = 'https://www.redfin.com/city/19544/FL/West-Palm-Beach/filter/sort=lo-days';

  private headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: 'https://www.redfin.com/',
    'Cache-Control': 'no-cache',
  };

  // Redfin also has a "stingray" API that returns JSON
  private apiUrl =
    'https://www.redfin.com/stingray/api/gis?al=1&region_id=19544&region_type=6&num_homes=50&sf=1,2,3,5,6,7&status=1&uipt=1,2,3,4,5,6';

  async scrape(): Promise<ScrapedListing[]> {
    const listings: ScrapedListing[] = [];

    try {
      // Try the Redfin API first
      const apiListings = await this.scrapeApi();
      if (apiListings.length > 0) {
        listings.push(...apiListings);
      } else {
        // Fallback to HTML scraping
        const htmlListings = await this.scrapeHtml();
        listings.push(...htmlListings);
      }

      const newCount = await this.deduplicateAndSave(listings);
      console.log(`[Redfin] Scraped ${listings.length} listings, ${newCount} new.`);

      return listings;
    } catch (error: any) {
      console.error(`[Redfin] Scraping failed:`, error.message);
      if (listings.length > 0) {
        await this.deduplicateAndSave(listings);
      }
      return listings;
    }
  }

  private async scrapeApi(): Promise<ScrapedListing[]> {
    const listings: ScrapedListing[] = [];

    try {
      console.log(`[Redfin] Trying API endpoint`);

      const response = await axios.get(this.apiUrl, {
        headers: {
          ...this.headers,
          Accept: 'application/json',
        },
        timeout: 30000,
      });

      // Redfin API returns data with a prefix like "{}&&" that needs stripping
      let data = response.data;
      if (typeof data === 'string') {
        data = data.replace(/^[^{[]*/, '');
        data = JSON.parse(data);
      }

      const homes = data?.payload?.homes || data?.homes || [];

      for (const home of homes) {
        try {
          const mlsData = home.mlsId || {};
          const price = home.price?.value || 0;
          if (!price) continue;

          const streetAddress = home.streetLine?.value || '';
          const city = home.city || 'West Palm Beach';
          const state = home.state || 'FL';
          const zip = home.zip || '33401';

          listings.push({
            source: this.source,
            externalId: home.propertyId ? String(home.propertyId) : mlsData.value || undefined,
            url: home.url
              ? `https://www.redfin.com${home.url}`
              : '',
            title: streetAddress,
            address: streetAddress,
            city,
            state,
            zip,
            price,
            bedrooms: home.beds ?? null,
            bathrooms: home.baths ?? null,
            sqft: home.sqFt?.value ?? null,
            propertyType: this.mapPropertyType(home.propertyType),
            listingType: 'sale',
            description: home.listingRemarks || null,
            imageUrls: home.photos?.length ? [home.photos[0].photoUrl?.value || ''] : [],
            latitude: home.latLong?.value?.latitude ?? null,
            longitude: home.latLong?.value?.longitude ?? null,
            scrapedAt: new Date(),
          });
        } catch {
          // skip
        }
      }
    } catch (error: any) {
      console.log(`[Redfin] API scrape failed, will try HTML: ${error.message}`);
    }

    return listings;
  }

  private async scrapeHtml(): Promise<ScrapedListing[]> {
    const listings: ScrapedListing[] = [];
    const maxPages = 3;

    for (let page = 1; page <= maxPages; page++) {
      const url = page === 1 ? this.baseUrl : `${this.baseUrl}/page-${page}`;

      console.log(`[Redfin] Scraping HTML page ${page}: ${url}`);

      try {
        const response = await axios.get(url, {
          headers: this.headers,
          timeout: 30000,
        });

        const $ = cheerio.load(response.data);
        let foundOnPage = 0;

        // Redfin home card selectors
        $('.HomeCardContainer .HomeCard, .bp-homeCard, [data-rf-test-id="home-card"]').each((_i, el) => {
          try {
            const $el = $(el);

            const priceText = $el.find('.homecardV2Price, .bp-Homecard__Price--value, .HomeCardPrice').text().trim();
            const price = parseInt(priceText.replace(/[^0-9]/g, ''));
            if (!price) return;

            const addressText = $el.find('.homeAddressV2, .bp-Homecard__Address, .HomeCardAddress').text().trim();
            if (!addressText) return;

            const statsText = $el.find('.HomeStatsV2, .bp-Homecard__Stats, .HomeCardStats').text();
            const bedsMatch = statsText.match(/(\d+)\s*(?:Beds?|BD)/i);
            const bathsMatch = statsText.match(/(\d+\.?\d*)\s*(?:Baths?|BA)/i);
            const sqftMatch = statsText.match(/([\d,]+)\s*(?:Sq\.?\s*Ft|SF)/i);

            const link = $el.find('a.link-and-anchor, a[href*="/FL/"]').attr('href') || '';
            const fullUrl = link.startsWith('http') ? link : `https://www.redfin.com${link}`;

            const imgSrc = $el.find('img.bp-Homecard__Photo--image, img[data-rf-test-id="home-card-photo"]').attr('src') ||
              $el.find('img').first().attr('src') || '';

            const addressParts = addressText.split(',').map((s: string) => s.trim());

            listings.push({
              source: this.source,
              url: fullUrl,
              title: addressParts[0] || addressText,
              address: addressParts[0] || addressText,
              city: addressParts[1] || 'West Palm Beach',
              state: 'FL',
              zip: (addressParts[2] || '').replace(/[^0-9]/g, '') || '33401',
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

        if (foundOnPage === 0) break;

        // Rate limit
        if (page < maxPages) {
          await this.randomDelay(3000, 6000);
        }
      } catch (error: any) {
        console.error(`[Redfin] Page ${page} failed:`, error.message);
        break;
      }
    }

    return listings;
  }

  private mapPropertyType(type?: number | string): string | null {
    const typeMap: Record<string, string> = {
      '1': 'single_family',
      '2': 'condo',
      '3': 'townhouse',
      '4': 'multi_family',
      '5': 'land',
      '6': 'other',
    };
    return type ? typeMap[String(type)] || null : null;
  }
}
