import { describe, expect, it, beforeAll } from "vitest";
import { getDb, cacheLocation, getLocationFromCache } from "./db";

describe("Database Operations", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available for testing");
    }
  });

  describe("Location Cache", () => {
    it("should cache and retrieve location", async () => {
      const locationText = "san francisco, ca";
      const countryCode = "US";
      const countryName = "United States";

      // Cache the location
      await cacheLocation({
        locationText,
        countryCode,
        countryName,
      });

      // Retrieve from cache
      const cached = await getLocationFromCache(locationText);

      expect(cached).toBeDefined();
      expect(cached?.locationText).toBe(locationText);
      expect(cached?.countryCode).toBe(countryCode);
      expect(cached?.countryName).toBe(countryName);
    });

    it("should cache negative result (null country)", async () => {
      const locationText = "unknown location xyz";

      // Cache negative result
      await cacheLocation({
        locationText,
        countryCode: null,
        countryName: null,
      });

      // Retrieve from cache
      const cached = await getLocationFromCache(locationText);

      expect(cached).toBeDefined();
      expect(cached?.locationText).toBe(locationText);
      expect(cached?.countryCode).toBeNull();
      expect(cached?.countryName).toBeNull();
    });

    it("should return undefined for non-existent location", async () => {
      const cached = await getLocationFromCache("non-existent-location-12345");
      expect(cached).toBeUndefined();
    });
  });
});
