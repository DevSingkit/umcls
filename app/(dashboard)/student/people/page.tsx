import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { getMyEnrolledCourses } from '@/features/courses/actions/get-enrolled-courses'
import { getClassmates } from '@/features/courses/actions/courses'

export default async function StudentPeoplePage({
    searchParams,
}: {
    searchParams: Promise<{ courseId?: string }>
}) {
    const { courseId } = await searchParams
    const courses = await getMyEnrolledCourses()
    const classmates = courseId ? await getClassmates(courseId) : null

    return (
        <div>
            <h1 className="font-heading text-h1 text-ink mb-8">People</h1>

            {courses.length === 0 ? (
                <div className="bg-surface rounded-md shadow-card p-8 text-center">
                    <p className="text-body-md text-text-secondary">You are not enrolled in any course yet.</p>
                </div>
            ) : (
                <div className="grid gap-3 mb-8">
                    {courses.map((course: any) => {
                        const isSelected = course.id === courseId
                        return (
                            <Link
                                key={course.id}
                                href={`/student/people?courseId=${course.id}`}
                                className={`flex items-center gap-4 rounded-md p-5 shadow-card hover:shadow-card-hover ${
                                    isSelected
                                        ? 'bg-brand-soft border-[1.5px] border-brand'
                                        : 'bg-surface'
                                }`}
                            >
                                <span
                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${
                                        isSelected ? 'bg-brand text-on-ink' : 'bg-brand-soft text-brand'
                                    }`}
                                >
                                    <BookOpen size={20} aria-hidden="true" />
                                </span>
                                <div>
                                    <p className="text-body-emphasis text-ink">{course.title}</p>
                                    {course.subject && (
                                        <p className="text-caption text-text-secondary mt-1">{course.subject}</p>
                                    )}
                                </div>
                            </Link>
                        )
                    })}
                </div>
            )}

            {!courseId && courses.length > 0 && (
                <p className="text-body-md text-text-secondary">Pick a course above to see your classmates.</p>
            )}

            {courseId && classmates !== null && classmates.length === 0 && (
                <div className="bg-surface rounded-md shadow-card p-8 text-center">
                    <p className="text-body-md text-text-secondary">No classmates to show right now.</p>
                </div>
            )}

            {courseId && classmates !== null && classmates.length > 0 && (
                <div className="grid gap-3">
                    {classmates.map((classmate) => (
                        <div key={classmate.id} className="bg-surface rounded-md shadow-card p-4">
                            <p className="text-body-emphasis text-ink">{classmate.full_name}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}