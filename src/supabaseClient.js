// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dgdjjyxjnpzqqofdqxdp.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_cjsjwayzjMDQLS98ra5gtA_H0jqjXbg';

// Fallback or explicit check
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Missing Env Vars - using fallback values");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);