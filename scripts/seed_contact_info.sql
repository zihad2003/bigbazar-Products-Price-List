-- Seed contact_info in site_settings if not exists
INSERT INTO site_settings (key, value)
VALUES 
  ('contact_info', '{"whatsapp": "8801335945351", "facebook": "109056644140792", "tiktok": "https://tiktok.com/@bigbazar", "instagram": "https://instagram.com/bigbazar"}')
ON CONFLICT (key) DO NOTHING;
