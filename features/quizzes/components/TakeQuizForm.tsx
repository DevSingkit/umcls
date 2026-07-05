'use client'
// Lets a student answer each question, then submit. When they submit,
// this sends the answers to gradeQuizSubmission, which is the only
// place the real answer key exists. This component never sees which
// option is correct, only the pass or fail result after grading.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { gradeQuizSubmission } from '@/features/quizzes/actions/grade-quiz-submission'

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
    passing_score: number
    questions: Question[]
}

export function TakeQuizForm({ quiz, courseId }: { quiz: Quiz; courseId: string }) {
    const router = useRouter()
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [error, setError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    function selectAnswer(questionId: string, optionId: string) {
        setAnswers((prev) => ({ ...prev, [questionId]: optionId }))
    }

    async function handleSubmit() {
        const unanswered = quiz.questions.filter((q) => !answers[q.id])
        if (unanswered.length > 0) {
            setError('Please answer every question before submitting.')
            return
        }

        setIsSubmitting(true)
        setError('')

        const studentAnswers = quiz.questions.map((q) => ({
            questionId: q.id,
            selectedOptionIds: [answers[q.id] as string],
        }))

        try {
            const result = await gradeQuizSubmission(quiz.id, studentAnswers)
            router.push(`/student/courses/${courseId}/quizzes/${quiz.id}/results?attempt=${result.attemptId}`)
        } catch {
            setError('Could not submit the quiz. Please try again.')
            setIsSubmitting(false)
        }
    }

    return (
        <div className="max-w-2xl">
            <h1 className="text-display-xs text-ink mb-2">{quiz.title}</h1>
            {quiz.description && (
                <p className="text-body-md text-graphite mb-8">{quiz.description}</p>
            )}

            <div className="grid gap-4 mb-8">
                {quiz.questions.map((question, index) => (
                    <div key={question.id} className="bg-white rounded-hero shadow-card-lift p-6">
                        <p className="text-caption-md text-graphite mb-2">Question {index + 1}</p>
                        <p className="text-body-emphasis text-ink mb-4">{question.question_text}</p>

                        <div className="grid gap-2">
                            {question.options.map((option) => (
                                <label
                                    key={option.id}
                                    className="flex items-center gap-3 rounded-button border border-hairline px-4 py-3 cursor-pointer has-[:checked]:border-ink has-[:checked]:border-[1.5px]"
                                >
                                    <input
                                        type="radio"
                                        name={`question-${question.id}`}
                                        checked={answers[question.id] === option.id}
                                        onChange={() => selectAnswer(question.id, option.id)}
                                        className="h-4 w-4"
                                    />
                                    <span className="text-body-md text-ink">{option.option_text}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {error && (
                <p className="text-caption-md text-error mb-4" role="alert">
                    {error}
                </p>
            )}

            <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full h-11 rounded-button bg-ink text-white font-medium disabled:opacity-60"
            >
                {isSubmitting ? 'Submitting…' : 'Submit quiz'}
            </button>
        </div>
    )
}