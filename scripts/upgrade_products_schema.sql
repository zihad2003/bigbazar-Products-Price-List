-- Add new columns for enhanced product features
alter table products 
add column if not exists is_new boolean default false,
add column if not exists category text default 'Women',
add column if not exists video_url text,
add column if not exists original_price numeric;

-- Ensure RLS policies allow updates to these columns (usually unnecessary if policy is 'true' for proper update, but good to check)
