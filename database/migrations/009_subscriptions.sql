-- Parent premium subscriptions
CREATE TABLE subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  plan text NOT NULL CHECK (plan IN ('monthly', 'annual')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
  price_cents integer NOT NULL,
  started_at timestamptz DEFAULT now(),
  current_period_end timestamptz NOT NULL,
  cancelled_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

-- Track monthly join request usage
CREATE TABLE join_request_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  month text NOT NULL, -- format: '2026-04'
  request_count integer DEFAULT 0,
  UNIQUE (user_id, month)
);

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_request_usage ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can read their own usage
CREATE POLICY "Users can view own usage"
  ON join_request_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert/update their own usage
CREATE POLICY "Users can upsert own usage"
  ON join_request_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
  ON join_request_usage FOR UPDATE
  USING (auth.uid() = user_id);
