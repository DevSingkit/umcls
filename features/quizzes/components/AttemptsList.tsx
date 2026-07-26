import Link from 'next/link'

type Attempt = {
    id: string
    studentName: string
    status: string
    score: number | null
    isPassing: boolean | null
    submittedAt: string | null
    needsGrading: boolean
}

// Teacher-facing list of every attempt on a quiz. Each row shows a
// status badge independent of anything else on the row, so a teacher
// can scan the list without reading extra text.
export function AttemptsList({
    attempts,
    courseId,
    quizId,
}: {
    attempts: Attempt[]
    courseId: string
    quizId: string
}) {
    if (attempts.length === 0) {
        return (
            <div className="bg-surface rounded-md border border-hairline p-8 text-center space-y-2">
                <p className="text-h3 font-heading text-ink">No attempts yet</p>
                <p className="text-body-md text-text-secondary">
                    Attempts will show up here once students start taking this quiz.
                </p>
            </div>
        )
    }

    return (
        <div className="grid gap-3">
            {attempts.map((attempt) => (
                <Link
                    key={attempt.id}
                    href={`/teacher/courses/${courseId}/quizzes/${quizId}/attempts/${attempt.id}`}
                    className="bg-surface rounded-md border border-hairline shadow-card hover:shadow-card-hover hover:border-hairline-strong transition-shadow p-5 flex items-center justify-between gap-4"
                >
                    <div className="min-w-0">
                        <p className="text-body-emphasis text-ink truncate">{attempt.studentName}</p>
                        <p className="text-caption text-text-secondary">
                            {attempt.score === null ? 'Not yet scored' : `Score: ${attempt.score}`}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {attempt.needsGrading && (
                            <span className="inline-flex items-center gap-1.5 rounded-pill bg-amber-soft text-amber text-caption font-semibold px-3 py-1">
                                Needs grading
                            </span>
                        )}
                        {attempt.isPassing !== null && (
                            <span
                                className={`inline-flex items-center gap-1.5 rounded-pill text-caption font-semibold px-3 py-1 ${
                                    attempt.isPassing
                                        ? 'bg-brand-soft text-brand'
                                        : 'bg-red-soft text-red'
                                }`}
                            >
                                <span
                                    className={`w-1.5 h-1.5 rounded-pill ${
                                        attempt.isPassing ? 'bg-brand' : 'bg-red'
                                    }`}
                                />
                                {attempt.isPassing ? 'Passing' : 'Not passing'}
                            </span>
                        )}
                        {attempt.score === null && !attempt.needsGrading && (
                            <span className="inline-flex items-center gap-1.5 rounded-pill bg-surface-sunken text-text-secondary text-caption font-semibold px-3 py-1">
                                Pending
                            </span>
                        )}
                    </div>
                </Link>
            ))}
        </div>
    )
}
