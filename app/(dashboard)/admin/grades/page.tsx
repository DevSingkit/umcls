import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { getAllCoursesForAdmin } from '@/features/admin/actions/admin-grades'
import { getGradebookForCourseGrid } from '@/features/grades/queries/gradebook'
import { GradebookGrid } from '@/features/grades/components/GradebookGrid'

// Admin gradebook, read-only — same Classroom-style grid a teacher
// sees on their own course's Grades tab, just with a course picker
// across every course in the school. Reuses getGradebookForCourseGrid
// as-is (already accepts 'admin' with full cross-course access) — no
// new query needed. Deliberately NOT an edit surface — see the
// original header comment on this file for the full reasoning; that
// logic is untouched.
//
// Design pass: course picker rows now use the §7.5a "one outer card,
// nested rows with hairline dividers" pattern instead of each course
// being its own separately shadowed card. This is the same fix as
// AdminCourseList — a list of many small items shouldn't each carry
// their own shadow when they live inside one section.
export default async function AdminGradesPage({
    searchParams,
}: {
    searchParams: Promise<{ courseId?: string }>
}) {
    const { courseId } = await searchParams
    const courses = await getAllCoursesForAdmin()
    const gridData = courseId ? await getGradebookForCourseGrid(courseId) : null
    const selectedCourse = courses.find((c) => c.id === courseId)

    return (
        <div className="min-w-0">
            <h1 className="font-heading text-h1 text-ink mb-2">Grades</h1>
            <p className="text-body-md text-text-secondary mb-8">
                View any class&apos;s gradebook — activities and student scores.
            </p>

            {courses.length === 0 ? (
                <div className="bg-surface rounded-md shadow-card p-8 text-center">
                    <p className="text-body-md text-text-secondary">No classes have been created yet.</p>
                </div>
            ) : (
                <div className="bg-surface rounded-md shadow-card mb-8 min-w-0 overflow-hidden">
                    {courses.map((course, index) => {
                        const isSelected = course.id === courseId
                        return (
                            <Link
                                key={course.id}
                                href={`/admin/grades?courseId=${course.id}`}
                                className={`flex items-center gap-4 p-4 sm:p-5 ${
                                    index > 0 ? 'border-t border-hairline' : ''
                                } ${isSelected ? 'bg-brand-soft' : 'hover:bg-surface-sunken'}`}
                            >
                                <span
                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${
                                        isSelected ? 'bg-brand text-on-ink' : 'bg-brand-soft text-brand'
                                    }`}
                                >
                                    <BookOpen size={20} aria-hidden="true" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-body-emphasis text-ink truncate">{course.title}</p>
                                    <p className="text-caption text-text-secondary mt-1">
                                        {course.subject ? `${course.subject} · ` : ''}
                                        {course.teacherName} · {course.studentCount} student
                                        {course.studentCount === 1 ? '' : 's'}
                                    </p>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            )}

            {!courseId && courses.length > 0 && (
                <div className="bg-surface rounded-md shadow-card p-8 text-center">
                    <p className="text-body-md text-text-secondary">Pick a class above to see its gradebook.</p>
                </div>
            )}

            {courseId && gridData === null && (
                <div className="bg-surface rounded-md shadow-card p-8 text-center">
                    <p className="text-body-md text-error">That class could not be found.</p>
                </div>
            )}

            {courseId && gridData !== null && (
                <>
                    <h2 className="mb-3 font-heading text-h3 text-ink">{selectedCourse?.title}</h2>
                    {selectedCourse && (
                        <p className="text-caption text-text-secondary mb-3">
                            {selectedCourse.subject ? `${selectedCourse.subject} · ` : ''}
                            Taught by {selectedCourse.teacherName}
                        </p>
                    )}

                    <GradebookGrid courseId={courseId} data={gridData} />
                </>
            )}
        </div>
    )
}