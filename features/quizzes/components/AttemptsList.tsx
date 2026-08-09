import Link from 'next/link'

type Attempt = {
    id: string
    studentName: string
    status: string
    score: number | null
    submittedAt: string | null
    needsGrading: boolean
    attemptNumber: number
}

type StudentGroup = {
    studentName: string
    attempts: Attempt[]
}

// Groups a flat attempts list by student, ordered by attempt_number (the
// db's own unique-per-student-per-quiz counter) rather than submittedAt,
// since an in-progress attempt has no submittedAt yet but still has a
// correct, stable attempt_number.
function groupByStudent(attempts: Attempt[]): StudentGroup[] {
    const order: string[] = []
    const groups = new Map<string, Attempt[]>()

    for (const attempt of attempts) {
        if (!groups.has(attempt.studentName)) {
            groups.set(attempt.studentName, [])
            order.push(attempt.studentName)
        }
        groups.get(attempt.studentName)!.push(attempt)
    }

    return order.map((studentName) => {
        const studentAttempts = groups.get(studentName)!
        studentAttempts.sort((a, b) => a.attemptNumber - b.attemptNumber)
        return { studentName, attempts: studentAttempts }
    })
}

// Teacher-facing list of every attempt on a quiz, grouped by student so a
// student who retook the quiz shows up as one card with their score history,
// instead of scattered flat rows a teacher has to mentally reassemble.
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

    const groups = groupByStudent(attempts)

    return (
        <div className="grid gap-3">
            {groups.map((group) => {
                const latest = group.attempts[group.attempts.length - 1]!

                return (
                    <div
                        key={group.studentName}
                        className="bg-surface rounded-md border border-hairline shadow-card p-5 space-y-3"
                    >
                        <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                <p className="text-body-emphasis text-ink truncate">{group.studentName}</p>
                                <p className="text-caption text-text-secondary">
                                    {group.attempts.length === 1
                                        ? '1 attempt'
                                        : `${group.attempts.length} attempts`}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                {latest.needsGrading && (
                                    <span className="inline-flex items-center gap-1.5 rounded-pill bg-amber-soft text-amber text-caption font-semibold px-3 py-1">
                                        Needs grading
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Attempt chip sequence: each chip is its own link to that
                            attempt's detail/grading page, so nothing that worked
                            before (per-attempt navigation) is lost by grouping. */}
                        <div className="flex flex-wrap items-center gap-2">
                            {group.attempts.map((attempt, i) => (
                                <Link
                                    key={attempt.id}
                                    href={`/teacher/courses/${courseId}/quizzes/${quizId}/attempts/${attempt.id}`}
                                    className="inline-flex items-center gap-1.5 rounded-pill text-caption font-semibold px-3 py-1 border border-transparent bg-surface-sunken text-text-secondary transition-colors hover:border-hairline-strong"
                                >
                                    <span className="opacity-60">#{attempt.attemptNumber}</span>
                                    {attempt.score === null ? 'Not yet scored' : attempt.score}
                                </Link>
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
