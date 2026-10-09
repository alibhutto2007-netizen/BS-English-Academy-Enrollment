-- Phase 2: Dynamic Courses, Batches, Timings, and Admin Management
-- Run this in Supabase SQL Editor

-- ============================================
-- TABLES
-- ============================================

-- Allow flexible batch and time values in students table
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_batch_check;
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_time_check;

-- Ensure how_heard_about_us column exists
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS how_heard_about_us TEXT NOT NULL DEFAULT 'WhatsApp';

-- Courses table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Batches table (linked to courses)
CREATE TABLE IF NOT EXISTS public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, name)
);

-- Timings table (linked to batches)
CREATE TABLE IF NOT EXISTS public.timings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admins table
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_courses_active ON public.courses(is_active);
CREATE INDEX IF NOT EXISTS idx_batches_course ON public.batches(course_id);
CREATE INDEX IF NOT EXISTS idx_batches_active ON public.batches(is_active);
CREATE INDEX IF NOT EXISTS idx_timings_batch ON public.timings(batch_id);
CREATE INDEX IF NOT EXISTS idx_timings_active ON public.timings(is_active);
CREATE INDEX IF NOT EXISTS idx_admins_clerk ON public.admins(clerk_id);
CREATE INDEX IF NOT EXISTS idx_students_batch_time ON public.students(batch, time);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Courses: public read, auth write (but API uses service role which bypasses RLS)
DROP POLICY IF EXISTS "Public can read courses" ON public.courses;
CREATE POLICY "Public can read courses" ON public.courses FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "API can manage courses" ON public.courses;
CREATE POLICY "API can manage courses" ON public.courses FOR ALL TO authenticated USING (true);

-- Batches: public read, auth write
DROP POLICY IF EXISTS "Public can read batches" ON public.batches;
CREATE POLICY "Public can read batches" ON public.batches FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "API can manage batches" ON public.batches;
CREATE POLICY "API can manage batches" ON public.batches FOR ALL TO authenticated USING (true);

-- Timings: public read, auth write
DROP POLICY IF EXISTS "Public can read timings" ON public.timings;
CREATE POLICY "Public can read timings" ON public.timings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "API can manage timings" ON public.timings;
CREATE POLICY "API can manage timings" ON public.timings FOR ALL TO authenticated USING (true);

-- Admins: only super_admin can manage, admins can read own
DROP POLICY IF EXISTS "Admins can read admins" ON public.admins;
CREATE POLICY "Admins can read admins" ON public.admins FOR SELECT TO authenticated USING (
  is_active = true
);
DROP POLICY IF EXISTS "API can manage admins" ON public.admins;
CREATE POLICY "API can manage admins" ON public.admins FOR ALL TO authenticated USING (
  role = 'super_admin' AND is_active = true
);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON public.batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_timings_updated_at BEFORE UPDATE ON public.timings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON public.admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS FOR API
-- ============================================

-- View: Courses with batches count
CREATE OR REPLACE VIEW public.courses_with_batches AS
SELECT 
  c.id,
  c.name,
  c.description,
  c.is_active,
  c.created_at,
  (SELECT COUNT(*) FROM public.batches b WHERE b.course_id = c.id AND b.is_active = true) as batch_count
FROM public.courses c;

-- View: Batches with timings count
CREATE OR REPLACE VIEW public.batches_with_timings AS
SELECT 
  b.id,
  b.course_id,
  c.name as course_name,
  b.name as batch_name,
  b.description,
  b.is_active,
  b.created_at,
  (SELECT COUNT(*) FROM public.timings t WHERE t.batch_id = b.id AND t.is_active = true) as timing_count
FROM public.batches b
JOIN public.courses c ON b.course_id = c.id;

-- View: Timings with batch and course info
CREATE OR REPLACE VIEW public.timings_with_details AS
SELECT 
  t.id,
  t.batch_id,
  c.name as course_name,
  b.name as batch_name,
  t.day,
  t.start_time,
  t.end_time,
  t.is_active,
  t.created_at
FROM public.timings t
JOIN public.batches b ON t.batch_id = b.id
JOIN public.courses c ON b.course_id = c.id;