-- Login events table, used only for the admin dashboard's weekly
-- activity graph (PH2-001). Records one row per successful login.
-- This is intentionally separate from audit_logs: audit_logs already
-- records AUTH_LOGIN, but querying and grouping it by day for a chart
-- would mean filtering a general-purpose log table by action string on
-- every dashboard load. A dedicated table keeps that query cheap and
-- keeps audit_logs focused on its own job (a full compliance trail).

CREATE TABLE public.login_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'teacher'::text, 'student'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT login_events_pkey PRIMARY KEY (id),
  CONSTRAINT login_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE INDEX login_events_created_at_idx ON public.login_events (created_at);

ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;

-- Same shape as audit_logs: nobody selects/inserts/updates/deletes
-- directly. Only the login action itself inserts, using the request's
-- own authenticated session right after a successful sign-in, so no
-- special policy is needed beyond "a user can insert their own row."
CREATE POLICY login_events_insert_self ON public.login_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only admins can read this table, for the dashboard graph.
CREATE POLICY login_events_select_admin ON public.login_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );
