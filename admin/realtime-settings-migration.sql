-- تفعيل Supabase Realtime على جدول app_settings
-- ينفَّذ مرة واحدة في Supabase SQL Editor

ALTER PUBLICATION supabase_realtime ADD TABLE app_settings;
