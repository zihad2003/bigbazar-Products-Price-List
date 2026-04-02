// src/supabaseClient.js
// ⚡ MIGRATED: Now routes through local MySQL API instead of Supabase
// All existing imports of `supabase` from this file will continue to work.

import { supabase } from './api/client';

export { supabase };
export default supabase;