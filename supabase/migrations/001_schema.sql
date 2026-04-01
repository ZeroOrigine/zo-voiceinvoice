-- ============================================================
-- VoiceInvoice — Production PostgreSQL Schema
-- Category: Finance SaaS
-- Kernel: Voice-to-invoice creation (speak → invoice generated)
-- Layer 0: Database schema — the skeleton of the kernel
-- ============================================================

-- ============================================================
-- STEP 1: ENUMS
-- Define all status enums before tables reference them.
-- ============================================================

CREATE TYPE subscription_status AS ENUM (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'incomplete',
  'incomplete_expired',
  'paused'
);

CREATE TYPE invoice_status AS ENUM (
  'draft',
  'sent',
  'viewed',
  'paid',
  'overdue',
  'void'
);

CREATE TYPE user_role AS ENUM (
  'user',
  'admin'
);

-- ============================================================
-- STEP 2: UTILITY FUNCTIONS
-- Reusable triggers applied to every table.
-- ============================================================

-- Auto-update updated_at on every row modification
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-create profile row when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 3: TABLES
-- 5 tables total. Each serves ONE purpose.
--   1. profiles     — user identity & settings (extends auth.users)
--   2. clients      — invoice recipients (who you bill)
--   3. invoices     — the KERNEL entity (voice → invoice)
--   4. subscriptions — Stripe billing state
--   5. payments     — one-time charges & invoice payment records
-- ============================================================

-- ----- TABLE 1: profiles -----
-- Purpose: Extend Supabase auth.users with app-specific data.
-- One row per user. Source of truth for display name, role, business info.
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  full_name   text NOT NULL DEFAULT '',
  role        user_role NOT NULL DEFAULT 'user',
  business_name   text NOT NULL DEFAULT '',
  business_email  text NOT NULL DEFAULT '',
  business_phone  text NOT NULL DEFAULT '',
  business_address text NOT NULL DEFAULT '',
  currency    text NOT NULL DEFAULT 'USD',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_email ON profiles (email);
