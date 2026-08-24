-- =====================================================================
-- IDMA3 Training Platform — FULL SUPABASE RECREATION SCRIPT
-- Target: a Supabase (or Supabase-compatible) Postgres project
-- Assumes: the `auth` schema (auth.users, auth.uid()) exists
-- Run as: postgres / service role owner, single transaction
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- 1. Enum types
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('learner', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.module_type AS ENUM ('module', 'exam');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- 2. Tables (creation order respects FK dependencies)
-- ---------------------------------------------------------------------

-- 2.1 organizations (tenants)
CREATE TABLE public.organizations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL UNIQUE,
  description   text,
  logo_url      text,
  primary_color text DEFAULT '#3b82f6',
  max_users     integer,
  domain        text,                       -- email domain for auto-assignment
  active        boolean NOT NULL DEFAULT true,
  settings      jsonb DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 2.2 profiles (1:1 with auth.users)
CREATE TABLE public.profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name      text NOT NULL,
  last_name       text NOT NULL,
  organization    text,                     -- legacy denormalized org name
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  job_role        text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_organization_id ON public.profiles (organization_id);

-- 2.3 user_roles (roles NEVER live on profiles — privilege escalation risk)
CREATE TABLE public.user_roles (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role    public.app_role NOT NULL DEFAULT 'learner',
  UNIQUE (user_id, role)
);

-- 2.4 admin_permissions (granular admin capabilities)
CREATE TABLE public.admin_permissions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  is_super_admin     boolean NOT NULL DEFAULT false,
  can_view_users     boolean NOT NULL DEFAULT false,
  can_manage_users   boolean NOT NULL DEFAULT false,
  can_view_courses   boolean NOT NULL DEFAULT false,
  can_manage_courses boolean NOT NULL DEFAULT false,
  organization_scope text,                  -- organizations.name, NULL = all
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- 2.5 course
CREATE TABLE public.course (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                   text NOT NULL,
  duration_minutes        integer NOT NULL,
  version                 text NOT NULL,
  active                  boolean NOT NULL DEFAULT true,
  description             text,
  category                text,
  organization            text,             -- legacy org name
  created_by              uuid REFERENCES auth.users(id),
  creator_organization_id uuid REFERENCES public.organizations(id),
  created_at              timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_category ON public.course (category);

-- 2.6 modules
CREATE TABLE public.modules (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id         uuid NOT NULL REFERENCES public.course(id) ON DELETE CASCADE,
  sequence          integer NOT NULL,
  title             text NOT NULL,
  type              public.module_type NOT NULL,
  estimated_minutes integer NOT NULL DEFAULT 2,
  body_html         text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, sequence)
);
CREATE INDEX idx_modules_course_sequence ON public.modules (course_id, sequence);

-- 2.7 questions
CREATE TABLE public.questions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id      uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  prompt         text NOT NULL,
  choices        jsonb NOT NULL,            -- {"A":"...","B":"...","C":"...","D":"..."}
  correct_choice text NOT NULL,             -- "A" | "B" | ...
  rationale      text,
  sequence       integer NOT NULL DEFAULT 1,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- 2.8 organization_courses (which courses a tenant may see)
CREATE TABLE public.organization_courses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  course_id       uuid NOT NULL REFERENCES public.course(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, course_id)
);

-- 2.9 enrollments
CREATE TABLE public.enrollments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id   uuid NOT NULL REFERENCES public.course(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

-- 2.10 progress
CREATE TABLE public.progress (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id      uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  completed      boolean NOT NULL DEFAULT false,
  completed_at   timestamptz,
  last_viewed_at timestamptz,
  UNIQUE (user_id, module_id)
);
CREATE INDEX idx_progress_user_module ON public.progress (user_id, module_id);

-- 2.11 attempts (exam submissions)
CREATE TABLE public.attempts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id    uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  score        numeric NOT NULL,            -- percentage 0-100
  passed       boolean NOT NULL,            -- score >= 80
  answers      jsonb NOT NULL,              -- {"<question_id>":"A", ...}
  submitted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_attempts_user_module ON public.attempts (user_id, module_id);

-- 2.12 certificates
CREATE TABLE public.certificates (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id      uuid NOT NULL REFERENCES public.course(id) ON DELETE CASCADE,
  certificate_id text NOT NULL UNIQUE,      -- public verification ID: CSIR-XXXXXXXXXX
  course_version text NOT NULL,
  issued_at      timestamptz NOT NULL,
  pdf_url        text,
  UNIQUE (user_id, course_id, course_version)
);
CREATE INDEX idx_certificates_user ON public.certificates (user_id);

-- 2.13 recertification_schedules
CREATE TABLE public.recertification_schedules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  course_id       uuid NOT NULL REFERENCES public.course(id) ON DELETE CASCADE,
  schedule_type   text NOT NULL CHECK (schedule_type IN ('monthly','quarterly','annually','custom')),
  custom_days     integer,
  enabled         boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, course_id)
);

