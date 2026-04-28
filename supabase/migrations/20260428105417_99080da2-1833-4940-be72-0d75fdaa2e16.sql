-- 1. Extend app_role enum (if values missing)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'doctor' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'doctor';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'caregiver' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'caregiver';
  END IF;
END $$;

-- 2. Update handle_new_user to read role from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));

  _role := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'role','')::public.app_role,
    'patient'::public.app_role
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Patient phone for SMS alerts
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- 4. Patient ↔ care-team links table
CREATE TABLE IF NOT EXISTS public.patient_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  clinician_id UUID NOT NULL,
  relationship TEXT NOT NULL CHECK (relationship IN ('doctor','caregiver')),
  alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (patient_id, clinician_id)
);
CREATE INDEX IF NOT EXISTS idx_patient_links_patient ON public.patient_links(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_links_clinician ON public.patient_links(clinician_id);
ALTER TABLE public.patient_links ENABLE ROW LEVEL SECURITY;

-- Patient manages their own links
CREATE POLICY "Patient manages own links"
  ON public.patient_links FOR ALL TO authenticated
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

-- Clinician can view their links
CREATE POLICY "Clinician views own links"
  ON public.patient_links FOR SELECT TO authenticated
  USING (auth.uid() = clinician_id);

-- 5. Invite codes (patient creates, clinician redeems)
CREATE TABLE IF NOT EXISTS public.care_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  code TEXT NOT NULL UNIQUE,
  relationship TEXT NOT NULL CHECK (relationship IN ('doctor','caregiver')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  redeemed_by UUID,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_care_invites_code ON public.care_invites(code);
ALTER TABLE public.care_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patient manages own invites"
  ON public.care_invites FOR ALL TO authenticated
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

-- Anyone authenticated can SELECT an invite by code to redeem
CREATE POLICY "Authenticated can view invites"
  ON public.care_invites FOR SELECT TO authenticated
  USING (true);

-- 6. Allow clinicians to read linked patients' scheduled_doses, dose_events, risk_assessments, medications, profiles
-- Helper function
CREATE OR REPLACE FUNCTION public.is_linked_clinician(_patient_id UUID)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patient_links
    WHERE patient_id = _patient_id AND clinician_id = auth.uid()
  );
$$;

CREATE POLICY "Clinician views linked patient meds"
  ON public.medications FOR SELECT TO authenticated
  USING (public.is_linked_clinician(user_id));

CREATE POLICY "Clinician views linked patient scheduled_doses"
  ON public.scheduled_doses FOR SELECT TO authenticated
  USING (public.is_linked_clinician(user_id));

CREATE POLICY "Clinician views linked patient dose_events"
  ON public.dose_events FOR SELECT TO authenticated
  USING (public.is_linked_clinician(user_id));

CREATE POLICY "Clinician views linked patient risk"
  ON public.risk_assessments FOR SELECT TO authenticated
  USING (public.is_linked_clinician(user_id));

CREATE POLICY "Clinician views linked patient profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_linked_clinician(id));

-- 7. Alert log (so we don't double-send)
CREATE TABLE IF NOT EXISTS public.alert_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  scheduled_dose_id UUID,
  kind TEXT NOT NULL,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alert_log_patient ON public.alert_log(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_log_dose ON public.alert_log(scheduled_dose_id);
ALTER TABLE public.alert_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patient views own alerts"
  ON public.alert_log FOR SELECT TO authenticated
  USING (auth.uid() = patient_id);

CREATE POLICY "Clinician views linked patient alerts"
  ON public.alert_log FOR SELECT TO authenticated
  USING (public.is_linked_clinician(patient_id));