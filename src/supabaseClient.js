// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
// Fallback or explicit check
if (!supabaseUrl || !supabaseAnonKey) console.warn("Missing Env Vars");

export const supabase = createClient(supabaseUrl, supabaseAnonKey);