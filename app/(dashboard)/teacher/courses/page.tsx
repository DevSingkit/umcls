import Link from 'next/link'
import { BookOpen, Plus } from 'lucide-react'
import { getMyCourses } from '@/features/courses/actions/courses'

// Shows every course the logged in teacher owns. If they have none yet,
// shows a simple message and a button to create the first one.
export default async function TeacherCoursesPage() {
    const courses = await getMyCourses()

    return (
        <div>
            <div className="mb-8 flex items-center justify-between">
                <h1 className="font-heading text-h1 text-ink">My courses</h1>
                <Link
                    href="/teacher/courses/new"
                    className="flex h-11 items-center rounded-md bg-brand px-6 text-body-md font-semibold text-on-ink hover:bg-brand-hover"
                >
                    + New course
                </Link>
            </div>

            {courses.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-md bg-surface p-10 text-center shadow-card">
                    <div className="flex h-14 w-14 items-center justify-center rounded-pill bg-brand-soft">
                        <Plus size={28} className="text-brand" aria-hidden="true" />
                    </div>
                    <p className="text-body-md text-ink-soft">
                        You haven&apos;t created a course yet.
                    </p>
                    <Link
                        href="/teacher/courses/new"
                        className="flex h-11 items-center rounded-md bg-brand px-6 text-body-md font-semibold text-on-ink hover:bg-brand-hover"
                    >
                        + Create your first course
                    </Link>
                </div>
            ) : (
                <div className="grid gap-3">
                    {courses.map((course) => (
                        <Link
                            key={course.id}
                            href={`/teacher/courses/${course.id}`}
                            className="flex items-start gap-4 rounded-md bg-surface p-5 shadow-card hover:shadow-card-hover"
                        >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
                                <BookOpen size={20} aria-hidden="true" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-body-emphasis text-ink">{course.title}</h2>
                                    {course.is_published ? (
                                        <span className="flex items-center gap-1 rounded-pill bg-brand-soft px-2 py-0.5 text-caption font-semibold text-brand">
                                            <span className="h-1.5 w-1.5 rounded-pill bg-brand" aria-hidden="true" />
                                            Published
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 rounded-pill bg-hairline px-2 py-0.5 text-caption font-semibold text-text-secondary">
                                            <span className="h-1.5 w-1.5 rounded-pill bg-text-secondary" aria-hidden="true" />
                                            Draft
                                        </span>
                                    )}
                                </div>
                                {course.description && (
                                    <p className="mt-1 text-caption text-text-secondary">
                                        {course.description}
                                    </p>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
