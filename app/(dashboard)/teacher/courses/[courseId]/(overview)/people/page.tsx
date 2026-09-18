import { notFound } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { getCourseTeacherForTeacher, getCourseRoster } from '@/features/courses/actions/courses'

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
