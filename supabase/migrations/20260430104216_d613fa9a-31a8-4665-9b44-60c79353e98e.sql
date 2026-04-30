-- Admin visibility policies
CREATE POLICY "Admins view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all medications"
ON public.medications FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all dose_events"
ON public.dose_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all scheduled_doses"
ON public.scheduled_doses FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all alerts"
ON public.alert_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all patient_links"
ON public.patient_links FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow promoting a user to admin manually via SQL editor; document helper
COMMENT ON TABLE public.user_roles IS 'Roles per user. To create the first admin: INSERT INTO public.user_roles (user_id, role) VALUES (''<uuid>'', ''admin'');';