-- 2.14 user_invitations
CREATE TABLE public.user_invitations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text NOT NULL,
  first_name        text,
  last_name         text,
  job_role          text,
  organization_id   uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_role      text NOT NULL DEFAULT 'learner'
                    CHECK (invited_role IN ('learner','org_admin','course_creator')),
  admin_permissions jsonb,
  course_ids        uuid[] DEFAULT '{}'::uuid[],
  token             text NOT NULL DEFAULT gen_random_uuid()::text,
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','accepted','expired','cancelled')),
  invited_by        uuid REFERENCES auth.users(id),
  expires_at        timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_invitations_token        ON public.user_invitations (token);
CREATE INDEX idx_user_invitations_status       ON public.user_invitations (status);
CREATE INDEX idx_user_invitations_organization ON public.user_invitations (organization_id);

-- ---------------------------------------------------------------------
-- 3. GRANTS (required — PostgREST/Data API has no default privileges)
-- ---------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles                   TO authenticated;
GRANT SELECT, INSERT, UPDATE         ON public.user_roles                 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_permissions          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course                     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modules                    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions                  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_courses       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollments                TO authenticated;
GRANT SELECT, INSERT, UPDATE         ON public.progress                   TO authenticated;
GRANT SELECT, INSERT                 ON public.attempts                   TO authenticated;
GRANT SELECT, INSERT                 ON public.certificates               TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recertification_schedules  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_invitations           TO authenticated;

-- anonymous (public) reads: certificate verification + invitation lookup by token
GRANT SELECT ON public.certificates     TO anon;
GRANT SELECT ON public.user_invitations TO anon;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- ---------------------------------------------------------------------
-- 4. Security-definer helper functions (avoid recursive RLS)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles
                 WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM admin_permissions
                 WHERE user_id = check_user_id AND is_super_admin = true);
$$;

