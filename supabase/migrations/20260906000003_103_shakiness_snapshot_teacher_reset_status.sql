-- 20260906000003_103_shakiness_snapshot_teacher_reset_status.sql
-- Teacher-facing reset action (this session): when a teacher resets a
-- flagged question back to unmastered themselves, that is NOT the same
-- signal as a student genuinely getting it wrong again. Training the
-- model on a teacher's manual intervention would corrupt it with a
-- non-organic outcome the model was never meant to learn from. This
-- adds a third status so a teacher reset clears the flag (it's no
-- longer 'pending') without ever being mistaken for a real
-- 'confirmed_shaky' training example.

alter table public.mastery_shakiness_snapshots
  drop constraint mastery_shakiness_snapshots_status_check;

alter table public.mastery_shakiness_snapshots
  add constraint mastery_shakiness_snapshots_status_check
  check (status = any (array['pending'::text, 'confirmed_shaky'::text, 'teacher_reset'::text]));
