import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if credentials are configured
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Supabase credentials missing! Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.');
}

// Create client (will be null if credentials missing)
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Safe wrapper that checks if supabase exists
export const isSupabaseConfigured = () => supabase !== null;
