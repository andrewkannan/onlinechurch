import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

// Ensure DATABASE_URL is always defined even if .env is not loaded (e.g. Vercel / Cloud)
const isServerless = Boolean(
  process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NETLIFY
);

if (!process.env.DATABASE_URL || (isServerless && process.env.DATABASE_URL.startsWith("file:./"))) {
  process.env.DATABASE_URL = isServerless
    ? "file:/tmp/church.db"
    : "file:./dev.db";
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  dbInitialized: boolean | undefined;
  fallbackStore: Record<string, any> | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/**
 * Automatically creates SQLite tables if they don't exist yet
 * (e.g. on fresh Vercel /tmp database or first local run).
 */
export async function ensureDbReady(): Promise<boolean> {
  if (globalForPrisma.dbInitialized) return true;

  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ServiceSession" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "title" TEXT NOT NULL DEFAULT 'Sunday Worship Service',
        "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "endedAt" DATETIME,
        "isActive" BOOLEAN NOT NULL DEFAULT 1,
        "peakViewersYT" INTEGER NOT NULL DEFAULT 0,
        "peakViewersIG" INTEGER NOT NULL DEFAULT 0,
        "notes" TEXT
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BroadcastMessage" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "sessionId" TEXT,
        "content" TEXT NOT NULL,
        "target" TEXT NOT NULL DEFAULT 'BOTH',
        "status" TEXT NOT NULL DEFAULT 'SENT',
        "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "ytStatus" TEXT,
        "igStatus" TEXT
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PresetTemplate" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "label" TEXT NOT NULL,
        "category" TEXT NOT NULL DEFAULT 'GENERAL',
        "content" TEXT NOT NULL,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "isDefault" BOOLEAN NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PrayerRequest" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "sessionId" TEXT,
        "requesterName" TEXT NOT NULL,
        "requestText" TEXT NOT NULL,
        "platform" TEXT NOT NULL DEFAULT 'BOTH',
        "status" TEXT NOT NULL DEFAULT 'OPEN',
        "aiDraftedResponse" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "VisitorLog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "sessionId" TEXT,
        "name" TEXT NOT NULL,
        "location" TEXT,
        "platform" TEXT NOT NULL DEFAULT 'YOUTUBE',
        "notes" TEXT,
        "connectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ServiceReport" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "sessionId" TEXT NOT NULL UNIQUE,
        "totalAttendance" INTEGER NOT NULL DEFAULT 0,
        "totalPrayers" INTEGER NOT NULL DEFAULT 0,
        "totalVisitors" INTEGER NOT NULL DEFAULT 0,
        "totalMessagesSent" INTEGER NOT NULL DEFAULT 0,
        "aiExecutiveSummary" TEXT,
        "pastorTakeaways" TEXT,
        "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AppConfig" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
        "churchName" TEXT NOT NULL DEFAULT 'Grace Online Church',
        "subtitle" TEXT NOT NULL DEFAULT 'Live Stream Broadcast & Ministry Hub',
        "logoUrl" TEXT,
        "defaultTranslation" TEXT NOT NULL DEFAULT 'NIV',
        "youtubeApiKey" TEXT,
        "youtubeLiveChatId" TEXT,
        "instagramAccessToken" TEXT,
        "instagramLiveVideoId" TEXT,
        "geminiApiKey" TEXT,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure new columns exist on older local SQLite files
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "AppConfig" ADD COLUMN "subtitle" TEXT DEFAULT 'Live Stream Broadcast & Ministry Hub';`);
    } catch {}
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "AppConfig" ADD COLUMN "logoUrl" TEXT;`);
    } catch {}
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "AppConfig" ADD COLUMN "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP;`);
    } catch {}

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SermonCue" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "sessionId" TEXT,
        "cueType" TEXT NOT NULL DEFAULT 'MAIN_POINT',
        "label" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "isReleased" BOOLEAN NOT NULL DEFAULT 0,
        "releasedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    globalForPrisma.dbInitialized = true;
    return true;
  } catch (err) {
    console.warn("SQLite auto-init warning (falling back to JSON store):", err);
    return false;
  }
}

/**
 * Fallback JSON file + memory store so settings and sessions ALWAYS persist
 * even in serverless environments where SQLite binaries may be restricted.
 */
const STORE_PATH = isServerless
  ? "/tmp/church-config-store.json"
  : path.join(process.cwd(), "prisma", "church-config-store.json");

export function readFallbackStore(): Record<string, any> {
  if (globalForPrisma.fallbackStore) {
    return globalForPrisma.fallbackStore;
  }
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      globalForPrisma.fallbackStore = parsed;
      return parsed;
    }
  } catch {}
  globalForPrisma.fallbackStore = {};
  return globalForPrisma.fallbackStore;
}

export function writeFallbackStore(key: string, value: any) {
  const current = readFallbackStore();
  current[key] = value;
  globalForPrisma.fallbackStore = current;
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(current, null, 2), "utf-8");
  } catch {}
}
