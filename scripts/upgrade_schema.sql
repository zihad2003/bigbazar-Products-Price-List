-- Add missing columns to support full functionality
alter table products 
add column if not exists original_price numeric,
add column if not exists description text,
add column if not exists video_url text,
add column if not exists is_sale boolean default false,
add column if not exists is_hot boolean default false,
add column if not exists is_sold_out boolean default false,
add column if not exists images text[] default array[]::text[];

-- Ensure site_settings table exists for Flash Sales
create table if not exists site_settings (
  id bigint primary key generated always as identity,
  key text unique not null,
  value jsonb not null,
  created_at timestamptz default now()
);

-- Insert default flash sale settings
insert into site_settings (key, value)
values (
  'flash_sale',
  '{"active": false, "percentage": 0, "end_time": null}'::jsonb
)
on conflict (key) do nothing;

-- Enable Row Level Security (RLS)
alter table site_settings enable row level security;
alter table products enable row level security;

-- Policies
create policy "Public can read products" on products for select using (true);
create policy "Admins can all on products" on products using (auth.role() = 'authenticated');

create policy "Public can read settings" on site_settings for select using (true);
create policy "Admins can all on settings" on site_settings using (auth.role() = 'authenticated');
