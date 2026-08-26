// Read-only gradebook grid, Classroom-style: one column per real
// published assignment/quiz, one row per enrolled student, cell = that
// student's score (blank if ungraded). No manual columns, no DepEd
// component grouping, no weights, no computed Final Grade — all of
// that's gone along with gradebook_items/gradebook_scores.
//
// Editing a score happens through the existing per-item grading flows
// (SubmissionsGradeList.tsx, ShortAnswerGradeList.tsx,
// AttemptsList.tsx) — click a cell's linked title to go grade it there.
// This grid is a summary view, not an editor. See gradebook.ts's
// header comment for why inline editing wasn't carried over as-is.
//
// min-w-0 on the root and the pre-table wrapper: same reasoning as
// before — this table can get wide with many columns, and needs an
// ancestor that's allowed to size to content for overflow-x-auto to
// actually clip it instead of pushing the whole page wider.

import Link from 'next/link'

type GradebookColumn = {
    id: string
    kind: 'assignment' | 'quiz'
    title: string
    maxScore: number
}

type GradebookGridData = {
    students: { studentId: string; studentName: string }[]
    columns: GradebookColumn[]
    scores: { columnId: string; studentId: string; score: number | null }[]
}

export function GradebookGrid({
    courseId,
    data,
}: {
    courseId: string
    data: GradebookGridData
}) {
    const { students, columns, scores } = data

    const scoreByPair = new Map(scores.map((s) => [`${s.columnId}:${s.studentId}`, s.score]))

    function columnHref(column: GradebookColumn) {
        return column.kind === 'assignment'
            ? `/teacher/courses/${courseId}/assignments/${column.id}`
            : `/teacher/courses/${courseId}/quizzes/${column.id}/attempts`
    }

    if (columns.length === 0) {
        return (
            <div className="bg-surface rounded-md border border-hairline shadow-card p-8 text-center">
                <p className="text-body-md text-text-secondary">
                    No published assignments or quizzes yet — grades will appear here once you post some.
                </p>
            </div>
        )
    }

    return (
        <div className="min-w-0 bg-surface rounded-md border border-hairline shadow-card overflow-hidden">
            <div className="min-w-0 overflow-x-auto">
                <table className="w-full border-collapse text-body-md">
                    <thead>
                        <tr className="border-b border-hairline-strong bg-surface-sunken">
                            <th className="sticky left-0 bg-surface-sunken px-4 py-3 text-left text-caption text-text-secondary font-semibold">
                                Student
                            </th>
                            {columns.map((column) => (
                                <th key={column.id} className="px-4 py-3 text-left text-caption text-text-secondary font-semibold min-w-[140px]">
                                    <Link href={columnHref(column)} className="text-ink hover:text-brand hover:underline">
                                        {column.title}
                                    </Link>
                                    <span className="block text-text-muted font-normal">/{column.maxScore}</span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {students.length === 0 && (
                            <tr>
                                <td colSpan={1 + columns.length} className="px-4 py-6 text-center text-body-md text-text-secondary">
                                    No students enrolled yet.
                                </td>
                            </tr>
                        )}
                        {students.map((student) => (
                            <tr key={student.studentId} className="border-b border-hairline last:border-0">
                                <td className="sticky left-0 bg-surface px-4 py-3 text-body-emphasis text-ink">
                                    {student.studentName}
                                </td>
                                {columns.map((column) => {
                                    const score = scoreByPair.get(`${column.id}:${student.studentId}`)
                                    return (
                                        <td key={column.id} className="px-4 py-3 text-ink">
                                            {score === undefined || score === null ? (
                                                <span className="text-text-muted">—</span>
                                            ) : (
                                                `${score}/${column.maxScore}`
                                            )}
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
