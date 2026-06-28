-- ============================================
-- InternHub — Supabase SQL Migration
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('admin', 'it_intern', 'bd_intern', 'recruitment_intern', 'employee');
CREATE TYPE company_type AS ENUM ('si_placements', 'site4people');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'half_day');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'done');
CREATE TYPE recruitment_stage AS ENUM ('called', 'qualified', 'english_test', 'interview_scheduled', 'selected', 'rejected');
CREATE TYPE bd_stage AS ENUM ('cold', 'contacted', 'follow_up', 'proposal_sent', 'deal_cracked', 'lost');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue');
CREATE TYPE document_type AS ENUM ('offer_letter', 'completion_certificate');

-- ============================================
-- TABLES
-- ============================================

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'it_intern',
  company company_type NOT NULL DEFAULT 'site4people',
  department TEXT,
  batch_start DATE,
  batch_end DATE,
  is_active BOOLEAN DEFAULT TRUE,
  first_login BOOLEAN DEFAULT FALSE,
  stipend TEXT DEFAULT 'N/A',
  internship_mode TEXT DEFAULT 'full_time',
  custom_timing TEXT DEFAULT '10:00 AM - 7:00 PM, Mon-Sat',
  travel_allowance TEXT DEFAULT 'N/A',
  custom_position TEXT,
  employee_type TEXT,
  daily_target INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  status attendance_status DEFAULT 'present',
  marked_by UUID REFERENCES users(id),
  UNIQUE(user_id, date)
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL REFERENCES users(id),
  assigned_by UUID NOT NULL REFERENCES users(id),
  company company_type,
  priority task_priority DEFAULT 'medium',
  status task_status DEFAULT 'todo',
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Reports
CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  work_done TEXT NOT NULL,
  plan_tomorrow TEXT,
  hours_worked NUMERIC(4,1),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Recruitment Pipeline (SI Placements)
CREATE TABLE IF NOT EXISTS recruitment_pipeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  position_applied TEXT,
  stage recruitment_stage DEFAULT 'called',
  notes TEXT,
  managed_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BD Clients (Site4People)
CREATE TABLE IF NOT EXISTS bd_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  service_interest TEXT,
  stage bd_stage DEFAULT 'cold',
  deal_value NUMERIC(12,2),
  notes TEXT,
  managed_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES bd_clients(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  status invoice_status DEFAULT 'draft',
  items JSONB DEFAULT '[]',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type document_type NOT NULL,
  metadata JSONB DEFAULT '{}',
  generated_by UUID NOT NULL REFERENCES users(id),
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_role TEXT,
  target_company TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DISABLE ROW LEVEL SECURITY (backend handles it)
-- ============================================
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE recruitment_pipeline DISABLE ROW LEVEL SECURITY;
ALTER TABLE bd_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON tasks(assigned_by);
CREATE INDEX IF NOT EXISTS idx_reports_user_date ON daily_reports(user_id, date);
CREATE INDEX IF NOT EXISTS idx_recruitment_managed_by ON recruitment_pipeline(managed_by);
CREATE INDEX IF NOT EXISTS idx_bd_clients_managed_by ON bd_clients(managed_by);
