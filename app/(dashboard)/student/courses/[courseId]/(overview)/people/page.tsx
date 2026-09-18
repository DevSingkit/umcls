import { notFound } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { getCourseTeacherForStudent, getClassmates } from '@/features/courses/actions/courses'

// Course-scoped People tab (student). Replaces the old standalone
// /student/people course-selector page — this one is reached via
// CourseTabs instead, courseId comes from the route, not a
// searchParam. Two lists per §6.1d: Teacher, then Students. Classmates
// list can be legitimately empty (student not enrolled, or the
// teacher's show_classmates toggle is off) — getClassmates already
// returns [] for both cases, not an error, so there's nothing to
// distinguish here.
export default async function StudentCoursePeoplePage({
    params,
}: {
    params: Promise<{ courseId: string }>
}) {
    const { courseId } = await params

    const teacher = await getCourseTeacherForStudent(courseId)
    if (!teacher) {
        notFound()
    }

    const classmates = await getClassmates(courseId)

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
                    Classmates{classmates.length > 0 ? ` (${classmates.length})` : ''}
                </h2>
                {classmates.length === 0 ? (
                    <div className="bg-surface rounded-md shadow-card p-8 text-center">
                        <p className="text-body-md text-text-secondary">No classmates to show right now.</p>
                    </div>
                ) : (
                    <div className="bg-surface rounded-md shadow-card divide-y divide-hairline">
                        {classmates.map((classmate) => (
                            <div key={classmate.id} className="flex min-w-0 items-center gap-3 p-4">
                                <Avatar fullName={classmate.full_name} avatarUrl={classmate.avatar_url} size="sm" />
                                <p className="min-w-0 flex-1 truncate text-body-emphasis text-ink">{classmate.full_name}</p>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
