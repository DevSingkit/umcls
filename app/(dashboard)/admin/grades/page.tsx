import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { getAllCoursesForAdmin } from '@/features/admin/actions/admin-grades'
import { getGradebookForCourseGrid, getLinkableItemsForCourse } from '@/features/grades/actions/gradebook-items'
import { GradebookGrid } from '@/features/grades/components/GradebookGrid'
import { GradesVisibilityToggle } from '@/features/grades/components/GradesVisibilityToggle'

// Admin gradebook — no longer read-only. Admin edits the same
// underlying gradebook_scores rows a teacher would, through the same
// GradebookGrid component and the same setGradebookScore/
// createGradebookItem/pullLinkedScores actions, which already accept
// admin (see gradebook-items.ts). One grading system, one write path,
// for both roles — not a separate admin override.
export default async function AdminGradesPage({
    searchParams,
}: {
    searchParams: Promise<{ courseId?: string }>
}) {
    const { courseId } = await searchParams
    const courses = await getAllCoursesForAdmin()
    const gridData = courseId ? await getGradebookForCourseGrid(courseId) : null
    const linkable = courseId ? await getLinkableItemsForCourse(courseId) : null
    const selectedCourse = courses.find((c) => c.id === courseId)

    return (
        <div>
            <h1 className="font-heading text-h1 text-ink mb-2">Grades</h1>
            <p className="text-body-md text-text-secondary mb-8">
                Admin can view and edit any course&apos;s gradebook, the same as its teacher.
            </p>

            {courses.length === 0 ? (
                <div className="bg-surface rounded-md shadow-card p-8 text-center">
                    <p className="text-body-md text-text-secondary">No courses have been created yet.</p>
                </div>
            ) : (
                <div className="grid gap-3 mb-8">
                    {courses.map((course) => {
                        const isSelected = course.id === courseId
                        return (
                            <Link
                                key={course.id}
                                href={`/admin/grades?courseId=${course.id}`}
                                className={`flex items-center gap-4 rounded-md p-5 shadow-card hover:shadow-card-hover ${
                                    isSelected ? 'bg-brand-soft border-[1.5px] border-brand' : 'bg-surface'
                                }`}
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
                                        {course.teacherName}
                                        {course.subject ? ` · ${course.subject}` : ''} · {course.studentCount} student
                                        {course.studentCount === 1 ? '' : 's'}
                                    </p>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            )}

            {!courseId && courses.length > 0 && (
                <p className="text-body-md text-text-secondary">Pick a course above to see its gradebook.</p>
            )}

            {courseId && gridData === null && (
                <p className="text-body-md text-error">That course could not be found.</p>
            )}

            {courseId && gridData !== null && (
                <>
                    <div className="mb-3">
                        <h2 className="font-heading text-body-emphasis text-ink">{selectedCourse?.title}</h2>
                        {selectedCourse && (
                            <p className="text-caption text-text-secondary">Taught by {selectedCourse.teacherName}</p>
                        )}
                    </div>

                    {gridData.students.length === 0 ? (
                        <div className="bg-surface rounded-md shadow-card p-8 text-center">
                            <p className="text-body-md text-text-secondary">No students enrolled in this course yet.</p>
                        </div>
                    ) : (
                        <>
                            <GradesVisibilityToggle courseId={courseId} initialVisible={gridData.gradesVisible} />
                            <GradebookGrid
                                courseId={courseId}
                                initialData={gridData}
                                canEdit
                                assignmentOptions={linkable?.assignments ?? []}
                                quizOptions={linkable?.quizzes ?? []}
                            />
                        </>
                    )}
                </>
            )}
        </div>
    )
}
