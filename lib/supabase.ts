import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gfkycxdbbzczrwikhcpr.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdma3ljeGRiYnpjenJ3aWtoY3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3ODI1OTMsImV4cCI6MjA4NTM1ODU5M30.DbXQr0nL8cfsRskYy-j4mHsgblgd1Zo5Ka5ccFmSYV8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface CodePageRow {
  id: number;
  codepages: string; // JSON string of SharedPageData
  created_at?: string;
}

export interface SharedPageData {
  id: string;
  title: string;
  html: string;
  createdAt: string;
  viewport?: string;
}

/** Publish a page to Supabase */
export async function publishPageToSupabase(page: SharedPageData): Promise<boolean> {
  const { error } = await supabase
    .from('NHP')
    .insert({ codepages: JSON.stringify(page) });

  if (error) {
    console.error('Supabase publish error:', error);
    return false;
  }
  return true;
}

/** Fetch a shared page from Supabase by its share ID */
export async function getSharedPageFromSupabase(shareId: string): Promise<SharedPageData | null> {
  const { data, error } = await supabase
    .from('NHP')
    .select('codepages')
    .order('id', { ascending: false })
    .limit(200);

  if (error || !data) {
    console.error('Supabase fetch error:', error);
    return null;
  }

  for (const row of data) {
    try {
      const parsed: SharedPageData = JSON.parse(row.codepages);
      if (parsed.id === shareId) return parsed;
    } catch {
      // skip malformed rows
    }
  }

  return null;
}

/** Fetch all shared pages from Supabase (most recent first) */
export async function listSharedPagesFromSupabase(): Promise<SharedPageData[]> {
  const { data, error } = await supabase
    .from('NHP')
    .select('id, codepages')
    .order('id', { ascending: false })
    .limit(50);

  if (error || !data) {
    console.error('Supabase list error:', error);
    return [];
  }

  const pages: SharedPageData[] = [];
  for (const row of data) {
    try {
      const parsed: SharedPageData = JSON.parse(row.codepages);
      pages.push(parsed);
    } catch {
      // skip malformed
    }
  }
  return pages;
}

/** Delete a shared page from Supabase by its share ID */
export async function deleteSharedPageFromSupabase(shareId: string): Promise<boolean> {
  // We need to find the row by parsing codepages JSON
  const { data, error } = await supabase
    .from('NHP')
    .select('id, codepages')
    .order('id', { ascending: false })
    .limit(200);

  if (error || !data) return false;

  for (const row of data) {
    try {
      const parsed: SharedPageData = JSON.parse(row.codepages);
      if (parsed.id === shareId) {
        const { error: delError } = await supabase
          .from('NHP')
          .delete()
          .eq('id', row.id);
        return !delError;
      }
    } catch {
      // skip
    }
  }
  return false;
}
