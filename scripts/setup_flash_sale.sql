-- Create a table for site-wide settings
create table if not exists site_settings (
  id bigint primary key generated always as identity,
  key text unique not null,
  value jsonb not null,
  created_at timestamptz default now()
);

-- Insert default flash sale settings if not exists
insert into site_settings (key, value)
values (
  'flash_sale',
  '{"active": false, "percentage": 0, "end_time": null}'::jsonb
)
on conflict (key) do nothing;

-- Enable RLS
alter table site_settings enable row level security;

-- Policy: Everyone can read settings
create policy "Public can read settings"
  on site_settings for select
  using (true);

-- Policy: Only authenticated users (admins) can update
create policy "Admins can update settings"
  on site_settings for update
  using (auth.role() = 'authenticated');
  
-- Policy: Only authenticated users (admins) can insert
create policy "Admins can insert settings"
  on site_settings for insert
  with check (auth.role() = 'authenticated');
