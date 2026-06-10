-- Globalize TMS Database Schema for Supabase
-- Database: fegbwmteitoorrwkfgvh

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles Table (Users/Staff)
CREATE TABLE profiles (
  id TEXT PRIMARY KEY DEFAULT 'p-' || gen_random_uuid()::text,
  full_name TEXT NOT NULL,
  full_name_ar TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'sales', 'accountant', 'translator', 'admin')),
  employee_type TEXT CHECK (employee_type IN ('staff', 'freelance')),
  languages TEXT[],
  specializations TEXT[],
  daily_rate NUMERIC(10, 2),
  per_word_rate NUMERIC(10, 2),
  monthly_salary NUMERIC(10, 2),
  is_active BOOLEAN DEFAULT TRUE,
  avatar_url TEXT,
  phone TEXT,
  email TEXT,
  personal_email TEXT,
  contract_words INTEGER,
  password TEXT NOT NULL DEFAULT 'password123',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients Table
CREATE TABLE clients (
  id TEXT PRIMARY KEY DEFAULT 'c-' || gen_random_uuid()::text,
  name TEXT NOT NULL,
  name_ar TEXT,
  phone TEXT,
  email TEXT,
  company TEXT,
  nationality TEXT,
  client_type TEXT NOT NULL CHECK (client_type IN ('individual', 'company', 'agency')),
  notes TEXT,
  total_receivables_egp NUMERIC(10, 2) DEFAULT 0,
  total_receivables_aed NUMERIC(10, 2) DEFAULT 0,
  total_receivables_usd NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT REFERENCES profiles(id)
);

-- Tasks Table
CREATE TABLE tasks (
  id TEXT PRIMARY KEY DEFAULT 't-' || gen_random_uuid()::text,
  reference_no TEXT NOT NULL UNIQUE,
  client_id TEXT REFERENCES clients(id),
  client_phone TEXT,
  client_name_cache TEXT,
  file_name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  page_count INTEGER NOT NULL DEFAULT 0,
  
  -- Pricing
  amount_egp NUMERIC(10, 2) DEFAULT 0,
  amount_aed NUMERIC(10, 2) DEFAULT 0,
  amount_usd NUMERIC(10, 2) DEFAULT 0,
  has_tax_invoice BOOLEAN DEFAULT FALSE,
  
  -- Payment
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  payment_method TEXT CHECK (payment_method IN ('cash', 'bank_saib', 'nbe', 'instapay', 'vodafone_cash', 'credit', 'paypal', 'pending')),
  paid_amount_egp NUMERIC(10, 2) DEFAULT 0,
  paid_amount_aed NUMERIC(10, 2) DEFAULT 0,
  paid_amount_usd NUMERIC(10, 2) DEFAULT 0,
  
  -- Status and Workflow
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'quoted', 'approved', 'assigned', 'in_progress', 'review', 'completed', 'delivered', 'archived')),
  intake_channel TEXT NOT NULL CHECK (intake_channel IN ('whatsapp', 'walk_in', 'email', 'phone', 'other')),
  intake_date DATE NOT NULL,
  deadline TIMESTAMPTZ,
  delivery_date TIMESTAMPTZ,
  
  -- Cost Tracking
  translation_cost NUMERIC(10, 2) DEFAULT 0,
  revision_cost NUMERIC(10, 2) DEFAULT 0,
  overtime_cost NUMERIC(10, 2) DEFAULT 0,
  total_cost NUMERIC(10, 2) DEFAULT 0,
  net_revenue NUMERIC(10, 2) DEFAULT 0,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  attachments JSONB,
  
  notes TEXT,
  created_by TEXT REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Assignments Table
CREATE TABLE task_assignments (
  id TEXT PRIMARY KEY DEFAULT 'asg-' || gen_random_uuid()::text,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  task_ref TEXT,
  task_file_name TEXT,
  translator_id TEXT NOT NULL REFERENCES profiles(id),
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('translation', 'revision', 'proofreading')),
  word_count_assigned INTEGER NOT NULL DEFAULT 0,
  word_count_actual INTEGER,
  rate_per_word NUMERIC(10, 2),
  rate_daily NUMERIC(10, 2),
  rate_fixed NUMERIC(10, 2),
  overtime_hours NUMERIC(5, 2) DEFAULT 0,
  overtime_rate NUMERIC(10, 2),
  calculated_amount NUMERIC(10, 2) DEFAULT 0,
  deadline TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  translated_attachments JSONB,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'submitted', 'approved')),
  notes TEXT,
  assigned_by TEXT REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quotations Table
