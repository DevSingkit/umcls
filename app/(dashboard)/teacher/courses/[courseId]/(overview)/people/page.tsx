import { notFound } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { getCourseTeacherForTeacher, getCourseRoster } from '@/features/courses/actions/courses'

// Course-scoped People tab (teacher). Replaces the old standalone
// /teacher/people course-selector page — courseId now comes from the
// route via CourseTabs, not a searchParam. Two lists per §6.1d:
// Teacher (themself), then Students (full roster, always shown —
// unlike the student side, a teacher's own roster isn't gated by any
// visibility toggle).
//
// DESIGN-LMS 2.1 REDESIGN (2026-09-06): students moved from a flat
// divide-y list (name-only, avatar small and left-aligned like a
// settings row) to a photo-forward card grid — per request, the
// roster should read as a class photo/seating chart, not an account
// list. Each student card centers a `lg` (64px) avatar above the
// name — confirmed against Avatar.tsx before using it, rather than
// guessing at a size. Teacher keeps the single spotlighted card
// treatment (still the right pattern for a one-person "section"),
// also bumped to `lg` so the sizing is consistent between sections.
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
            <section className="mb-10">
                <h2 className="mb-3 text-label text-text-secondary">Teacher</h2>
                <div className="flex items-center gap-4 rounded-md bg-surface p-5 shadow-card">
                    <Avatar fullName={teacher.fullName} avatarUrl={teacher.avatarUrl} size="lg" />
                    <p className="min-w-0 flex-1 truncate text-body-emphasis text-ink">{teacher.fullName}</p>
                </div>
            </section>

            <section>
                <h2 className="mb-3 text-label text-text-secondary">
                    Students{roster.length > 0 ? ` (${roster.length})` : ''}
                </h2>
                {roster.length === 0 ? (
                    <div className="rounded-md bg-surface p-8 text-center shadow-card">
                        <p className="text-body-md text-text-secondary">No students enrolled in this course yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                        {roster.map((student) => (
                            <div
                                key={student.studentId}
                                className="flex flex-col items-center gap-3 rounded-md bg-surface p-5 text-center shadow-card transition-shadow hover:shadow-card-hover"
                            >
                                <Avatar fullName={student.studentName} avatarUrl={student.avatarUrl} size="lg" />
                                <p className="w-full truncate text-body-emphasis text-ink">{student.studentName}</p>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
