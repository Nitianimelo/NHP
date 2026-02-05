import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gfkycxdbbzczrwikhcpr.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdma3ljeGRiYnpjenJ3aWtoY3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3ODI1OTMsImV4cCI6MjA4NTM1ODU5M30.DbXQr0nL8cfsRskYy-j4mHsgblgd1Zo5Ka5ccFmSYV8';
const SUPABASE_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdma3ljeGRiYnpjenJ3aWtoY3ByIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTc4MjU5MywiZXhwIjoyMDg1MzU4NTkzfQ.zAB2HFhpyrtLD4aOvxDqS63Rvh_NwxgtS8ZhCj8xSnw';

// Anon client for inserts (respects RLS)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Service role client for reads — bypasses RLS so shared pages work cross-browser
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export interface SharedPageData {
  id: string;
  title: string;
  html: string;
  createdAt: string;
  viewport?: string;
}

/** Publish a page to Supabase */
export async function publishPageToSupabase(page: SharedPageData): Promise<boolean> {
  // Use admin client to guarantee insert works regardless of RLS
  const { error } = await supabaseAdmin
    .from('NHP')
    .insert({ codepages: JSON.stringify(page) });

  if (error) {
    console.error('[Supabase] publish error:', error.message, error.details, error.hint);
    return false;
  }
  return true;
}

/** Fetch a shared page from Supabase by its share ID */
export async function getSharedPageFromSupabase(shareId: string): Promise<SharedPageData | null> {
  // Use admin client to bypass RLS — this is what makes cross-browser work
  // Use .like() filter to find the specific row without downloading everything
  const { data, error } = await supabaseAdmin
    .from('NHP')
    .select('codepages')
    .like('codepages', `%"id":"${shareId}"%`)
    .limit(1);

  if (error) {
    console.error('[Supabase] fetch error:', error.message, error.details, error.hint);
    return null;
  }

  if (!data || data.length === 0) {
    console.warn('[Supabase] no rows found for shareId:', shareId);
    return null;
  }

  try {
    return JSON.parse(data[0].codepages) as SharedPageData;
  } catch (e) {
    console.error('[Supabase] JSON parse error:', e);
    return null;
  }
}

/** Fetch all shared pages from Supabase (most recent first) */
export async function listSharedPagesFromSupabase(): Promise<SharedPageData[]> {
  const { data, error } = await supabaseAdmin
    .from('NHP')
    .select('id, codepages')
    .order('id', { ascending: false })
    .limit(50);

  if (error || !data) {
    console.error('[Supabase] list error:', error?.message);
    return [];
  }

  const pages: SharedPageData[] = [];
  for (const row of data) {
    try {
      pages.push(JSON.parse(row.codepages));
    } catch {
      // skip malformed
    }
  }
  return pages;
}

/** Delete a shared page from Supabase by its share ID */
export async function deleteSharedPageFromSupabase(shareId: string): Promise<boolean> {
  // Find the row first
  const { data, error } = await supabaseAdmin
    .from('NHP')
    .select('id, codepages')
    .like('codepages', `%"id":"${shareId}"%`)
    .limit(1);

  if (error || !data || data.length === 0) return false;

  const { error: delError } = await supabaseAdmin
    .from('NHP')
    .delete()
    .eq('id', data[0].id);

  return !delError;
}

// =====================================================
// Agent CRUD — table: agentnhp
// Columns: id (auto), nome, modelo, system, tipo, temperatura
// =====================================================

export interface SupabaseAgent {
  id?: number;
  nome: string;
  modelo: string;
  system: string;
  tipo: string;
  temperatura: number;
}

/** List all agents from Supabase */
export async function listAgents(): Promise<SupabaseAgent[]> {
  const { data, error } = await supabaseAdmin
    .from('agentnhp')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    console.error('[Supabase] listAgents error:', error.message);
    return [];
  }
  return data || [];
}

/** Get a single agent by ID */
export async function getAgent(id: number): Promise<SupabaseAgent | null> {
  const { data, error } = await supabaseAdmin
    .from('agentnhp')
    .select('*')
    .eq('id', id)
    .limit(1)
    .single();

  if (error) {
    console.error('[Supabase] getAgent error:', error.message);
    return null;
  }
  return data;
}

/** Create a new agent */
export async function createAgent(agent: Omit<SupabaseAgent, 'id'>): Promise<SupabaseAgent | null> {
  const { data, error } = await supabaseAdmin
    .from('agentnhp')
    .insert(agent)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] createAgent error:', error.message);
    return null;
  }
  return data;
}

/** Update an existing agent */
export async function updateAgentInSupabase(id: number, agent: Partial<Omit<SupabaseAgent, 'id'>>): Promise<SupabaseAgent | null> {
  const { data, error } = await supabaseAdmin
    .from('agentnhp')
    .update(agent)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] updateAgent error:', error.message);
    return null;
  }
  return data;
}

/** Delete an agent */
export async function deleteAgentFromSupabase(id: number): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('agentnhp')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Supabase] deleteAgent error:', error.message);
    return false;
  }
  return true;
}
