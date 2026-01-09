import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  githubToken: text("githubToken"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Repository analysis results
 * Stores metadata and aggregate statistics for each analyzed GitHub repository
 */
export const repositories = mysqlTable("repositories", {
  id: int("id").autoincrement().primaryKey(),
  fullName: varchar("fullName", { length: 255 }).notNull().unique(), // e.g., "vercel/next.js"
  url: varchar("url", { length: 512 }).notNull(),
  starCount: int("starCount").notNull(), // Total stars at analysis time
  analyzedCount: int("analyzedCount").notNull(), // Number of stargazers analyzed
  unknownCount: int("unknownCount").notNull(), // Number with unresolved locations
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  fullNameIdx: index("fullName_idx").on(table.fullName),
}));

export type Repository = typeof repositories.$inferSelect;
export type InsertRepository = typeof repositories.$inferInsert;

/**
 * Country distribution statistics for each repository
 * Stores the count of stargazers per country for visualization
 */
export const countryStats = mysqlTable("countryStats", {
  id: int("id").autoincrement().primaryKey(),
  repositoryId: int("repositoryId").notNull(),
  countryCode: varchar("countryCode", { length: 2 }).notNull(), // ISO 3166-1 alpha-2
  countryName: varchar("countryName", { length: 255 }).notNull(),
  count: int("count").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  repoCountryIdx: index("repo_country_idx").on(table.repositoryId, table.countryCode),
}));

export type CountryStat = typeof countryStats.$inferSelect;
export type InsertCountryStat = typeof countryStats.$inferInsert;

/**
 * Location geocoding cache
 * Caches location string -> country code mappings to reduce API calls
 */
export const locationCache = mysqlTable("locationCache", {
  id: int("id").autoincrement().primaryKey(),
  locationText: varchar("locationText", { length: 512 }).notNull().unique(),
  countryCode: varchar("countryCode", { length: 2 }), // NULL if location cannot be resolved
  countryName: varchar("countryName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  locationIdx: index("location_idx").on(table.locationText),
}));

export type LocationCache = typeof locationCache.$inferSelect;
export type InsertLocationCache = typeof locationCache.$inferInsert;
