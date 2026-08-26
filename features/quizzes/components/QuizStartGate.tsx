'use client'
// features/quizzes/components/QuizStartGate.tsx
//
// New component — the "before you start" state for a quiz, per
// DESIGN-LMS.md §8.10 Model B (two-column, main content + sticky
// side panel with a Start/Resume action).
//
// Deliberately does NOT touch TakeQuizForm.tsx's internals. That
// component owns a real, already-working timer/autosave/lock flow —
// splitting its state across a side panel would be a genuine behavior
// change to timer-sensitive code for no real benefit. Instead, this
// component gates WHEN TakeQuizForm mounts: before the student clicks
// Start/Resume, they see the Model B overview; after, TakeQuizForm
// takes over full-width exactly as it already did, unchanged. This is
// purely a UI delay, not a data-fetching change — the quiz data was
// already fetched server-side in page.tsx exactly as before; this
// component just decides when to render it.
//
// Note this doesn't change attempt-start semantics either: clicking
// "Resume" still calls startQuizAttempt on TakeQuizForm's mount (via
// its own effect), which resumes the same existing in-progress
// attempt — it was already silently doing this the instant the old
// page rendered TakeQuizForm; the only change is that now happens
// after an explicit click instead of automatically on page load.

import { useState } from 'react'
import { TakeQuizForm } from './TakeQuizForm'

type Question = {
    id: string
    question_text: string
    question_type: string
    options: { id: string; option_text: string }[]
}

type Quiz = {
    id: string
    title: string
    description: string | null
    course_id: string
    shuffle_questions: boolean
    shuffle_options: boolean
    questions: Question[]
}

export function QuizStartGate({
    quiz,
    courseId,
    isResume,
}: {
    quiz: Quiz
    courseId: string
    isResume: boolean
}) {
    const [started, setStarted] = useState(false)

    if (started) {
        return <TakeQuizForm quiz={quiz} courseId={courseId} />
    }

    return (
        <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-6 lg:items-start">
            <div>
                <h1 className="font-heading text-h1 text-ink mb-2">{quiz.title}</h1>
                {quiz.description && (
                    <p className="text-body-md text-text-secondary mb-6">{quiz.description}</p>
                )}
                <div className="bg-surface rounded-md shadow-card p-6">
                    <p className="text-body-md text-ink">
                        {quiz.questions.length} question{quiz.questions.length === 1 ? '' : 's'}
                    </p>
                </div>
            </div>

            <div className="mt-6 lg:mt-0 lg:sticky lg:top-6">
                <div className="bg-surface rounded-md shadow-card p-6 space-y-4">
                    <span className="inline-flex items-center rounded-pill bg-hairline text-text-secondary text-caption font-semibold px-3 py-1">
                        {isResume ? 'In progress' : 'Not started'}
                    </span>
                    <button
                        type="button"
                        onClick={() => setStarted(true)}
                        className="w-full h-11 rounded-md bg-brand hover:bg-brand-hover text-on-ink font-semibold text-body-md transition-colors"
                    >
                        {isResume ? 'Resume quiz' : 'Start quiz'}
                    </button>
                </div>
            </div>
        </div>
    )
}
