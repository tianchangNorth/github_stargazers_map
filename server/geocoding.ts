import { makeRequest } from './_core/map';
import { getLocationFromCache, cacheLocation } from './db';

export interface CountryInfo {
  code: string; // ISO 3166-1 alpha-2
  name: string;
}

/**
 * Parse location string to country using Google Maps Geocoding API
 * Returns null if location cannot be resolved
 */
export async function parseLocationToCountry(locationText: string): Promise<CountryInfo | null> {
  if (!locationText || locationText.trim() === '') {
    return null;
  }

  const normalized = locationText.trim().toLowerCase();

  // Check cache first
  const cached = await getLocationFromCache(normalized);
  if (cached) {
    if (!cached.countryCode) return null;
    return {
      code: cached.countryCode,
      name: cached.countryName!,
    };
  }

  // Call Google Maps Geocoding API
  try {
    const response = await makeRequest<{
      results: Array<{
        address_components: Array<{
          long_name: string;
          short_name: string;
          types: string[];
        }>;
      }>;
      status: string;
    }>('/maps/api/geocode/json', {
      address: locationText,
    });

    if (response.status !== 'OK' || !response.results || response.results.length === 0) {
      // Cache negative result
      await cacheLocation({
        locationText: normalized,
        countryCode: null,
        countryName: null,
      });
      return null;
    }

    // Extract country from address components
    const addressComponents = response.results[0]!.address_components;
    const countryComponent = addressComponents.find(component =>
      component.types.includes('country')
    );

    if (!countryComponent) {
      // Cache negative result
      await cacheLocation({
        locationText: normalized,
        countryCode: null,
        countryName: null,
      });
      return null;
    }

    const countryInfo: CountryInfo = {
      code: countryComponent.short_name,
      name: countryComponent.long_name,
    };

    // Cache positive result
    await cacheLocation({
      locationText: normalized,
      countryCode: countryInfo.code,
      countryName: countryInfo.name,
    });

    return countryInfo;
  } catch (error) {
    console.error('[Geocoding] Error parsing location:', locationText, error);
    // Don't cache errors - allow retry
    return null;
  }
}

/**
 * Batch process locations with rate limiting
 */
export async function batchParseLocations(
  locations: string[],
  onProgress?: (processed: number, total: number) => void
): Promise<Map<string, CountryInfo | null>> {
  const results = new Map<string, CountryInfo | null>();
  const uniqueLocations = Array.from(new Set(locations.filter(loc => loc && loc.trim())));

  for (let i = 0; i < uniqueLocations.length; i++) {
    const location = uniqueLocations[i]!;
    const country = await parseLocationToCountry(location);
    results.set(location.trim().toLowerCase(), country);

    if (onProgress) {
      onProgress(i + 1, uniqueLocations.length);
    }

    // Rate limiting: small delay between requests
    if (i < uniqueLocations.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}
