import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, repositories, countryStats, locationCache, InsertRepository, InsertCountryStat, InsertLocationCache } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Repository queries
export async function getRepositoryByFullName(fullName: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(repositories).where(eq(repositories.fullName, fullName)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createRepository(repo: InsertRepository) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(repositories).values(repo);
  return result;
}

export async function updateRepository(id: number, updates: Partial<InsertRepository>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(repositories).set(updates).where(eq(repositories.id, id));
}

// Country stats queries
export async function getCountryStatsByRepositoryId(repositoryId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(countryStats).where(eq(countryStats.repositoryId, repositoryId));
}

export async function createCountryStats(stats: InsertCountryStat[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (stats.length === 0) return;
  await db.insert(countryStats).values(stats);
}

export async function deleteCountryStatsByRepositoryId(repositoryId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(countryStats).where(eq(countryStats.repositoryId, repositoryId));
}

// Location cache queries
export async function getLocationFromCache(locationText: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(locationCache).where(eq(locationCache.locationText, locationText)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function cacheLocation(location: InsertLocationCache) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(locationCache).values(location).onDuplicateKeyUpdate({
    set: {
      countryCode: location.countryCode,
      countryName: location.countryName,
    },
  });
}
