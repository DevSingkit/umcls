# Manual User Data Erasure Runbook (V1)

**Status:** V1 interim process — manual only, no UI.
**Supersedes:** none. Will itself be superseded by PH2-SEC-01's self-service
admin UI in V2 (button + confirmation modal + audit trail).
**Legal basis:** Philippine Data Privacy Act of 2012 (RA 10173). UMCLSI
operates in the Philippines and its students are minors — see
`SECURITY.md` NFR-SEC-11/NFR-SEC-12. This obligation exists the moment
one real student's data is stored, independent of what's shipped in
the UI (`VERSION_ROADMAP.md`, PH2-SEC-01 flag).

**Who may run this:** [NAME THE PERSON HERE — must be whoever holds
`SUPABASE_SERVICE_ROLE_KEY` / Supabase dashboard admin access. Do not
leave this blank. "Whoever's around" is not an acceptable answer for a
legal request involving a minor's data.]

---

## When this runbook applies

Run this when a student, parent/guardian, or the school itself
requests erasure of a specific user's personal data ("right to
erasure" / "right to be forgotten").

This is **anonymization**, not full row deletion — academic records
(quiz scores, lesson completions) are preserved for the school's
legitimate record-keeping, but all personally identifying fields are
scrubbed. This matches the design already specified in `SECURITY.md
§8.2` — this runbook just executes it by hand instead of from a
button, per the V1 scope decision in `VERSION_ROADMAP.md`.

---

## Before you start

1. Confirm the request is legitimate and get the person's `user_id`
   (from `public.users`, by email or name — Supabase Table Editor or
   SQL).
2. Confirm you are running this with **service-role** access
   (`supabaseAdmin`), not the anon/RLS-scoped client. Anonymization
   deliberately bypasses RLS.
3. Write down: date of request, who requested it, and the `user_id`.
   You'll need this for the audit log entry in step 4.

---

## Step 1 — Anonymize the `users` row

Run via Supabase SQL Editor (service role) or the equivalent JS:

```sql
update public.users
set
  full_name = 'Deleted User ' || substring(id::text, 1, 8),
  email = 'deleted_' || id::text || '@erased.invalid',
  avatar_url = null,
  metadata = '{}'::jsonb,
  deleted_at = now()
where id = '<user_id>';
```

Or, if working from the Node/service-role client directly:

```typescript
await supabaseAdmin.from('users').update({
  full_name: `Deleted User ${userId.slice(0, 8)}`,
  email: `deleted_${userId}@erased.invalid`,
  avatar_url: null,
  metadata: {},
  deleted_at: new Date().toISOString(),
}).eq('id', userId)
```

**Verify:** re-select the row. `full_name` and `email` should show the
placeholder values, `deleted_at` should be set.

---

## Step 2 — Delete the Supabase Auth account

```typescript
await supabaseAdmin.auth.admin.deleteUser(userId)
```

There's no SQL equivalent for this step — it must go through the
Supabase Admin API (JS/CLI), since Auth is a separate managed service
from the `public` schema.

**Verify:** the user can no longer log in (attempt a login with their
old email — should fail. `getUser()` in your app would also reject a
stale session for this ID per `AUTH_NOTES.md`'s "why getUser is used
instead of just reading the session").

---

## Step 3 — Remove any submission files from Storage

V1 doesn't have Assignments (PH3-004 is V2) or Materials (PH3-003 is
V2), so as of V1 launch **this step will usually be a no-op** — there
are no `assignment_submissions` rows to check yet. Run it anyway so
the runbook doesn't silently miss files once those features ship:

```typescript
const { data: submissions } = await supabaseAdmin
  .from('assignment_submissions')
  .select('file_path')
  .eq('student_id', userId)

for (const sub of submissions ?? []) {
  if (sub.file_path) {
    await supabaseAdmin.storage.from('submissions').remove([sub.file_path])
  }
}
```

**Verify:** query returns no remaining rows with a non-null
`file_path` for this user (or an empty array in V1, until Assignments
ships).

---

## Step 4 — Record the audit log entry

Even though there's no UI firing this automatically in V1, log it
manually so there's a paper trail matching what PH2-SEC-01's future
button will do automatically:

```sql
insert into public.audit_logs (actor_id, action, target_id, metadata, created_at)
values (
  '<your_admin_user_id>',
  'USER_GDPR_ERASED',
  '<user_id>',
  jsonb_build_object('method', 'manual_runbook', 'requested_by', '<who asked>'),
  now()
);
```

---

## Step 5 — Confirm access is fully blocked

- [ ] Login attempt with the old email fails
- [ ] `public.users.deleted_at` is set for this row
- [ ] `public.users.email` / `full_name` no longer show real PII
- [ ] Auth record no longer exists (deleted in Step 2)
- [ ] Any submission files removed (or confirmed none existed)
- [ ] Audit log entry recorded

---

## What is intentionally *not* deleted

Per `SECURITY.md §8.2`, academic records are preserved with PII
stripped — this is anonymization, not full erasure of the school's
records:

- `quiz_attempts`, `quiz_responses` scores/answers stay, keyed to the
  now-anonymized `user_id`
- `lesson_completions` stays
- `audit_logs` entries referencing this user prior to erasure stay
  (they're the security forensics record, retained per §8.1's 13-month
  policy — erasing those would defeat their purpose)

If a request specifically asks for full deletion of academic records
too (not just PII), that's a judgment call beyond this runbook's
scope — escalate rather than improvising a query.

---

## V2 note

Once PH2-SEC-01's full self-service UI ships, this manual runbook
becomes a fallback/reference only — the button will do steps 1–4
atomically with a confirmation modal. Until then, this document *is*
the process. Don't skip it because "no one's asked yet" — see the
flag in `VERSION_ROADMAP.md` for why this can't wait for V2.
