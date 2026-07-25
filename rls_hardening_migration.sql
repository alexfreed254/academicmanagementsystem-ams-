-- ====================================================================
--  RLS HARDENING MIGRATION — TTTI Academic Management System
--  Run once in the Supabase SQL Editor (after all earlier migrations).
--
--  Fixes found by the infrastructure/security audit:
--    A. Tables with RLS policies defined but RLS never ENABLED
--       (policies were silently ineffective).
--    B. Tables with no RLS at all (now default-deny for anon/user JWTs).
--    C. Unrestricted USING (true) policies replaced or removed.
--    D. user_profiles role CHECK aligned with the application role list.
--
--  SAFE FOR THE RUNNING APP: both the Flask backend and the Cloudflare
--  Worker use the service_role key, which BYPASSES RLS. These changes
--  only close direct PostgREST access with anon/user tokens
--  (defence in depth), they do not change application behaviour.
-- ====================================================================


-- ────────────────────────────────────────────────────────────────────
-- A. Enable RLS on tables that already have policies in
--    supabase_schema.sql but were missing from the ENABLE block.
-- ────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS exam_bookings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS marks                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS trainer_documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS trainee_documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS companies              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS mentors                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS industrial_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS location_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS digital_logbook        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS competency_tracking    ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────────────
-- B. Enable RLS on tables that had none. No policies are added, so
--    anon/user JWTs get default-deny; the service_role key (used by
--    the backend) bypasses RLS and keeps working.
-- ────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS formative_assessments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS formative_marks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS summative_competences         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS biometric_sessions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workshop_inventory            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS attachment_periods            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS attachment_period_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS attachment_weekly_attendance  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS attachment_grading_config     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS attachment_grades             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS mentoring_tool_uploads        ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────────────
-- C. Remove / replace unrestricted USING (true) policies.
--    (dept_notices "service_role_all" is scoped TO service_role and
--    is fine — left untouched.)
-- ────────────────────────────────────────────────────────────────────

-- clearance_lost_items: policy applied to ALL roles with USING (true).
-- Backend uses service_role, so no replacement policy is needed.
DROP POLICY IF EXISTS lost_items_all_service ON clearance_lost_items;

-- biometric_scanners: same problem — unrestricted for every role.
DROP POLICY IF EXISTS biometric_scanners_service ON biometric_scanners;

-- academic_trips: SELECT was USING (true) "filtered by application logic".
-- Replace with department isolation at the database level.
DROP POLICY IF EXISTS "Users can view department trips" ON academic_trips;
CREATE POLICY "Users can view department trips" ON academic_trips
    FOR SELECT
    USING (
        current_user_active()
        AND (
            current_user_role() = 'super_admin'
            OR current_user_dept() = department_id
        )
    );

-- academic_trip_media: FOR ALL whenever the parent trip existed (i.e. always).
-- Scope media to the parent trip's department; writes restricted to the uploader.
DROP POLICY IF EXISTS "Media follows trip permissions" ON academic_trip_media;
CREATE POLICY "Media view follows trip department" ON academic_trip_media
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM academic_trips t
            WHERE t.id = academic_trip_media.trip_id
              AND current_user_active()
              AND (
                  current_user_role() = 'super_admin'
                  OR current_user_dept() = t.department_id
              )
        )
    );
CREATE POLICY "Media insert by trip uploader" ON academic_trip_media
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM academic_trips t
            WHERE t.id = academic_trip_media.trip_id
              AND t.uploaded_by = auth.uid()
        )
    );


-- ────────────────────────────────────────────────────────────────────
-- D. Align the user_profiles role CHECK with the application.
--    Adds: service_clearance_officer (used by the app but rejected by
--    the old CHECK) and trip_coordinator (referenced by trips policies).
--    Keeps industry_supervisor for existing rows.
-- ────────────────────────────────────────────────────────────────────
ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_role_check CHECK (role IN (
    'super_admin',
    'dept_admin',
    'trainer',
    'student',
    'employer',
    'examination_officer',
    'industry_mentor',
    'internal_verifier',
    'sports_hod',
    'environment_hod',
    'dean_students',
    'library_hod',
    'finance_officer',
    'registrar',
    'deputy_principal',
    'quality_assurance_officer',
    'workshop_technician',
    'liaison_officer',
    'cdacc_verifier',
    'industry_supervisor',
    'service_clearance_officer',
    'trip_coordinator'
  ));

ALTER TABLE user_profiles
  ALTER COLUMN role TYPE VARCHAR(50);


-- ────────────────────────────────────────────────────────────────────
-- Verification queries (run after applying):
--
-- 1) Every public table should now have rowsecurity = true:
--    SELECT tablename, rowsecurity FROM pg_tables
--    WHERE schemaname = 'public' ORDER BY rowsecurity, tablename;
--
-- 2) No unrestricted policies should remain:
--    SELECT schemaname, tablename, policyname, qual
--    FROM pg_policies WHERE qual = 'true';
-- ────────────────────────────────────────────────────────────────────