CREATE TABLE quotations (
  id TEXT PRIMARY KEY DEFAULT 'quote-' || gen_random_uuid()::text,
  task_id TEXT REFERENCES tasks(id),
  client_id TEXT REFERENCES clients(id),
  client_name TEXT,
  quote_number TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  word_count INTEGER DEFAULT 0,
  amount_egp NUMERIC(10, 2) DEFAULT 0,
  amount_aed NUMERIC(10, 2) DEFAULT 0,
  amount_usd NUMERIC(10, 2) DEFAULT 0,
  valid_until DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired')),
  notes TEXT,
  created_by TEXT REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments Table
CREATE TABLE payments (
  id TEXT PRIMARY KEY DEFAULT 'pay-' || gen_random_uuid()::text,
  task_id TEXT REFERENCES tasks(id),
  client_id TEXT REFERENCES clients(id),
  reference_no TEXT,
  client_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  payment_date DATE NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('income', 'expense')),
  amount_egp NUMERIC(10, 2) DEFAULT 0,
  amount_aed NUMERIC(10, 2) DEFAULT 0,
  amount_usd NUMERIC(10, 2) DEFAULT 0,
  payment_method TEXT NOT NULL,
  expense_category TEXT CHECK (expense_category IN ('salary', 'freelancer', 'rent', 'utilities', 'equipment', 'marketing', 'tax', 'other')),
  payee TEXT,
  notes TEXT,
  created_by TEXT REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client Receivables Records Table
CREATE TABLE client_receivables (
  id TEXT PRIMARY KEY DEFAULT 'rec-' || gen_random_uuid()::text,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  period TEXT NOT NULL, -- YYYY-MM
  currency TEXT NOT NULL CHECK (currency IN ('EGP', 'AED', 'USD')),
  amount NUMERIC(10, 2) DEFAULT 0,
  paid_amount NUMERIC(10, 2) DEFAULT 0,
  remaining NUMERIC(10, 2) DEFAULT 0,
  notes TEXT,
  UNIQUE(client_id, period, currency)
);

-- Staff Liabilities Table
CREATE TABLE staff_liabilities (
  id TEXT PRIMARY KEY DEFAULT 'liab-' || gen_random_uuid()::text,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profile_name TEXT NOT NULL,
  liability_type TEXT NOT NULL CHECK (liability_type IN ('salary_arrear', 'profit_share', 'advance', 'deduction', 'other')),
  description TEXT NOT NULL,
  period TEXT, -- YYYY-MM
  currency TEXT NOT NULL CHECK (currency IN ('EGP', 'AED', 'USD')),
  amount NUMERIC(10, 2) NOT NULL,
  paid_amount NUMERIC(10, 2) DEFAULT 0,
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monthly Closings Table
CREATE TABLE monthly_closings (
  id TEXT PRIMARY KEY DEFAULT 'close-' || gen_random_uuid()::text,
  period TEXT NOT NULL UNIQUE, -- YYYY-MM
  total_revenue_egp NUMERIC(10, 2) DEFAULT 0,
  total_revenue_aed NUMERIC(10, 2) DEFAULT 0,
  total_revenue_usd NUMERIC(10, 2) DEFAULT 0,
  total_expenses_egp NUMERIC(10, 2) DEFAULT 0,
  total_expenses_aed NUMERIC(10, 2) DEFAULT 0,
  salary_breakdown JSONB,
  rate_aed_to_egp NUMERIC(10, 4) DEFAULT 0,
  rate_usd_to_egp NUMERIC(10, 4) DEFAULT 0,
  net_profit_egp NUMERIC(10, 2) DEFAULT 0,
  net_profit_aed NUMERIC(10, 2) DEFAULT 0,
  net_profit_usd NUMERIC(10, 2) DEFAULT 0,
  total_profit_egp NUMERIC(10, 2) DEFAULT 0,
  partner1_share NUMERIC(10, 2) DEFAULT 0,
  partner2_share NUMERIC(10, 2) DEFAULT 0,
  cash_egp NUMERIC(10, 2) DEFAULT 0,
  cash_aed NUMERIC(10, 2) DEFAULT 0,
  cash_usd NUMERIC(10, 2) DEFAULT 0,
  bank_saib_egp NUMERIC(10, 2) DEFAULT 0,
  total_receivables_egp NUMERIC(10, 2) DEFAULT 0,
  total_receivables_aed NUMERIC(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'closed')),
  closed_by TEXT REFERENCES profiles(id),
  closed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Salary Attendance Table
CREATE TABLE salary_attendance (
  id TEXT PRIMARY KEY DEFAULT 'att-' || gen_random_uuid()::text,
  translator_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  session TEXT NOT NULL CHECK (session IN ('morning', 'evening', 'full_day')),
  is_vacation BOOLEAN DEFAULT FALSE,
  vacation_type TEXT CHECK (vacation_type IN ('annual', 'sick', 'unpaid')),
  notes TEXT,
  UNIQUE(translator_id, work_date, session)
);

-- Notifications Table
CREATE TABLE notifications (
  id TEXT PRIMARY KEY DEFAULT 'notif-' || gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_ar TEXT,
  message TEXT NOT NULL,
  message_ar TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'danger')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Letterhead Templates Table
CREATE TABLE letterhead_templates (
  id TEXT PRIMARY KEY DEFAULT 'lh-' || gen_random_uuid()::text,
  name TEXT NOT NULL,
  name_ar TEXT,
  image_url TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  placement TEXT NOT NULL CHECK (placement IN ('background', 'header', 'footer', 'header_footer')),
  margins JSONB NOT NULL,
  opacity NUMERIC(3, 2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stamp Assets Table
CREATE TABLE stamp_assets (
  id TEXT PRIMARY KEY DEFAULT 'st-' || gen_random_uuid()::text,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('certified_stamp_signature', 'certified_stamp_only', 'company_stamp', 'signature_only', 'custom')),
  image_url TEXT NOT NULL,
  default_size INTEGER DEFAULT 150,
  default_opacity NUMERIC(3, 2) DEFAULT 1.0,
  default_rotation INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Layout Presets Table
CREATE TABLE layout_presets (
  id TEXT PRIMARY KEY DEFAULT 'p-' || gen_random_uuid()::text,
  name TEXT NOT NULL,
  name_ar TEXT,
  page_size TEXT DEFAULT 'A4',
  margins JSONB NOT NULL,
  letterhead_id TEXT REFERENCES letterhead_templates(id),
  stamp_id TEXT REFERENCES stamp_assets(id),
  stamp_position JSONB NOT NULL,
  include_original BOOLEAN DEFAULT TRUE,
  original_position TEXT CHECK (original_position IN ('before', 'after')),
  font_family TEXT DEFAULT 'Inter',
  font_size INTEGER DEFAULT 11,
  line_spacing NUMERIC(3, 2) DEFAULT 1.5,
  show_page_numbers BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PDF Export Logs Table
CREATE TABLE pdf_export_logs (
  id TEXT PRIMARY KEY DEFAULT 'pdf-' || gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES profiles(id),
  user_name TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  client_name TEXT NOT NULL,
  reference_no TEXT NOT NULL,
  letterhead_name TEXT,
  stamp_name TEXT,
  preset_name TEXT,
  file_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed'))
);

-- Create indexes for better query performance
CREATE INDEX idx_tasks_client_id ON tasks(client_id);
CREATE INDEX idx_tasks_intake_date ON tasks(intake_date);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_translator_id ON task_assignments(translator_id);
CREATE INDEX idx_payments_task_id ON payments(task_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);
CREATE INDEX idx_client_receivables_client_id ON client_receivables(client_id);
CREATE INDEX idx_salary_attendance_translator_id ON salary_attendance(translator_id);
CREATE INDEX idx_salary_attendance_work_date ON salary_attendance(work_date);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- Function to generate task reference numbers
CREATE OR REPLACE FUNCTION generate_reference_no(intake_date_val DATE)
RETURNS TEXT AS $$
DECLARE
  date_prefix TEXT;
  task_count INTEGER;
BEGIN
  -- Format: YY.MM.DD
  date_prefix := TO_CHAR(intake_date_val, 'YY.MM.DD');
  
  -- Count tasks with same intake date
  SELECT COUNT(*) INTO task_count
  FROM tasks
  WHERE intake_date = intake_date_val;
  
  -- Return formatted reference number
  RETURN date_prefix || '.' || (task_count + 1);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at timestamp on tasks
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert seed data (initial profiles)
INSERT INTO profiles (id, full_name, full_name_ar, role, is_active, phone, email, employee_type, password, created_at)
VALUES
  ('p-ahmed-ghaffar', 'Ahmed Abdel Ghaffar Mohamed', 'أحمد عبد الغفار محمد', 'owner', TRUE, '00201555592535', 'ahmed.mhd@globalizetl.com', NULL, 'password123', '2023-01-01T00:00:00Z'),
  ('p-sara-khafaga', 'Sara Khafaga', 'سارة خفاجة', 'admin', TRUE, '+201006835081', 'sara.khfaga@globalizetl.com', 'staff', 'password123', '2023-01-01T00:00:00Z'),
  ('p-esraa', 'Esraa', 'إسراء', 'admin', TRUE, '+201122374380', NULL, 'staff', 'password123', '2023-01-01T00:00:00Z');

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE letterhead_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE stamp_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE layout_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_export_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (adjust based on your auth strategy)
-- For now, allowing all operations for authenticated users
-- You can refine these based on roles later

CREATE POLICY "Allow all for authenticated users" ON profiles FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON clients FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON tasks FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON task_assignments FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON quotations FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON payments FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON client_receivables FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON staff_liabilities FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON monthly_closings FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON salary_attendance FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON notifications FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON letterhead_templates FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON stamp_assets FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON layout_presets FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON pdf_export_logs FOR ALL USING (true);
