// Student's course-scoped Grades tab content: a flat list of graded
// assignments/quizzes and their score. No total, no average — matches
// Classroom's real "No overall grade" mode (see get-my-scores.ts's
// header comment). This is the display half G1 didn't build — that
// phase only wrote the query, not this component.

import Link from 'next/link'
import type { MyScoreRow } from '@/features/grades/queries/get-my-scores'

export function MyScoresList({ courseId, scores }: { courseId: string; scores: MyScoreRow[] }) {
    if (scores.length === 0) {
        return (
            <div className="bg-surface rounded-md border border-hairline shadow-card p-8 text-center">
                <p className="text-body-md text-text-secondary">Nothing graded yet in this course.</p>
            </div>
        )
    }

    function href(row: MyScoreRow) {
        return row.kind === 'assignment'
            ? `/student/courses/${courseId}/assignments/${row.id}`
            : `/student/courses/${courseId}/quizzes/${row.id}/results`
    }

    return (
        <div className="grid gap-2">
            {scores.map((row) => (
                <Link
                    key={`${row.kind}-${row.id}`}
                    href={href(row)}
                    className="flex items-center justify-between gap-4 rounded-md bg-surface p-4 shadow-card hover:shadow-card-hover"
                >
                    <span className="text-body-emphasis text-ink">{row.title}</span>
                    <span className="text-body-md text-text-secondary shrink-0">
                        {row.score}/{row.maxScore}
                    </span>
                </Link>
            ))}
        </div>
    )
}
