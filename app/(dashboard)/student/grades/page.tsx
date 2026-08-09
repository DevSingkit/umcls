import { GraduationCap } from 'lucide-react'
import { getMyFinalGrades } from '@/features/grades/queries/get-my-final-grade'

// Student's own grades, one row per enrolled course. Shows only the
// Final Grade, computed from the real gradebook (gradebook_items/
// gradebook_scores) — no component breakdown, no individual item
// scores, per product decision. A course with grades_visible_to_students
// off still shows here, just with an empty cell instead of a number.
export default async function StudentGradesPage() {
    const grades = await getMyFinalGrades()

    return (
        <div>
            <h1 className="font-heading text-h1 text-ink mb-8">Grades</h1>

            {grades.length === 0 ? (
                <div className="bg-surface rounded-md shadow-card p-8 text-center">
                    <p className="text-body-md text-text-secondary">You are not enrolled in any courses yet.</p>
                </div>
            ) : (
                <div className="bg-surface rounded-md shadow-card overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-hairline">
                                <th className="px-6 py-4 text-label text-text-secondary">Subject</th>
                                <th className="px-6 py-4 text-label text-text-secondary">Final grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            {grades.map((g) => (
                                <tr key={g.courseId} className="border-b border-hairline last:border-0">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
                                                <GraduationCap size={18} aria-hidden="true" />
                                            </span>
                                            <div>
                                                <p className="text-body-emphasis text-ink">{g.courseTitle}</p>
                                                {g.subject && (
                                                    <p className="text-caption text-text-secondary">{g.subject}</p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {!g.visible ? (
                                            <span className="text-caption text-text-muted">Not yet released</span>
                                        ) : g.finalGrade !== null ? (
                                            <span className="inline-flex items-center rounded-pill bg-brand-soft text-brand text-caption font-semibold px-3 py-1">
                                                {g.finalGrade}%
                                            </span>
                                        ) : (
                                            <span className="text-caption text-text-muted">No grades yet</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
