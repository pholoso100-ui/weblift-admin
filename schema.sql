CREATE SEQUENCE IF NOT EXISTS wl_invoice_seq;
CREATE TABLE IF NOT EXISTS wl_catalogue (
 id text PRIMARY KEY,
 label text NOT NULL,
 price_cents integer NOT NULL DEFAULT 0 CHECK(price_cents >= 0),
 mode text NOT NULL DEFAULT 'fixed' CHECK(mode IN ('fixed','hourly')),
 default_hours numeric(12,2) NOT NULL DEFAULT 0,
 category text NOT NULL DEFAULT 'Other',
 active boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS wl_config (id text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS wl_proposals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 token text NOT NULL UNIQUE,
 client_name text NOT NULL, company text NOT NULL DEFAULT '',
 client_email text NOT NULL DEFAULT '', client_phone text NOT NULL DEFAULT '',
 project_id text NOT NULL DEFAULT '', project_url text NOT NULL DEFAULT '',
 package_code text NOT NULL,
 items jsonb NOT NULL DEFAULT '[]'::jsonb,
 base_cents integer NOT NULL DEFAULT 0,
 total_cents integer NOT NULL DEFAULT 0,
 monthly_cents integer NOT NULL DEFAULT 0,
 deposit_cents integer NOT NULL DEFAULT 0,
 balance_cents integer NOT NULL DEFAULT 0,
 notes text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'pending',
 version integer NOT NULL DEFAULT 1,
 invoice_no text UNIQUE,
 accepted_at timestamptz, declined_at timestamptz,
 created_by text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS wl_sales_events (
 id bigserial PRIMARY KEY,
 proposal_id uuid REFERENCES wl_proposals(id),
 event_type text NOT NULL,
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
-- Consent and reward intent are recorded; no coins are issued by this service.
ALTER TABLE wl_proposals ADD COLUMN IF NOT EXISTS nexora_opt_in boolean NOT NULL DEFAULT false;
ALTER TABLE wl_proposals ADD COLUMN IF NOT EXISTS nexora_consent_at timestamptz;
ALTER TABLE wl_proposals ADD COLUMN IF NOT EXISTS nexora_verification_status text NOT NULL DEFAULT 'not_verified';
ALTER TABLE wl_proposals ADD COLUMN IF NOT EXISTS reward_status text NOT NULL DEFAULT 'not_issued';
ALTER TABLE wl_proposals ADD COLUMN IF NOT EXISTS reward_potential_cents integer NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS wl_payments (
 id bigserial PRIMARY KEY,
 proposal_id uuid NOT NULL REFERENCES wl_proposals(id),
 amount_cents integer NOT NULL CHECK(amount_cents > 0),
 reference text NOT NULL,
 recorded_by text NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(proposal_id,reference)
);
CREATE INDEX IF NOT EXISTS wl_payments_proposal_idx ON wl_payments(proposal_id);
