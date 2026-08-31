import { notFound } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { getCourseTeacherForTeacher, getCourseRoster } from '@/features/courses/actions/courses'

// Course-scoped People tab (teacher). Replaces the old standalone
// /teacher/people course-selector page — courseId now comes from the
// route via CourseTabs, not a searchParam. Two lists per §6.1d:
// Teacher (themself), then Students (full roster, always shown —
// unlike the student side, a teacher's own roster isn't gated by any
// visibility toggle).
export default async function TeacherCoursePeoplePage({
    params,
}: {
    params: Promise<{ courseId: string }>
}) {
    const { courseId } = await params

    const teacher = await getCourseTeacherForTeacher(courseId)
    if (!teacher) {
        notFound()
    }

    const roster = await getCourseRoster(courseId)
    if (roster === null) {
        notFound()
    }

    return (
        <div>
            <section className="mb-8">
                <h2 className="text-label text-text-secondary mb-3">Teacher</h2>
                <div className="bg-surface rounded-md shadow-card divide-y divide-hairline">
                    <div className="flex min-w-0 items-center gap-3 p-4">
                        <Avatar fullName={teacher.fullName} avatarUrl={teacher.avatarUrl} size="sm" />
                        <p className="min-w-0 flex-1 truncate text-body-emphasis text-ink">{teacher.fullName}</p>
                    </div>
                </div>
            </section>

            <section>
                <h2 className="text-label text-text-secondary mb-3">
                    Students{roster.length > 0 ? ` (${roster.length})` : ''}
                </h2>
                {roster.length === 0 ? (
                    <div className="bg-surface rounded-md shadow-card p-8 text-center">
                        <p className="text-body-md text-text-secondary">No students enrolled in this course yet.</p>
                    </div>
                ) : (
                    <div className="bg-surface rounded-md shadow-card divide-y divide-hairline">
                        {roster.map((student) => (
                            <div key={student.studentId} className="flex min-w-0 items-center gap-3 p-4">
                                <Avatar fullName={student.studentName} avatarUrl={student.avatarUrl} size="sm" />
                                <p className="min-w-0 flex-1 truncate text-body-emphasis text-ink">{student.studentName}</p>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
