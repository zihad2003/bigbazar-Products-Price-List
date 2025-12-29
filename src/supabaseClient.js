
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lrvtowerpdfyhvnjwphf.supabase.co';
const supabaseAnonKey = 'sb_publishable_6UwQwF30pSy548nDN2XKpg_bmIU6BI-';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);