-- 098_scope_public_policies_and_revoke_anon_storage.sql
--
-- Defense-in-depth cleanup from the 2026-09-03 RLS audit (#3 and #4):
--
-- 3. A number of policies were created with `TO public` (meaning: both
--    the anon AND authenticated roles), even though every one of them
--    only makes sense for a logged-in user (they all reference
--    auth.uid() or a role check). They were not actually exploitable
--    by anonymous requests, because auth.uid() returns null for an
--    unauthenticated request and every comparison against null fails
--    closed. But that's an accidental side effect, not an explicit
--    rule — narrowing these to `TO authenticated` makes the intent
--    explicit and removes any reliance on that side effect.
--
--    ALTER POLICY ... TO ... only changes the role list; it leaves the
--    existing USING/WITH CHECK expressions untouched, so none of the
--    actual access logic changes here — only who the policy applies to.
--
-- 4. anon had full table-level grants (SELECT/INSERT/UPDATE/DELETE/etc)
--    on storage.objects. After #3 (and the avatar fix in migration
--    097), there is no remaining storage.objects policy that applies
--    to the anon role at all — so anon no longer needs any grant on
--    that table. Revoking it means even a future RLS policy mistake
--    on storage.objects can't be exploited by an anonymous request,
--    since anon would fail at the grant level before RLS is even
--    evaluated.

-- ── 3. Narrow public-scoped policies to authenticated ──────────────

alter policy "login_events_insert_self" on public.login_events to authenticated;
alter policy "login_events_select_admin" on public.login_events to authenticated;

alter policy "teachers_view_active_students_for_enrollment" on public.users to authenticated;

alter policy "Authors delete their own comment" on public.lesson_comments to authenticated;
alter policy "Enrolled students post lesson comments" on public.lesson_comments to authenticated;
alter policy "Enrolled students read lesson comments" on public.lesson_comments to authenticated;
alter policy "Teachers manage comments on their own lessons" on public.lesson_comments to authenticated;

alter policy "Authors delete their own announcement comment" on public.announcement_comments to authenticated;
alter policy "Enrolled students post announcement comments" on public.announcement_comments to authenticated;
alter policy "Enrolled students read announcement comments" on public.announcement_comments to authenticated;
alter policy "Teachers manage comments on their own announcements" on public.announcement_comments to authenticated;

alter policy "Enrolled students read announcements" on public.announcements to authenticated;
alter policy "Teachers manage announcements on their own courses" on public.announcements to authenticated;

alter policy "notification_preferences_insert_own" on public.notification_preferences to authenticated;
alter policy "notification_preferences_select_own" on public.notification_preferences to authenticated;
alter policy "notification_preferences_update_own" on public.notification_preferences to authenticated;

alter policy "submission_files_admin_all" on public.submission_files to authenticated;
alter policy "submission_files_student_all" on public.submission_files to authenticated;
alter policy "submission_files_teacher_select" on public.submission_files to authenticated;

alter policy "Admins manage all materials" on storage.objects to authenticated;
alter policy "Admins manage all submission files" on storage.objects to authenticated;
alter policy "Students manage their own submission files" on storage.objects to authenticated;
alter policy "Students read materials for enrolled courses" on storage.objects to authenticated;
alter policy "Teachers manage materials for their own courses" on storage.objects to authenticated;
alter policy "Teachers read submissions for their own course assignments" on storage.objects to authenticated;

-- ── 4. Revoke anon's now-unnecessary grants on storage.objects ─────
-- No policy on storage.objects applies to anon anymore (avatars_select
-- was narrowed in migration 097, and everything else above is now
-- `to authenticated`). Revoke the blanket grant so there's no grant
-- for anon to fall back on even if a policy mistake happens later.

revoke all on storage.objects from anon;