CREATE INDEX idx_profiles_role ON profiles (role);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----- TABLE 2: clients -----
-- Purpose: People/companies the user invoices.
-- Each client belongs to exactly one user.
CREATE TABLE clients (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        text NOT NULL,
  email       text NOT NULL DEFAULT '',
  phone       text NOT NULL DEFAULT '',
  company     text NOT NULL DEFAULT '',
  address     text NOT NULL DEFAULT '',
  notes       text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_user_id ON clients (user_id);
CREATE INDEX idx_clients_email ON clients (email);
CREATE INDEX idx_clients_name ON clients (user_id, name);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clients"
  ON clients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients"
  ON clients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients"
  ON clients FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients"
  ON clients FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----- TABLE 3: invoices -----
-- Purpose: THE KERNEL. Each invoice is created from voice input.
-- Stores the structured invoice data + the original voice transcript.
-- line_items stored as JSONB array: [{description, quantity, unit_price, amount}]
-- This avoids a separate line_items table in v1 (Musk's delete-first).
CREATE TABLE invoices (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id       uuid REFERENCES clients(id) ON DELETE SET NULL,
  invoice_number  text NOT NULL,
  status          invoice_status NOT NULL DEFAULT 'draft',
  currency        text NOT NULL DEFAULT 'USD',
  line_items      jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal        numeric(12,2) NOT NULL DEFAULT 0,
  tax_rate        numeric(5,2) NOT NULL DEFAULT 0,
  tax_amount      numeric(12,2) NOT NULL DEFAULT 0,
  total           numeric(12,2) NOT NULL DEFAULT 0,
  notes           text NOT NULL DEFAULT '',
  voice_transcript text NOT NULL DEFAULT '',
  issue_date      date NOT NULL DEFAULT CURRENT_DATE,
  due_date        date NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  paid_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_user_id ON invoices (user_id);
CREATE INDEX idx_invoices_client_id ON invoices (client_id);
CREATE INDEX idx_invoices_status ON invoices (user_id, status);
CREATE INDEX idx_invoices_invoice_number ON invoices (user_id, invoice_number);
CREATE INDEX idx_invoices_due_date ON invoices (due_date)
  WHERE status NOT IN ('paid', 'void');
CREATE INDEX idx_invoices_issue_date ON invoices (user_id, issue_date DESC);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices"
  ON invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices"
  ON invoices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices"
  ON invoices FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----- TABLE 4: subscriptions -----
-- Purpose: Stripe subscription state. One active subscription per user.
-- Mirrors Stripe's subscription object for local queries.
CREATE TABLE subscriptions (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id  text NOT NULL DEFAULT '',
  stripe_subscription_id text NOT NULL DEFAULT '',
  plan                text NOT NULL DEFAULT 'free',
  status              subscription_status NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end  timestamptz,
  cancel_at           timestamptz,
  canceled_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_subscriptions_user UNIQUE (user_id),
  CONSTRAINT uq_subscriptions_stripe UNIQUE (stripe_subscription_id)
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions (user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions (stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions (status);
CREATE INDEX idx_subscriptions_active ON subscriptions (user_id)
  WHERE status IN ('active', 'trialing');

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role (webhooks) can insert/update subscriptions
-- No user-facing INSERT/UPDATE policies needed.
-- Service role bypasses RLS by default.

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----- TABLE 5: payments -----
-- Purpose: Record of payments received against invoices + Stripe charges.
-- Links an invoice to its payment event for audit trail.
CREATE TABLE payments (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invoice_id          uuid REFERENCES invoices(id) ON DELETE SET NULL,
  stripe_payment_intent_id text NOT NULL DEFAULT '',
  amount              numeric(12,2) NOT NULL DEFAULT 0,
  currency            text NOT NULL DEFAULT 'USD',
  method              text NOT NULL DEFAULT '',
  notes               text NOT NULL DEFAULT '',
  paid_at             timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_user_id ON payments (user_id);
CREATE INDEX idx_payments_invoice_id ON payments (invoice_id);
CREATE INDEX idx_payments_stripe_pi ON payments (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id != '';
CREATE INDEX idx_payments_paid_at ON payments (user_id, paid_at DESC);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role (webhooks/server actions) can insert payments.
-- Service role bypasses RLS by default.

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- STEP 4: AUTH TRIGGER
-- Fires when a new user signs up via Supabase Auth.
-- Creates their profile row automatically.
-- ============================================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- STEP 5: DOMAIN FUNCTIONS
-- Helper functions for common invoice operations.
-- ============================================================

-- Generate next invoice number for a user: VI-0001, VI-0002, etc.
CREATE OR REPLACE FUNCTION generate_invoice_number(p_user_id uuid)
RETURNS text AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(invoice_number, '[^0-9]', '', 'g'), '') AS integer)
  ), 0) + 1
  INTO next_num
  FROM invoices
  WHERE user_id = p_user_id;

  RETURN 'VI-' || LPAD(next_num::text, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark invoice as paid and record payment timestamp
CREATE OR REPLACE FUNCTION mark_invoice_paid(p_invoice_id uuid, p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE invoices
  SET status = 'paid',
      paid_at = now(),
      updated_at = now()
  WHERE id = p_invoice_id
    AND user_id = p_user_id
    AND status != 'void';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get dashboard summary stats for a user
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id uuid)
RETURNS TABLE (
  total_invoices bigint,
  total_revenue numeric,
  outstanding_amount numeric,
  overdue_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total_invoices,
    COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END), 0) AS total_revenue,
    COALESCE(SUM(CASE WHEN i.status IN ('sent', 'viewed', 'overdue') THEN i.total ELSE 0 END), 0) AS outstanding_amount,
    COUNT(*) FILTER (WHERE i.status = 'overdue')::bigint AS overdue_count
  FROM invoices i
  WHERE i.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 6: SEED DATA
-- Default subscription for the free plan pattern.
-- When handle_new_user fires, the app layer creates a free subscription.
-- This seed ensures the enum values and plan names are consistent.
-- ============================================================

-- No lookup tables needed in v1 (Musk's delete-first).
-- Plans are defined in Stripe and referenced by name string.
-- The 'free' plan is the default in the subscriptions table.

-- Example: seed a test user's free subscription (for development only).
-- In production, this is created by the signup flow.
-- UNCOMMENT FOR DEV:
-- INSERT INTO subscriptions (user_id, plan, status)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'free', 'active');

-- ============================================================
-- SCHEMA COMPLETE
-- 
-- Tables: 5 (profiles, clients, invoices, subscriptions, payments)
-- Enums: 3 (subscription_status, invoice_status, user_role)
-- Functions: 4 (update_updated_at, handle_new_user, generate_invoice_number,
--               mark_invoice_paid, get_dashboard_stats)
-- Triggers: 6 (1 auth + 5 updated_at)
-- RLS: Enabled on ALL 5 tables with explicit policies
-- Indexes: 17 (all FKs + query columns + partial indexes)
--
-- Kernel: invoices table with voice_transcript + line_items JSONB
-- Build order: schema → voice-to-invoice API → dashboard → auth → payments
-- ============================================================

-- Self-validation patches
-- ============================================================
-- PATCH 1: Fix admin RLS recursive query on profiles
-- Replace the admin policy with a non-recursive version
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Use auth.jwt() to check role from JWT claims instead of querying profiles table
-- This requires setting the role in the JWT via a custom access token hook,
-- OR we use a security definer function to break the recursion.

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
DECLARE
  user_role_val user_role;
BEGIN
  SELECT role INTO user_role_val
  FROM profiles
  WHERE id = auth.uid();
  RETURN user_role_val = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

-- ============================================================
-- PATCH 2: Fix generate_invoice_number race condition
-- Use advisory lock to prevent duplicate numbers
-- ============================================================

CREATE OR REPLACE FUNCTION generate_invoice_number(p_user_id uuid)
RETURNS text AS $$
DECLARE
  next_num integer;
  lock_id bigint;
BEGIN
  -- Create a deterministic lock ID from the user UUID
  lock_id := ('x' || left(replace(p_user_id::text, '-', ''), 15))::bit(64)::bigint;
  
  -- Acquire advisory lock for this user
  PERFORM pg_advisory_xact_lock(lock_id);
  
  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(invoice_number, '[^0-9]', '', 'g'), '') AS integer)
  ), 0) + 1
  INTO next_num
  FROM invoices
  WHERE user_id = p_user_id;

  RETURN 'VI-' || LPAD(next_num::text, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PATCH 3: Add INSERT policy for payments table
-- Users need to be able to insert their own payments
-- ============================================================

CREATE POLICY "Users can insert own payments"
  ON payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- PATCH 4: Add UPDATE policy for payments (for completeness)
-- ============================================================

CREATE POLICY "Users can update own payments"
  ON payments FOR UPDATE
  USING (auth.uid() = user_id);