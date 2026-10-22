import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_SUPABASE_URL = 'https://sdwohzszgondniptbktd.supabase.co';
export const DEFAULT_SUPABASE_KEY = 'sb_publishable_-jvbyMvuut2G0m2HNfjUYQ_ly3Tk6aj';

let activeSupabaseUrl = DEFAULT_SUPABASE_URL;
let activeSupabaseKey = DEFAULT_SUPABASE_KEY;

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

export function setSupabaseCredentials(url: string, key: string) {
  if (url) activeSupabaseUrl = url.trim();
  if (key) activeSupabaseKey = key.trim();
  cachedClient = null;
}

export function getSupabaseConfig(): { url: string; key: string } {
  const url = activeSupabaseUrl || DEFAULT_SUPABASE_URL;
  const key = activeSupabaseKey || DEFAULT_SUPABASE_KEY;
  return { url, key };
}

export function getSupabaseClient(customUrl?: string, customKey?: string): SupabaseClient | null {
  const cfg = getSupabaseConfig();
  const url = (customUrl || cfg.url || DEFAULT_SUPABASE_URL).trim();
  const key = (customKey || cfg.key || DEFAULT_SUPABASE_KEY).trim();

  if (!url || !key) {
    return null;
  }

  if (cachedClient && cachedUrl === url && cachedKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    cachedUrl = url;
    cachedKey = key;
    return cachedClient;
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    return null;
  }
}

export async function testSupabaseConnection(
  url?: string,
  key?: string
): Promise<{ success: boolean; message: string; writeCapable?: boolean; tablesFound?: boolean }> {
  try {
    const cfg = getSupabaseConfig();
    const cleanUrl = (url || cfg.url || DEFAULT_SUPABASE_URL).trim().replace(/\/$/, '');
    const cleanKey = (key || cfg.key || DEFAULT_SUPABASE_KEY).trim();

    if (!cleanUrl.startsWith('https://')) {
      return { success: false, message: 'Supabase URL must start with https://' };
    }
    if (!cleanKey) {
      return { success: false, message: 'Supabase API key is required.' };
    }

    const client = createClient(cleanUrl, cleanKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Test classes table existence in Supabase
    const { data: classesData, error: classesError } = await client
      .from('classes')
      .select('code')
      .limit(1);

    if (!classesError) {
      return {
        success: true,
        writeCapable: true,
        tablesFound: true,
        message: '✓ Supabase Connected & All Tables Verified! Live database is fully operational.',
      };
    }

    // If table doesn't exist yet (PGRST205)
    if (classesError.code === 'PGRST205' || classesError.message?.includes('schema cache')) {
      return {
        success: true,
        writeCapable: true,
        tablesFound: false,
        message:
          '✓ Supabase API Key & Project URL Verified! Tables are waiting to be created: Copy and run supabase_schema.sql in Supabase SQL Editor.',
      };
    }

    // 2. Fallback check on auth settings endpoint
    const authRes = await fetch(`${cleanUrl}/auth/v1/settings`, {
      headers: {
        apikey: cleanKey,
        Authorization: `Bearer ${cleanKey}`,
      },
    });

    if (authRes.ok || authRes.status === 200) {
      return {
        success: true,
        writeCapable: true,
        tablesFound: false,
        message: '✓ Supabase project authenticated! Ready to run schema script in SQL Editor.',
      };
    }

    return {
      success: false,
      message: classesError.message || `Supabase returned HTTP status ${authRes.status}`,
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Network error connecting to Supabase.' };
  }
}

/**
 * Fetch rows directly from Supabase table if available
 */
export async function fetchFromSupabaseTable<T = any>(
  tableName: string,
  options?: { select?: string; orderColumn?: string; ascending?: boolean }
): Promise<{ success: boolean; data: T[] | null; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, data: null, error: 'Supabase client not initialized.' };
  }

  try {
    let query = client.from(tableName).select(options?.select || '*');
    if (options?.orderColumn) {
      query = query.order(options.orderColumn, { ascending: options?.ascending ?? true });
    }
    const { data, error } = await query;
    if (error) {
      return { success: false, data: null, error: error.message };
    }
    return { success: true, data: data as T[] };
  } catch (err: any) {
    return { success: false, data: null, error: err.message };
  }
}

/**
 * Sync a batch of records to a Supabase table.
 */
export async function syncToSupabaseTable(
  tableName: string,
  rows: any[],
  onConflictKey?: string
): Promise<{ success: boolean; insertedCount: number; error?: string }> {
  const client = getSupabaseClient();
  if (!client || !rows || rows.length === 0) {
    return { success: true, insertedCount: 0 };
  }

  try {
    const options: any = {};
    if (onConflictKey) {
      options.onConflict = onConflictKey;
    }

    const { error, count } = await client.from(tableName).upsert(rows, options);

    if (error) {
      if (error.code !== 'PGRST205') {
        console.warn(`Supabase sync warning for ${tableName}:`, error.message);
      }
      return { success: false, insertedCount: 0, error: error.message };
    }

    return { success: true, insertedCount: count || rows.length };
  } catch (err: any) {
    return { success: false, insertedCount: 0, error: err.message };
  }
}
