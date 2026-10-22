-- ============================================================================
-- ILM - INTEGRATED LEARNING MASTER
-- SUPABASE POSTGRESQL COMPLETE DDL SCHEMA, SEED DATA & EDIT SNIPPETS
-- Project: https://sdwohzszgondniptbktd.supabase.co
-- Key: sb_publishable_-jvbyMvuut2G0m2HNfjUYQ_ly3Tk6aj
--
-- HOW TO RUN:
-- 1. Open Supabase Dashboard: https://supabase.com/dashboard/project/sdwohzszgondniptbktd
-- 2. Click "SQL Editor" on the left menu.
-- 3. Click "New Query".
-- 4. Paste this entire script and click "RUN" (green button).
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. CREATE CORE TABLES
-- ============================================================================

-- Table 1: users (Super Admin, Teachers, and Class Admins)
CREATE TABLE IF NOT EXISTS public.users (
  id BIGSERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN', 'TEACHER', 'CLASS_ADMIN')),
  assigned_class TEXT CHECK (assigned_class IS NULL OR assigned_class IN ('U1', 'U2', 'U3', 'U4', 'U5', 'U6')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DEACTIVATED')),
  password_hash TEXT,
  password_plain TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: classes (Academic Cohorts U1 to U6)
CREATE TABLE IF NOT EXISTS public.classes (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE CHECK (code IN ('U1', 'U2', 'U3', 'U4', 'U5', 'U6')),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  admin_email TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 3: students (Enrolled Scholars per Class)
CREATE TABLE IF NOT EXISTS public.students (
  id BIGSERIAL PRIMARY KEY,
  admission_no TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  class_code TEXT NOT NULL REFERENCES public.classes(code) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  bio TEXT,
  created_by_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 4: class_officers (Executive Cabinet / Leadership per Class)
CREATE TABLE IF NOT EXISTS public.class_officers (
  id BIGSERIAL PRIMARY KEY,
  class_code TEXT NOT NULL REFERENCES public.classes(code) ON DELETE CASCADE,
  role_title TEXT NOT NULL,
  holder_name TEXT NOT NULL,
  admission_no TEXT,
  photo_url TEXT NOT NULL,
  responsibilities TEXT,
  updated_by_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 5: competition_categories (8 Official Stage Categories with Quotas)
CREATE TABLE IF NOT EXISTS public.competition_categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  max_participants_per_class INTEGER NOT NULL DEFAULT 5,
  description TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 1
);

-- Table 6: participants (Registered Contestants for Academic Competitions)
CREATE TABLE IF NOT EXISTS public.participants (
  id BIGSERIAL PRIMARY KEY,
  admission_no TEXT,
  full_name TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  class_code TEXT NOT NULL REFERENCES public.classes(code) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  own_topic TEXT,
  short_description TEXT,
  publication_status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK (publication_status IN ('PUBLISHED', 'DRAFT')),
  created_by_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 7: posters (High-Res SVG & PNG Dynamic Competition Posters)
CREATE TABLE IF NOT EXISTS public.posters (
  id BIGSERIAL PRIMARY KEY,
  class_code TEXT NOT NULL REFERENCES public.classes(code) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  poster_image_url TEXT NOT NULL,
  participants_snapshot TEXT NOT NULL DEFAULT '[]',
  participant_count INTEGER NOT NULL DEFAULT 0,
  generation_status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (generation_status IN ('COMPLETED', 'FAILED')),
  generation_error TEXT,
  publication_status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK (publication_status IN ('PUBLISHED', 'HIDDEN')),
  is_featured BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 8: feed_posts (Campus Activity & Poster Highlights Feed)
CREATE TABLE IF NOT EXISTS public.feed_posts (
  id BIGSERIAL PRIMARY KEY,
  class_code TEXT NOT NULL REFERENCES public.classes(code) ON DELETE CASCADE,
  title TEXT NOT NULL,
  caption TEXT NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'PHOTO' CHECK (media_type IN ('PHOTO', 'POSTER', 'ANNOUNCEMENT')),
  status TEXT NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  rejection_reason TEXT,
  submitted_by_email TEXT NOT NULL,
  submitted_by_name TEXT NOT NULL,
  reviewed_by_email TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 9: weekly_results (Hall of Fame & Weekly Competition Winners)
CREATE TABLE IF NOT EXISTS public.weekly_results (
  id BIGSERIAL PRIMARY KEY,
  result_category TEXT NOT NULL CHECK (result_category IN ('Best Speaker', 'Best Naat')),
  winner_name TEXT NOT NULL,
  winner_photo_url TEXT NOT NULL,
  winner_class TEXT NOT NULL REFERENCES public.classes(code) ON DELETE CASCADE,
  week_label TEXT NOT NULL,
  result_date TEXT NOT NULL,
  remarks TEXT,
  publication_status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK (publication_status IN ('PUBLISHED', 'DRAFT', 'ARCHIVED')),
  published_by_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 10: library_resources (11 Categorized Digital Learning Assets)
CREATE TABLE IF NOT EXISTS public.library_resources (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'Books', 'Articles', 'Journals', 'Research Papers',
    'Notes', 'Presentations', 'Videos', 'Images',
    'Audio', 'Code Snippets', 'Bookmarks'
  )),
  library_scope TEXT NOT NULL CHECK (library_scope IN ('COMMON', 'U1', 'U2', 'U3', 'U4', 'U5', 'U6')),
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size TEXT NOT NULL,
  content_preview TEXT,
  publication_status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK (publication_status IN ('PUBLISHED', 'PRIVATE')),
  uploaded_by_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 11: activity_logs (Audit Trail for Compliance & Accountability)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  class_code TEXT,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 12: platform_settings (Global Configuration Key-Value Store)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id BIGSERIAL PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. INDEXES FOR LIGHTNING FAST QUERIES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_students_class ON public.students(class_code);
CREATE INDEX IF NOT EXISTS idx_participants_class ON public.participants(class_code);
CREATE INDEX IF NOT EXISTS idx_posters_class ON public.posters(class_code);
CREATE INDEX IF NOT EXISTS idx_feed_class ON public.feed_posts(class_code);
CREATE INDEX IF NOT EXISTS idx_weekly_class ON public.weekly_results(winner_class);
CREATE INDEX IF NOT EXISTS idx_library_scope ON public.library_resources(library_scope);

-- ============================================================================
-- 4. OPEN PERMISSIONS FOR SUPABASE PUBLISHABLE & SERVICE KEYS
-- (Disables RLS so your publishable key can read and write smoothly)
-- ============================================================================
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_officers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.posters DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_resources DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings DISABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- ============================================================================
-- 5. INITIAL SEED DATA
-- ============================================================================

-- Classes (U1 to U6)
INSERT INTO public.classes (code, name, description, admin_email)
VALUES
  ('U1', 'Class U1 • Foundation Cohort', 'Primary oratorical foundation, phonetic clarity, and introductory Naat & Speech.', 'admin@gmail.com'),
  ('U2', 'Class U2 • Emerging Orators', 'Structured public speaking, classical Naat delivery, and peer Evolution sessions.', 'u2.admin@ilm.edu.pk'),
  ('U3', 'Class U3 • Intermediate Scholars', 'Rhetorical composition, analytical Evolution, and parliamentary session leadership.', 'u3.admin@ilm.edu.pk'),
  ('U4', 'Class U4 • Senior Debaters', 'Advanced thematic speeches, grammatical mastery, and executive session moderation.', 'u4.admin@ilm.edu.pk'),
  ('U5', 'Class U5 • Honors Fellowship', 'Distinguished Naat recitation, keynote speech synthesis, and critical evaluation.', 'u5.admin@ilm.edu.pk'),
  ('U6', 'Class U6 • Master Laureates', 'Capstone leadership cohort preparing senior scholars for institutional excellence.', 'u6.admin@ilm.edu.pk')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Competition Categories
INSERT INTO public.competition_categories (name, max_participants_per_class, description, display_order)
VALUES
  ('Qirat', 1, 'Quranic recitation adhering strictly to Tajweed rules and tartil cadence.', 1),
  ('Naat', 5, 'Poetic spiritual praise of Prophet Muhammad ﷺ with melodic devotion.', 2),
  ('Speech', 5, 'Rhetorical oration with structured introduction, logical progression, and conclusion.', 3),
  ('Table Topic', 5, 'Spontaneous impromptu speeches evaluating quick thinking and composure.', 4),
  ('Aah Counter', 1, 'Auditory tracking of filler vocalizations, pauses, and speech repetitions.', 5),
  ('Evolution', 5, 'Constructive rhetorical analysis and peer oration performance evaluation.', 6),
  ('Marshal', 1, 'Stage protocol governance, session timing, and procedural decorum.', 7),
  ('Grammarian', 1, 'Linguistic precision monitoring, vocabulary enrichment, and rhetoric analysis.', 8)
ON CONFLICT (name) DO UPDATE SET max_participants_per_class = EXCLUDED.max_participants_per_class;

-- Administrator Accounts (Super Admin Nasir, Teacher, and Class Admins)
INSERT INTO public.users (uid, email, name, role, assigned_class, status, password_plain)
VALUES
  ('usr_super_nasir', 'nasirhussin12489@gmail.com', 'Syed Nasir Hussain (Super Admin)', 'SUPER_ADMIN', NULL, 'ACTIVE', '9934886605dilD@'),
  ('usr_super_admin', 'admin@gmail.com', 'Admin User', 'SUPER_ADMIN', NULL, 'ACTIVE', 'admin12345'),
  ('usr_teacher', 'teacher@gmail.com', 'Master Teacher', 'TEACHER', NULL, 'ACTIVE', '123456789teacher'),
  ('usr_admin_u1', 'u1.admin@ilm.edu.pk', 'Class U1 Administrator', 'CLASS_ADMIN', 'U1', 'ACTIVE', 'u1admin123'),
  ('usr_admin_u2', 'u2.admin@ilm.edu.pk', 'Class U2 Administrator', 'CLASS_ADMIN', 'U2', 'ACTIVE', 'u2admin123'),
  ('usr_admin_u3', 'u3.admin@ilm.edu.pk', 'Class U3 Administrator', 'CLASS_ADMIN', 'U3', 'ACTIVE', 'u3admin123'),
  ('usr_admin_u4', 'u4.admin@ilm.edu.pk', 'Class U4 Administrator', 'CLASS_ADMIN', 'U4', 'ACTIVE', 'u4admin123'),
  ('usr_admin_u5', 'u5.admin@ilm.edu.pk', 'Class U5 Administrator', 'CLASS_ADMIN', 'U5', 'ACTIVE', 'u5admin123'),
  ('usr_admin_u6', 'u6.admin@ilm.edu.pk', 'Class U6 Administrator', 'CLASS_ADMIN', 'U6', 'ACTIVE', 'u6admin123')
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  password_plain = EXCLUDED.password_plain;

-- Platform Settings
INSERT INTO public.platform_settings (setting_key, setting_value)
VALUES
  ('platformName', 'ILM - Integrated Learning Master'),
  ('motto', 'Learn • Compete • Grow'),
  ('currentAcademicWeek', 'Week 13'),
  ('imgbbApiKey', '7443bf294f338b5a0c690e7de1fc2acd'),
  ('supabaseUrl', 'https://sdwohzszgondniptbktd.supabase.co'),
  ('supabasePublishableKey', 'sb_publishable_-jvbyMvuut2G0m2HNfjUYQ_ly3Tk6aj')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- ============================================================================
-- 6. SQL EDITING CHEATSHEET (TABLE EDIT KARNE KE LIYE CODE)
-- Run these commands whenever you want to edit your Supabase database directly:
-- ============================================================================

-- A. USER KA PASSWORD CHANGE KARNA HO:
-- UPDATE public.users SET password_plain = 'NewPassword123' WHERE email = 'nasirhussin12489@gmail.com';

-- B. KISI PARTICIPANT KA TOPIC YA PHOTO CHANGE KARNA HO:
-- UPDATE public.participants SET own_topic = 'New Topic Title', photo_url = 'https://i.ibb.co/...' WHERE id = 1;

-- C. KISI NEW ADMIN USER KO ADD KARNA HO:
-- INSERT INTO public.users (email, name, role, assigned_class, password_plain)
-- VALUES ('newadmin@gmail.com', 'New Admin Name', 'CLASS_ADMIN', 'U2', 'pass12345');

-- D. CATEGORY KA QUOTA LIMIT CHANGE KARNA HO (e.g. Speech me 5 se 6):
-- UPDATE public.competition_categories SET max_participants_per_class = 6 WHERE name = 'Speech';

-- E. TABLE ME NAYA COLUMN ADD KARNA HO:
-- ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS phone_no TEXT;

-- F. KOI PARTICIPANT YA POST DELETE KARNA HO:
-- DELETE FROM public.participants WHERE id = 12;

-- G. SABHI PARTICIPANTS KO DEKHNA HO:
-- SELECT * FROM public.participants ORDER BY id DESC;
