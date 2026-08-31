'use client'
// Read-only quiz preview for teachers — visually matches TakeQuizForm,
// but nothing here writes to the database. No quiz_attempts row is
// created, no autosave fires, and the timer (if the quiz has one) just
// counts down for display purposes and does nothing at zero. A teacher
// can select options to see how the form feels, but nothing is ever
// submitted or persisted.

import { useEffect, useState } from 'react'

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
    time_limit_minutes: number | null
    questions: Question[]
}

type Answer = {
    selectedOptionIds: string[]
    textResponse: string
}

export function QuizPreviewForm({ quiz }: { quiz: Quiz }) {
    const [answers, setAnswers] = useState<Record<string, Answer>>({})
    const [remainingSeconds, setRemainingSeconds] = useState<number | null>(
        quiz.time_limit_minutes ? quiz.time_limit_minutes * 60 : null
    )

    const hasTimer = quiz.time_limit_minutes !== null
    useEffect(() => {
        if (!hasTimer) return
        const interval = setInterval(() => {
            setRemainingSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : 0))
        }, 1000)
        return () => clearInterval(interval)
    }, [hasTimer])

    function selectSingleAnswer(questionId: string, optionId: string) {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: { selectedOptionIds: [optionId], textResponse: '' },
        }))
    }

    function toggleChecklistAnswer(questionId: string, optionId: string) {
        setAnswers((prev) => {
            const current = prev[questionId]?.selectedOptionIds ?? []
            const next = current.includes(optionId)
                ? current.filter((id) => id !== optionId)
                : [...current, optionId]
            return { ...prev, [questionId]: { selectedOptionIds: next, textResponse: '' } }
        })
    }

    function setTextAnswer(questionId: string, text: string) {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: { selectedOptionIds: [], textResponse: text },
        }))
    }

    const formattedTime =
        remainingSeconds !== null
            ? `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')}`
            : null

    return (
        <div className="max-w-2xl">
            <div className="sticky top-0 z-10 bg-warning-soft border border-warning rounded-md px-4 py-3 mb-6 text-center">
                <p className="text-caption font-semibold text-warning">
                    Preview mode — not a real attempt. Nothing here is saved or submitted.
                </p>
            </div>

            <div className="flex items-start justify-between gap-4 mb-2">
                <h1 className="text-h1 text-ink">{quiz.title}</h1>
                {formattedTime && (
                    <span className="text-body-emphasis text-ink whitespace-nowrap" role="timer" aria-live="polite">
                        {formattedTime}
                    </span>
                )}
            </div>
            {quiz.description && <p className="text-body-md text-text-secondary mb-8">{quiz.description}</p>}

            <div className="grid gap-4 mb-8">
                {quiz.questions.map((question, index) => (
                    <div key={question.id} className="bg-surface rounded-md border border-hairline shadow-card p-6">
                        <p className="text-caption text-text-secondary mb-2">Question {index + 1}</p>
                        <p className="text-body-emphasis text-ink mb-4">{question.question_text}</p>

                        {question.question_type === 'short_answer' ? (
                            <textarea
                                value={answers[question.id]?.textResponse ?? ''}
                                onChange={(e) => setTextAnswer(question.id, e.target.value)}
                                placeholder="Type your answer here"
                                className="w-full rounded-md border-2 border-hairline px-4 py-3 text-body-md text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                                rows={3}
                            />
                        ) : question.question_type === 'checklist' ? (
                            <div className="grid gap-2">
                                {question.options.map((option) => (
                                    <label
                                        key={option.id}
                                        className="flex items-center gap-3 rounded-md border-2 border-hairline px-4 py-3 cursor-pointer has-[:checked]:border-brand has-[:checked]:bg-brand-soft"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={(answers[question.id]?.selectedOptionIds ?? []).includes(option.id)}
                                            onChange={() => toggleChecklistAnswer(question.id, option.id)}
                                            className="h-5 w-5 accent-brand"
                                        />
                                        <span className="text-body-md text-ink">{option.option_text}</span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                {question.options.map((option) => (
                                    <label
                                        key={option.id}
                                        className="flex items-center gap-3 rounded-md border-2 border-hairline px-4 py-3 cursor-pointer has-[:checked]:border-brand has-[:checked]:bg-brand-soft"
                                    >
                                        <input
                                            type="radio"
                                            name={`question-${question.id}`}
                                            checked={(answers[question.id]?.selectedOptionIds ?? [])[0] === option.id}
                                            onChange={() => selectSingleAnswer(question.id, option.id)}
                                            className="h-5 w-5 accent-brand"
                                        />
                                        <span className="text-body-md text-ink">{option.option_text}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="w-full h-11 rounded-md bg-surface-sunken text-text-muted font-semibold text-body-md flex items-center justify-center">
                Submit disabled in preview
            </div>
        </div>
    )
}
