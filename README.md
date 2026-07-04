# LMS — Starter Scaffold (PH0-001 / PH0-002)

This is the output of `tasks.md` PH0-001 and PH0-002 — a bootstrapped Next.js
project with the tooling and env validation the rest of the build depends on.
It is **not** a full app yet. `pnpm dev` will show a placeholder page.

## Setup, in order

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up Supabase (PH0-003 — do this before step 3)

1. Go to your Supabase project → Settings → API. Copy the **Project URL**,
   **anon public key**, and **service_role key**.
2. Install the Supabase CLI: `npm install -g supabase`
3. `supabase login`, then `supabase link --project-ref your-project-ref`
4. You'll need the actual migration SQL files — these come from
   `DATABASE.md` in the spec repo, not from this scaffold. Extract each
   `-- Migration NNN` code block from `DATABASE.md` into
   `supabase/migrations/NNN_description.sql`, in order, then run:
   ```bash
   supabase db reset
   ```
5. **V1 note:** you don't need every migration in `DATABASE.md` on day one.
   Migrations that only support V2/V3 tables (`reteach_lessons`,
   `reteach_retake_requests`, `student_activity_events`, etc.) are safe to
   apply anyway — empty tables cost nothing — but if you want a truly
   minimal V1 database, you can skip straight to the tables PH1-PH4's V1
   tasks actually touch: `users`, `courses`, `lessons`, `enrollments`,
   `quizzes`, `questions`, `answer_options`, `quiz_attempts`,
   `quiz_responses`. Check VERSION_ROADMAP.md before skipping anything —
   some V1 tasks assume specific RLS policies exist.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the real values from step 2, plus an Upstash Redis URL/token
(free tier at [upstash.com](https://upstash.com) — needed even in V1, for
login rate-limiting). `GEMINI_API_KEY` can stay as the placeholder until
you reach V3 (PH9-004) — see the comment in `.env.example`.

### 4. Install the Python secret-scanning tool (PH0-002, optional but recommended)

```bash
pip install detect-secrets
detect-secrets scan > .secrets.baseline
```

Skip this and the pre-commit hook will warn but not block — see the comment
in `.husky/pre-commit`.

### 5. Run it

```bash
pnpm dev
```

Should start on `localhost:3000` with the placeholder page. If it doesn't
start, or throws an error about missing env vars, that's `lib/env.ts`
doing exactly what PH0-002 asked it to do — check `.env.local` against
`.env.example`.

### 6. Verify the tooling actually works

```bash
pnpm build      # should compile with zero TypeScript errors (strict mode)
pnpm lint       # should run clean
git add . && git commit -m "not a real commit message"   # should be REJECTED by Husky
git add . && git commit -m "chore: initial scaffold"     # should be accepted
```

If the bad commit message goes through, Husky isn't wired up right — check
that `.husky/commit-msg` is executable (`chmod +x .husky/commit-msg`) and
that `pnpm prepare` ran (it runs automatically on `pnpm install` via the
`prepare` script in `package.json`).

## What's next

Once this is running and `pnpm build`/`pnpm lint` are clean: **PH1-001
(Login Page)** in `tasks.md`. See `VERSION_ROADMAP.md` for the full V1
build order.
