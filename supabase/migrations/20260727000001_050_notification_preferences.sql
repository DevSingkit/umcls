-- 050_notification_preferences.sql
-- Backs the Settings page's notification toggles (comments, grades, new
-- lessons). Nothing in the schema tracked per-user notification
-- preferences before this — the notifications table itself only records
-- what was sent, not what a user wants to receive.
--
-- One row per user, defaulting every preference to true so existing
-- users keep getting notified exactly as they do today until they
-- actively turn something off.

CREATE TABLE public.notification_preferences (
  user_id uuid NOT NULL,
  comments_enabled boolean NOT NULL DEFAULT true,
  grades_enabled boolean NOT NULL DEFAULT true,
  new_lessons_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notification_preferences_pkey PRIMARY KEY (user_id),
  CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- A user can only ever see/edit their own row. Same is_course_teacher-
-- style ownership pattern used everywhere else — auth.uid() = user_id,
-- nothing more permissive.
CREATE POLICY notification_preferences_select_own
  ON public.notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY notification_preferences_insert_own
  ON public.notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY notification_preferences_update_own
  ON public.notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