CREATE OR REPLACE FUNCTION public.has_admin_access(check_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_permissions
    WHERE user_id = check_user_id
      AND (is_super_admin OR can_view_users OR can_manage_users
           OR can_view_courses OR can_manage_courses)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_org_users(check_user_id uuid, check_org text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_permissions
    WHERE user_id = check_user_id
      AND (is_super_admin = true
           OR (can_view_users = true
               AND (organization_scope = check_org OR check_org IS NULL)))
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_org_courses(check_user_id uuid, check_org text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_permissions
    WHERE user_id = check_user_id
      AND (is_super_admin = true
           OR (can_manage_courses = true
               AND (organization_scope = check_org OR check_org IS NULL)))
  );
$$;

-- Course visibility hierarchy (see docs/DATABASE_PORTABILITY.md §6)
CREATE OR REPLACE FUNCTION public.can_view_course(user_uuid uuid, course_uuid uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_org_id uuid;
  course_creator_org uuid;
  has_restrictions boolean;
BEGIN
  IF is_super_admin(user_uuid) THEN RETURN true; END IF;

  SELECT organization_id INTO user_org_id FROM profiles WHERE id = user_uuid;
  IF user_org_id IS NULL THEN RETURN false; END IF;

  SELECT creator_organization_id INTO course_creator_org FROM course WHERE id = course_uuid;

  IF EXISTS (SELECT 1 FROM organization_courses
             WHERE organization_id = user_org_id AND course_id = course_uuid) THEN
    RETURN true;
  END IF;

  SELECT EXISTS (SELECT 1 FROM organization_courses
                 WHERE organization_id = user_org_id) INTO has_restrictions;

  IF NOT has_restrictions AND course_creator_org IS NULL THEN RETURN true; END IF;
  IF course_creator_org = user_org_id THEN RETURN true; END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_course(user_uuid uuid, course_uuid uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_org_id uuid;
  has_restrictions boolean;
BEGIN
  SELECT organization_id INTO user_org_id FROM profiles WHERE id = user_uuid;
  IF user_org_id IS NULL THEN RETURN true; END IF;

  SELECT EXISTS (SELECT 1 FROM organization_courses
                 WHERE organization_id = user_org_id) INTO has_restrictions;
  IF NOT has_restrictions THEN RETURN true; END IF;

  RETURN EXISTS (SELECT 1 FROM organization_courses
                 WHERE organization_id = user_org_id AND course_id = course_uuid);
END;
$$;

-- ---------------------------------------------------------------------
-- 5. Triggers
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_admin_permissions_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.update_recertification_schedules_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_admin_permissions_updated_at
  BEFORE UPDATE ON public.admin_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_admin_permissions_updated_at();

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_admin_permissions_updated_at();

CREATE TRIGGER update_recertification_schedules_updated_at
  BEFORE UPDATE ON public.recertification_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_recertification_schedules_updated_at();

-- Signup: create profile, auto-assign organization, assign learner role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  org_record RECORD;
  user_email_domain TEXT;
BEGIN
  user_email_domain := LOWER(split_part(NEW.email, '@', 2));

  SELECT id, name INTO org_record
  FROM public.organizations
  WHERE LOWER(name) = LOWER(COALESCE(NEW.raw_user_meta_data ->> 'organization', ''))
    AND active = true
  LIMIT 1;

  IF org_record.id IS NULL THEN
    SELECT id, name INTO org_record
    FROM public.organizations
    WHERE LOWER(domain) = user_email_domain AND active = true
    LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, first_name, last_name, organization, organization_id, job_role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    COALESCE(org_record.name, NEW.raw_user_meta_data ->> 'organization'),
    org_record.id,
    NEW.raw_user_meta_data ->> 'job_role'
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'learner');
  RETURN NEW;
END;
$$;

-- Bootstrap admin by email (adjust or drop for your deployment)
CREATE OR REPLACE FUNCTION public.assign_admin_for_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email = 'michael.maccri@idma3.com' THEN
    UPDATE public.user_roles SET role = 'admin' WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_admin_for_email();

-- ---------------------------------------------------------------------
-- 6. Enable RLS
-- ---------------------------------------------------------------------
ALTER TABLE public.organizations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_courses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recertification_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invitations          ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 7. RLS policies
-- ---------------------------------------------------------------------

-- organizations
CREATE POLICY "Authenticated users can view active organizations"
  ON public.organizations FOR SELECT USING (active = true);
CREATE POLICY "Super admins can manage organizations"
  ON public.organizations FOR ALL USING (is_super_admin(auth.uid()));

-- profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Super admins can update any profile organization"
  ON public.profiles FOR UPDATE
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- user_roles
CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update user roles"
  ON public.user_roles FOR UPDATE
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- admin_permissions
CREATE POLICY "Users can view their own permissions"
  ON public.admin_permissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Super admins can view all permissions"
  ON public.admin_permissions FOR SELECT USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can insert permissions"
  ON public.admin_permissions FOR INSERT WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can update permissions"
  ON public.admin_permissions FOR UPDATE USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can delete permissions"
  ON public.admin_permissions FOR DELETE USING (is_super_admin(auth.uid()));

-- course
CREATE POLICY "Users can view accessible active courses"
  ON public.course FOR SELECT
  USING (active = true AND can_view_course(auth.uid(), id));
CREATE POLICY "Admins can manage courses"
  ON public.course FOR ALL USING (has_role(auth.uid(), 'admin'));

-- modules
CREATE POLICY "Anyone authenticated can view modules"
  ON public.modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage modules"
  ON public.modules FOR ALL USING (has_role(auth.uid(), 'admin'));

-- questions
CREATE POLICY "Anyone authenticated can view questions"
  ON public.questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage questions"
  ON public.questions FOR ALL USING (has_role(auth.uid(), 'admin'));

-- organization_courses
CREATE POLICY "Users can view their organization courses"
  ON public.organization_courses FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p
            JOIN organizations o ON p.organization = o.name
            WHERE p.id = auth.uid() AND o.id = organization_courses.organization_id)
  );
CREATE POLICY "Org admins can manage their org course assignments"
  ON public.organization_courses FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_permissions ap
            JOIN profiles p ON p.id = auth.uid()
            JOIN organizations o ON o.id = organization_courses.organization_id
            WHERE ap.user_id = auth.uid() AND ap.can_manage_courses = true
              AND p.organization_id = o.id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_permissions ap
            JOIN profiles p ON p.id = auth.uid()
            JOIN organizations o ON o.id = organization_courses.organization_id
            WHERE ap.user_id = auth.uid() AND ap.can_manage_courses = true
              AND p.organization_id = o.id)
  );
CREATE POLICY "Super admins can manage organization courses"
  ON public.organization_courses FOR ALL USING (is_super_admin(auth.uid()));

-- enrollments
CREATE POLICY "Users can view their own enrollments"
  ON public.enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can enroll themselves"
  ON public.enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all enrollments"
  ON public.enrollments FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage all enrollments"
  ON public.enrollments FOR ALL USING (has_role(auth.uid(), 'admin'));

-- progress
CREATE POLICY "Users can view their own progress"
  ON public.progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own progress"
  ON public.progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own progress"
  ON public.progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all progress"
  ON public.progress FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- attempts
CREATE POLICY "Users can view their own attempts"
  ON public.attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own attempts"
  ON public.attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all attempts"
  ON public.attempts FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- certificates
CREATE POLICY "Users can view their own certificates"
  ON public.certificates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own certificates"
  ON public.certificates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all certificates"
  ON public.certificates FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can verify certificates"
  ON public.certificates FOR SELECT TO anon, authenticated USING (true);

-- recertification_schedules
CREATE POLICY "Org admins can view their org recertification schedules"
  ON public.recertification_schedules FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_permissions ap
            JOIN organizations o ON o.id = recertification_schedules.organization_id
            JOIN profiles p ON p.organization_id = o.id
            WHERE ap.user_id = auth.uid()
              AND (ap.is_super_admin = true
                   OR (ap.can_view_courses = true AND p.id = auth.uid())))
  );
CREATE POLICY "Org admins can manage their org recertification schedules"
  ON public.recertification_schedules FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_permissions ap
            JOIN organizations o ON o.id = recertification_schedules.organization_id
            JOIN profiles p ON p.organization = o.name
            WHERE ap.user_id = auth.uid() AND ap.can_manage_courses = true
              AND p.id = auth.uid())
  );
CREATE POLICY "Super admins can manage all recertification schedules"
  ON public.recertification_schedules FOR ALL USING (is_super_admin(auth.uid()));

-- user_invitations
CREATE POLICY "Anyone can view invitation by token"
  ON public.user_invitations FOR SELECT USING (true);
CREATE POLICY "Org admins can view their org invitations"
  ON public.user_invitations FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_permissions ap
            WHERE ap.user_id = auth.uid()
              AND (ap.is_super_admin = true
                   OR (ap.can_view_users = true
                       AND ap.organization_scope = (SELECT name FROM organizations
                                                    WHERE id = user_invitations.organization_id))))
  );
CREATE POLICY "Super admins can manage invitations"
  ON public.user_invitations FOR ALL USING (is_super_admin(auth.uid()));

COMMIT;

-- ---------------------------------------------------------------------
-- 8. Storage buckets (Supabase only — run separately)
-- ---------------------------------------------------------------------
-- Buckets: module-images (public), organization-logos (public)
-- Create via the Supabase dashboard/API, then apply object policies:
--
-- CREATE POLICY "Public read module images" ON storage.objects
--   FOR SELECT USING (bucket_id = 'module-images');
-- CREATE POLICY "Admins upload module images" ON storage.objects
--   FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'module-images' AND public.has_role(auth.uid(), 'admin'));
-- (repeat for organization-logos)
