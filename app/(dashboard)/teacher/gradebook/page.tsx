import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { getMyCourses } from '@/features/courses/actions/courses'
import { getGradebookForCourseGrid, getLinkableItemsForCourse } from '@/features/grades/actions/gradebook-items'
import { GradebookGrid } from '@/features/grades/components/GradebookGrid'
import { GradesVisibilityToggle } from '@/features/grades/components/GradesVisibilityToggle'
import { GradebookExportControls } from '@/features/grades/components/GradebookExportControls'

// Manual gradebook, teacher-built columns — see gradebook-items.ts and
// migration 072. Replaces the old auto-computed DepEd summary table:
// a teacher now creates each column themselves (component, label, max
// score, optional link to a real assignment/quiz for a one-time score
// pull), and types every score in directly. Every enrolled student is
// always a row, regardless of submission status.
export default async function GradebookPage({
    searchParams,
}: {
    searchParams: Promise<{ courseId?: string }>
}) {
    const { courseId } = await searchParams
    const courses = await getMyCourses()
    const gridData = courseId ? await getGradebookForCourseGrid(courseId) : null
    const linkable = courseId ? await getLinkableItemsForCourse(courseId) : null

    return (
        <div>
            <h1 className="font-heading text-h1 text-ink mb-8">Gradebook</h1>

            {courses.length === 0 ? (
                <div className="bg-surface rounded-md shadow-card p-8 text-center">
                    <p className="text-body-md text-text-secondary">You have not created a course yet.</p>
                </div>
            ) : (
                <div className="grid gap-3 mb-8">
                    {courses.map((course) => {
                        const isSelected = course.id === courseId
                        return (
                            <Link
                                key={course.id}
                                href={`/teacher/gradebook?courseId=${course.id}`}
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
                                <div>
                                    <p className="text-body-emphasis text-ink">{course.title}</p>
                                    {course.description && (
                                        <p className="text-caption text-text-secondary mt-1">{course.description}</p>
                                    )}
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
                <p className="text-body-md text-error">You do not have access to that course.</p>
            )}

            {courseId && gridData !== null && gridData.students.length === 0 && (
                <div className="bg-surface rounded-md shadow-card p-8 text-center">
                    <p className="text-body-md text-text-secondary">No students enrolled in this course yet.</p>
                </div>
            )}

            {courseId && gridData !== null && gridData.students.length > 0 && (
                <>
                    <GradesVisibilityToggle courseId={courseId} initialVisible={gridData.gradesVisible} />
                    <GradebookExportControls courseId={courseId} />
                    <GradebookGrid
                        courseId={courseId}
                        initialData={gridData}
                        canEdit
                        assignmentOptions={linkable?.assignments ?? []}
                        quizOptions={linkable?.quizzes ?? []}
                    />
                </>
            )}
        </div>
    )
}
