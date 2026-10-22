import { drizzle as drizzlePgLite } from 'drizzle-orm/pglite';
import { drizzle as drizzleNodePg } from 'drizzle-orm/node-postgres';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import * as schema from './schema.ts';
import fs from 'fs';
import path from 'path';
import os from 'os';

declare global {
  var _drizzleDb: any | undefined;
  var _pgPool: pg.Pool | undefined;
  var _pgliteClient: PGlite | undefined;
  var _dbReadyPromise: Promise<void> | undefined;
}

const INIT_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  assigned_class TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  password_hash TEXT,
  password_plain TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classes (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  admin_email TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  admission_no TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  class_code TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  bio TEXT,
  created_by_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS class_officers (
  id SERIAL PRIMARY KEY,
  class_code TEXT NOT NULL,
  role_title TEXT NOT NULL,
  holder_name TEXT NOT NULL,
  admission_no TEXT,
  photo_url TEXT NOT NULL,
  responsibilities TEXT,
  updated_by_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competition_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  max_participants_per_class INTEGER NOT NULL,
  description TEXT NOT NULL,
  display_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS participants (
  id SERIAL PRIMARY KEY,
  admission_no TEXT,
  full_name TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  class_code TEXT NOT NULL,
  category_name TEXT NOT NULL,
  own_topic TEXT,
  short_description TEXT,
  publication_status TEXT NOT NULL DEFAULT 'PUBLISHED',
  created_by_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posters (
  id SERIAL PRIMARY KEY,
  class_code TEXT NOT NULL,
  category_name TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  poster_image_url TEXT NOT NULL,
  participants_snapshot TEXT NOT NULL,
  participant_count INTEGER NOT NULL DEFAULT 0,
  generation_status TEXT NOT NULL DEFAULT 'COMPLETED',
  generation_error TEXT,
  publication_status TEXT NOT NULL DEFAULT 'PUBLISHED',
  is_featured BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feed_posts (
  id SERIAL PRIMARY KEY,
  class_code TEXT NOT NULL,
  title TEXT NOT NULL,
  caption TEXT NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'PHOTO',
  status TEXT NOT NULL DEFAULT 'PENDING',
  rejection_reason TEXT,
  submitted_by_email TEXT NOT NULL,
  submitted_by_name TEXT NOT NULL,
  reviewed_by_email TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weekly_results (
  id SERIAL PRIMARY KEY,
  result_category TEXT NOT NULL,
  winner_name TEXT NOT NULL,
  winner_photo_url TEXT NOT NULL,
  winner_class TEXT NOT NULL,
  week_label TEXT NOT NULL,
  result_date TEXT NOT NULL,
  remarks TEXT,
  publication_status TEXT NOT NULL DEFAULT 'PUBLISHED',
  published_by_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS library_resources (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT NOT NULL,
  library_scope TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size TEXT NOT NULL,
  content_preview TEXT,
  publication_status TEXT NOT NULL DEFAULT 'PUBLISHED',
  uploaded_by_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  class_code TEXT,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_settings (
  id SERIAL PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
`;

export const DEFAULT_SUPABASE_POSTGRES_URL =
  'postgresql://postgres:9934886605dilD@db.sdwohzszgondniptbktd.supabase.co:5432/postgres';

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  DEFAULT_SUPABASE_POSTGRES_URL;

let activeDb: any;
let activePool: any;

try {
  if (databaseUrl) {
    // Direct PostgreSQL connection to live Supabase database
    if (!global._pgPool) {
      global._pgPool = new pg.Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 7000,
      });
      global._pgPool.on('error', (err: any) => {
        console.warn('Supabase PG pool background notice:', err?.message || err);
      });
    }
    activePool = global._pgPool;
    activeDb = drizzleNodePg(activePool, { schema });
  }
} catch (e: any) {
  console.warn('Direct PostgreSQL init notice, using fallback:', e?.message || e);
}

if (!activeDb) {
  // Resilient in-memory PGlite fallback
  if (!global._pgliteClient) {
    global._pgliteClient = new PGlite();
  }
  activePool = global._pgliteClient;
  activeDb = drizzlePgLite(activePool, { schema });
}

export async function ensureDbReady(): Promise<void> {
  if (global._dbReadyPromise) return global._dbReadyPromise;

  global._dbReadyPromise = (async () => {
    try {
      if (global._pgPool) {
        const c = await global._pgPool.connect();
        try {
          await c.query('SELECT 1');
        } finally {
          c.release();
        }
      } else if (global._pgliteClient) {
        await global._pgliteClient.waitReady;
        await global._pgliteClient.exec(INIT_SCHEMA_SQL);
      }
    } catch (err: any) {
      console.warn('Database ready notice:', err?.message || err);
    }
  })();

  return global._dbReadyPromise;
}

// Kick off schema ready immediately in background
ensureDbReady().catch(() => {});

export const client = activePool;
export const pool = activePool;
export const db = activeDb;
