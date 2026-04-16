-- 20260416000002_add_phone_verification.sql

-- Phone number on profiles. We store the E.164 value in `phone_number`
-- and set `phone_verified_at` on successful OTP verification. The
-- value is stored in plaintext because we need it for re-verification
-- and SMS resends; RLS and column-level grants protect it.

ALTER TABLE profiles ADD COLUMN phone_number TEXT;
ALTER TABLE profiles ADD COLUMN phone_verified_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_number_unique
  ON profiles (phone_number)
  WHERE phone_number IS NOT NULL;

-- Challenges table. Rows are created when send-otp runs and consumed
-- when verify-otp runs. We store a bcrypt-ish hash of the code rather
-- than the plaintext, so an attacker with DB read can't immediately
-- complete a challenge.

CREATE TABLE phone_otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX phone_otp_challenges_user_id_idx ON phone_otp_challenges (user_id);
CREATE INDEX phone_otp_challenges_expires_at_idx ON phone_otp_challenges (expires_at);

ALTER TABLE phone_otp_challenges ENABLE ROW LEVEL SECURITY;

-- Users can see only their own challenges (for UI "code sent" state).
CREATE POLICY phone_otp_self_read ON phone_otp_challenges
  FOR SELECT USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies for clients; only the edge
-- functions (service role) write to this table.
