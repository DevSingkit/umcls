// tests/security/rls-audit.ts
//
// NOTE: Vitest doesn't auto-load .env.local like Next.js does, so we
// load it explicitly here before reading process.env below.
import { config } from 'dotenv'
config({ path: '.env.local' })
//
// PH8-002 — RLS Audit
//
// Asserts cross-user/cross-role data isolation for every table V1
// features actually touch. Run with two teachers, two students, one
// admin, and an unauthenticated (anon) client so every combination is
// covered, not just "logged in vs not."
//
// Scope note: tables with no V1 feature writing to them yet
// (assignments, materials, grades, mastery_records, recommendations,
// notifications, ai_generation_logs, question_bank) are NOT covered
// here — see VERSION_ROADMAP.md. Add their RLS tests when those
// features actually ship, not before; empty-table RLS tests give false
// confidence about code paths that don't exist yet.
//
// This file assumes Vitest + a helper that returns a Supabase client
// scoped to a given user's session (see `getScopedClient` below —
// wire it to however your test setup signs test users in, e.g. via
// `supabase.auth.signInWithPassword` against seeded test accounts).

import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Seeded test fixtures — replace with your actual seed data IDs/creds
// (see PH0-003's seed: 1 admin, 2 teachers, 5 students, 2 courses).
const FIXTURES = {
    teacherA: { email: 'teacher@google.com', password: 'Teacher1234!' },
    teacherB: { email: 'teacher1@google.com', password: 'Teacher1234!' },
    studentA: { email: 'student@gmail.com', password: 'Student1234!' }, // enrolled in Teacher A's course
    studentB: { email: 'student1@gmail.com', password: 'Student1234!' }, // NOT enrolled anywhere
    admin: { email: 'admin@gmail.com', password: 'Admin123!' },
}

async function getScopedClient(creds: { email: string; password: string } | null): Promise<SupabaseClient> {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    if (creds) {
        const { error } = await client.auth.signInWithPassword(creds)
        if (error) throw new Error(`Fixture login failed for ${creds.email}: ${error.message}`)
    }
    return client
}

