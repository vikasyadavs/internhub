-- ============================================
-- InternHub user/profile compatibility updates
-- Run this after 001_init.sql in Supabase SQL Editor.
-- ============================================

-- The app now supports full-time employees in addition to interns.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'employee';

-- Extra profile/onboarding/payroll fields used by the current server routes.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_login BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stipend TEXT DEFAULT 'N/A',
  ADD COLUMN IF NOT EXISTS internship_mode TEXT DEFAULT 'full_time',
  ADD COLUMN IF NOT EXISTS custom_timing TEXT DEFAULT '10:00 AM - 7:00 PM, Mon-Sat',
  ADD COLUMN IF NOT EXISTS travel_allowance TEXT DEFAULT 'N/A',
  ADD COLUMN IF NOT EXISTS custom_position TEXT,
  ADD COLUMN IF NOT EXISTS employee_type TEXT,
  ADD COLUMN IF NOT EXISTS daily_target INTEGER,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE users
SET
  first_login = COALESCE(first_login, FALSE),
  stipend = COALESCE(stipend, 'N/A'),
  internship_mode = COALESCE(internship_mode, 'full_time'),
  custom_timing = COALESCE(custom_timing, '10:00 AM - 7:00 PM, Mon-Sat'),
  travel_allowance = COALESCE(travel_allowance, 'N/A'),
  updated_at = COALESCE(updated_at, created_at, NOW());
