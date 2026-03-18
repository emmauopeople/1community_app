BEGIN;

-- Case-insensitive emails (recommended)
CREATE EXTENSION IF NOT EXISTS citext;

-- 1) USERS (providers + admins)
CREATE TABLE IF NOT EXISTS users (
  id              BIGSERIAL PRIMARY KEY,
  email           CITEXT NOT NULL UNIQUE,
  phone           TEXT   NOT NULL,
  password_hash   TEXT   NOT NULL,
  role            TEXT   NOT NULL CHECK (role IN ('provider','admin')),
  status          TEXT   NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  display_name    TEXT,
);

CREATE INDEX IF NOT EXISTS idx_users_role   ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- 2) PENDING REGISTRATIONS (OTP flow; deleted once complete/expired)
CREATE TABLE IF NOT EXISTS pending_registrations (
  id              BIGSERIAL PRIMARY KEY,
  email           CITEXT NOT NULL UNIQUE,
  phone           TEXT   NOT NULL,
  password_hash   TEXT   NOT NULL,
  otp_hash        TEXT   NOT NULL,
  otp_expires_at  TIMESTAMPTZ NOT NULL,
  attempts        INT    NOT NULL DEFAULT 0,
  resend_count    INT    NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_expires ON pending_registrations(otp_expires_at);
CREATE INDEX IF NOT EXISTS idx_pending_locked  ON pending_registrations(locked_until);

-- 3) AUTH LOGS (monitoring + audit trail)
CREATE TABLE IF NOT EXISTS auth_logs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
  email       CITEXT,
  event_type  TEXT NOT NULL CHECK (event_type IN (
    'provider_register_begin',
    'provider_register_complete',
    'login',
    'logout',
    'admin_create',
    'provider_status_change'
  )),
  success     BOOLEAN NOT NULL,
  ip          INET,
  user_agent  TEXT,
  details     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id    ON auth_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_email      ON auth_logs(email);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON auth_logs(created_at);

-- 4) LOGIN ATTEMPTS (separate lockout tracking; simple + MVP-friendly)
CREATE TABLE IF NOT EXISTS login_attempts (
  email            CITEXT PRIMARY KEY,
  failed_attempts  INT NOT NULL DEFAULT 0,
  first_failed_at  TIMESTAMPTZ,
  last_failed_at   TIMESTAMPTZ,
  locked_until     TIMESTAMPTZ,
  last_ip          INET,
  last_user_agent  TEXT,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;

-- skill table creation
DROP TABLE IF EXISTS skills CASCADE;

CREATE TABLE skills (
  id           BIGSERIAL PRIMARY KEY,
  provider_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  title        TEXT NOT NULL,
  category     TEXT NOT NULL,
  tags         TEXT NOT NULL DEFAULT '',
  description  TEXT NOT NULL,

  country      TEXT NOT NULL,
  region       TEXT,             -- optional MVP
  city         TEXT NOT NULL,
  area         TEXT,             -- neighborhood/quarter (optional MVP)

  lat          DOUBLE PRECISION NOT NULL,
  lng          DOUBLE PRECISION NOT NULL,

  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_skills_provider_id ON skills(provider_id);
CREATE INDEX idx_skills_country     ON skills(country);
CREATE INDEX idx_skills_city        ON skills(city);
CREATE INDEX idx_skills_category    ON skills(category);
CREATE INDEX idx_skills_status      ON skills(status);

-- event table creation
CREATE TABLE IF NOT EXISTS events (
  id          BIGSERIAL PRIMARY KEY,
  event_type  TEXT NOT NULL CHECK (event_type IN ('search','skill_view','contact_click')),

  user_id     BIGINT REFERENCES users(id) ON DELETE SET NULL, -- nullable (public users)
  skill_id    BIGINT REFERENCES skills(id) ON DELETE SET NULL, -- for view/click

  country     TEXT,
  region      TEXT,
  city        TEXT,
  category    TEXT,
  q           TEXT,

  channel     TEXT CHECK (channel IN ('whatsapp','call','email')), -- contact_click only

  lat         DOUBLE PRECISION, -- optional (for search)
  lng         DOUBLE PRECISION,
  radius_km   DOUBLE PRECISION,

  ip          INET,
  user_agent  TEXT,

  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_type_time     ON events(event_type, occurred_at);
CREATE INDEX IF NOT EXISTS idx_events_city_time     ON events(city, occurred_at);
CREATE INDEX IF NOT EXISTS idx_events_category_time ON events(category, occurred_at);
CREATE INDEX IF NOT EXISTS idx_events_skill_time    ON events(skill_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_events_channel_time  ON events(channel, occurred_at);

-- Skill media (MVP: images only, max 3 per skill via sort_order 0..2)
CREATE TABLE IF NOT EXISTS skill_media (
  id          BIGSERIAL PRIMARY KEY,
  skill_id    BIGINT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  provider_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  media_type  TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image')),
  bucket      TEXT NOT NULL,
  s3_key      TEXT NOT NULL,
  mime_type   TEXT NOT NULL,
  size_bytes  BIGINT NOT NULL CHECK (size_bytes > 0),
  sort_order  SMALLINT NOT NULL CHECK (sort_order BETWEEN 0 AND 2),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Each skill can only have one media per slot (0,1,2)
CREATE UNIQUE INDEX IF NOT EXISTS ux_skill_media_skill_sort
  ON skill_media (skill_id, sort_order);

-- Prevent duplicate keys stored
CREATE UNIQUE INDEX IF NOT EXISTS ux_skill_media_s3_key
  ON skill_media (s3_key);

CREATE INDEX IF NOT EXISTS ix_skill_media_skill
  ON skill_media (skill_id);