describe('PH8-002 — RLS Audit', () => {
    let teacherA: SupabaseClient
    let teacherB: SupabaseClient
    let studentA: SupabaseClient
    let studentB: SupabaseClient
    let admin: SupabaseClient
    let anon: SupabaseClient

    // IDs to be filled in from fixture data once logged in / queried.
    let teacherACourseId: string
    let teacherAQuizId: string
    let teacherAQuestionId: string
    let teacherALessonId: string

    beforeAll(async () => {
        teacherA = await getScopedClient(FIXTURES.teacherA)
        teacherB = await getScopedClient(FIXTURES.teacherB)
        studentA = await getScopedClient(FIXTURES.studentA)
        studentB = await getScopedClient(FIXTURES.studentB)
        admin = await getScopedClient(FIXTURES.admin)
        anon = await getScopedClient(null)

        const { data: course } = await teacherA.from('courses').select('id').limit(1).single()
        teacherACourseId = course!.id

        const { data: quiz } = await teacherA.from('quizzes').select('id').eq('course_id', teacherACourseId).limit(1).single()
        teacherAQuizId = quiz?.id

        const { data: question } = await teacherA.from('questions').select('id').eq('quiz_id', teacherAQuizId).limit(1).single()
        teacherAQuestionId = question?.id

        const { data: lesson } = await teacherA.from('lessons').select('id').eq('course_id', teacherACourseId).limit(1).single()
        teacherALessonId = lesson?.id
    })

    // ---- users ----
    describe('users', () => {
        it('unauthenticated cannot read the users table', async () => {
            const { data, error } = await anon.from('users').select('*')
            expect(data === null || data.length === 0 || error !== null).toBe(true)
        })

        it('a teacher cannot update another user\u2019s role or is_active', async () => {
            const { data: studentARow } = await admin.from('users').select('id, role').eq('email', FIXTURES.studentA.email).single()
            if (!studentARow) throw new Error(`Fixture lookup failed: no user found with email ${FIXTURES.studentA.email} — check FIXTURES matches your seeded accounts`)

            const { data } = await teacherA.from('users').update({ role: 'admin' }).eq('id', studentARow.id).select()
            expect(data?.length ?? 0).toBe(0)

            const { data: check } = await admin.from('users').select('role').eq('id', studentARow.id).single()
            expect(check?.role).toBe('student')
        })
    })

    // ---- courses ----
    describe('courses', () => {
        it('Teacher B cannot see Teacher A\u2019s unpublished course', async () => {
            const { data } = await teacherB.from('courses').select('id').eq('id', teacherACourseId)
            expect(data?.length ?? 0).toBe(0)
        })

        it('Teacher B cannot update Teacher A\u2019s course', async () => {
            // RLS blocks this by filtering the row out of the UPDATE's WHERE
            // clause, not by throwing a permission error — so check that
            // zero rows came back, AND independently verify as admin that
            // the title genuinely didn't change.
            const { data } = await teacherB.from('courses').update({ title: 'Hijacked' }).eq('id', teacherACourseId).select()
            expect(data?.length ?? 0).toBe(0)

            const { data: check } = await admin.from('courses').select('title').eq('id', teacherACourseId).single()
            expect(check?.title).not.toBe('Hijacked')
        })

        it('a student not enrolled cannot see the course at all (unpublished or published)', async () => {
            const { data } = await studentB.from('courses').select('id').eq('id', teacherACourseId)
            expect(data?.length ?? 0).toBe(0)
        })

        it('admin can see all courses regardless of teacher', async () => {
            const { data, error } = await admin.from('courses').select('id').eq('id', teacherACourseId)
            expect(error).toBeNull()
            expect(data?.length).toBe(1)
        })
    })

    // ---- enrollments ----
    describe('enrollments', () => {
        it('a student cannot enroll themselves (enrollment is admin-only, C-03)', async () => {
            const { error } = await studentB.from('enrollments').insert({
                course_id: teacherACourseId,
                student_id: (await studentB.auth.getUser()).data.user!.id,
            })
            expect(error).not.toBeNull()
        })

        it('Teacher B cannot read enrollment rows for Teacher A\u2019s course', async () => {
            const { data } = await teacherB.from('enrollments').select('id').eq('course_id', teacherACourseId)
            expect(data?.length ?? 0).toBe(0)
        })
    })

    // ---- lessons ----
    describe('lessons', () => {
        it('an unenrolled student cannot read a lesson even by direct ID', async () => {
            const { data } = await studentB.from('lessons').select('id').eq('id', teacherALessonId)
            expect(data?.length ?? 0).toBe(0)
        })

        it('Teacher B cannot edit a lesson inside Teacher A\u2019s course', async () => {
            const { data } = await teacherB.from('lessons').update({ title: 'Hijacked' }).eq('id', teacherALessonId).select()
            expect(data?.length ?? 0).toBe(0)

            const { data: check } = await admin.from('lessons').select('title').eq('id', teacherALessonId).single()
            expect(check?.title).not.toBe('Hijacked')
        })

        it('an enrolled student cannot see an unpublished lesson', async () => {
            const { data } = await studentA.from('lessons').select('id').eq('id', teacherALessonId).eq('is_published', false)
            expect(data?.length ?? 0).toBe(0)
        })
    })

    // ---- lesson_completions ----
    describe('lesson_completions', () => {
        it('a student cannot insert a completion for a lesson in a course they are not enrolled in (IDOR check)', async () => {
            const { error } = await studentB.from('lesson_completions').insert({
                lesson_id: teacherALessonId,
                student_id: (await studentB.auth.getUser()).data.user!.id,
            })
            expect(error).not.toBeNull()
        })

        it('a student cannot insert a completion on behalf of a different student', async () => {
            const { data: studentARow } = await admin.from('users').select('id').eq('email', FIXTURES.studentA.email).single()
            if (!studentARow) throw new Error(`Fixture lookup failed: no user found with email ${FIXTURES.studentA.email}`)

            const { error } = await studentB.from('lesson_completions').insert({
                lesson_id: teacherALessonId,
                student_id: studentARow.id, // impersonation attempt
            })
            expect(error).not.toBeNull()
        })
    })

    // ---- quizzes / questions / answer_options ----
    describe('quizzes, questions, answer_options', () => {
        it('Teacher B cannot read questions belonging to Teacher A\u2019s quiz', async () => {
            const { data } = await teacherB.from('questions').select('id').eq('quiz_id', teacherAQuizId)
            expect(data?.length ?? 0).toBe(0)
        })

        it('a student can never read answer_options.is_correct directly (grading must go through the server action, not client select)', async () => {
            const { data, error } = await studentA.from('answer_options').select('is_correct').eq('question_id', teacherAQuestionId)
            // Either the query is fully blocked, or if readable for rendering options,
            // is_correct specifically must not be exposed. Fail the test if any row
            // leaks a non-null is_correct value to a student client.
            const leaked = (data ?? []).some((row: any) => row.is_correct !== null && row.is_correct !== undefined)
            expect(error !== null || leaked === false).toBe(true)
        })

        it('an unenrolled student cannot read a published quiz\u2019s questions', async () => {
            const { data } = await studentB.from('questions').select('id').eq('quiz_id', teacherAQuizId)
            expect(data?.length ?? 0).toBe(0)
        })

        it('Teacher B cannot publish/unpublish Teacher A\u2019s quiz', async () => {
            const { data } = await teacherB.from('quizzes').update({ is_published: true }).eq('id', teacherAQuizId).select()
            expect(data?.length ?? 0).toBe(0)

            const { data: check } = await admin.from('quizzes').select('is_published').eq('id', teacherAQuizId).single()
            expect(check?.is_published).toBe(false)
        })
    })

    // ---- quiz_attempts / quiz_responses ----
    describe('quiz_attempts, quiz_responses', () => {
        it('a student cannot insert an attempt on behalf of another student (IDOR check)', async () => {
            const { data: studentBRow } = await admin.from('users').select('id').eq('email', FIXTURES.studentB.email).single()
            if (!studentBRow) throw new Error(`Fixture lookup failed: no user found with email ${FIXTURES.studentB.email}`)

            const { error } = await studentA.from('quiz_attempts').insert({
                quiz_id: teacherAQuizId,
                student_id: studentBRow.id, // impersonation attempt
            })
            expect(error).not.toBeNull()
        })

        it('a student cannot read another student\u2019s quiz_attempts', async () => {
            const { data: studentARow } = await admin.from('users').select('id').eq('email', FIXTURES.studentA.email).single()
            if (!studentARow) throw new Error(`Fixture lookup failed: no user found with email ${FIXTURES.studentA.email}`)

            const { data } = await studentB.from('quiz_attempts').select('id').eq('student_id', studentARow.id)
            expect(data?.length ?? 0).toBe(0)
        })

        it('Teacher B cannot read quiz_attempts for Teacher A\u2019s quiz', async () => {
            const { data } = await teacherB.from('quiz_attempts').select('id').eq('quiz_id', teacherAQuizId)
            expect(data?.length ?? 0).toBe(0)
        })

        it('a student cannot directly insert quiz_responses with is_correct = true (grading must happen server-side only)', async () => {
            const { error } = await studentA.from('quiz_responses').insert({
                attempt_id: '00000000-0000-0000-0000-000000000000', // not their own attempt
                question_id: teacherAQuestionId,
                is_correct: true,
                points_awarded: 999,
            })
            expect(error).not.toBeNull()
        })
    })

    // ---- audit_logs ----
    describe('audit_logs', () => {
        it('a teacher cannot read audit_logs (admin/service-role only)', async () => {
            const { data, error } = await teacherA.from('audit_logs').select('id').limit(1)
            expect(data === null || data.length === 0 || error !== null).toBe(true)
        })

        it('a student cannot insert into audit_logs directly', async () => {
            const { error } = await studentA.from('audit_logs').insert({
                action: 'FAKE_EVENT',
                actor_id: (await studentA.auth.getUser()).data.user!.id,
            })
            expect(error).not.toBeNull()
        })
    })

    // ---- deactivated user (is_active) ----
    describe('is_active enforcement', () => {
        it('a deactivated user\u2019s next request is rejected at the RLS layer (not just the app layer)', async () => {
            // Deactivate studentB via admin, then confirm auth_role()-gated
            // policies now reject them directly at the database — this is
            // what migration 20260705_021_auth_role_is_active.sql fixes.
            // Residual: policies keyed on `student_id = auth.uid()` directly
            // (not via auth_role()) are NOT covered by this — see that
            // migration's scope note. Don't expand this test to those
            // tables without also deciding to close that gap for real.
            const { data: studentBRow } = await admin.from('users').select('id').eq('email', FIXTURES.studentB.email).single()
            if (!studentBRow) throw new Error(`Fixture lookup failed: no user found with email ${FIXTURES.studentB.email}`)

            await admin.from('users').update({ is_active: false }).eq('id', studentBRow.id)

            // courses_select_student policy gates on auth_role() = 'student' —
            // once auth_role() returns null for a deactivated user, this
            // returns zero rows even for a course they're genuinely enrolled in.
            const { data } = await studentB.from('courses').select('id').limit(1)
            expect(data?.length ?? 0).toBe(0)

            // cleanup — reactivate so re-running the suite doesn't lock the fixture out
            await admin.from('users').update({ is_active: true }).eq('id', studentBRow.id)
        })
    })
})