-- جدول اشتراكات Web Push (بديل fcm_tokens)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_type  text        NOT NULL CHECK (user_type IN ('salon', 'customer')),
  user_id    integer     NOT NULL,
  endpoint   text        NOT NULL UNIQUE,
  p256dh     text        NOT NULL DEFAULT '',
  auth_key   text        NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_type, user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- فقط service role يستطيع الوصول (Edge Functions تستخدم service role key)
CREATE POLICY "service_role_only" ON push_subscriptions
  USING (false) WITH CHECK (false);
