import Link from 'next/link'
import { Fragment } from 'react'
import { BookOpen } from 'lucide-react'
import { getMyCourses } from '@/features/courses/actions/courses'
import { getGradebookForCourseGrid, getLinkableItemsForCourse } from '@/features/grades/actions/gradebook-items'
import { GradebookGrid } from '@/features/grades/components/GradebookGrid'
import { GradesVisibilityToggle } from '@/features/grades/components/GradesVisibilityToggle'

// Manual gradebook, teacher-built columns — see gradebook-items.ts and
// migration 072. A teacher creates each column themselves (component,
// label, max score, optional link) and types every score in directly.
// The grid itself — including all three DepEd component groups — is
// always shown once a course is selected, regardless of whether it has
// enrolled students yet or gradebook columns yet, so a teacher can see
// the sheet's shape before either exists. Every enrolled student is
// always a row, regardless of submission status.
//
// min-w-0 on the wrapping containers below: without it, a flex/grid
// child's default minimum width is its content's natural width, so the
// wide gradebook table inside GradebookGrid's own overflow-x-auto was
// stretching these parent containers instead of being clipped by them —
// that stretch propagated up until the whole page scrolled horizontally
// on mobile instead of just the table. min-w-0 forces each container to
// respect its actual width so only the table itself scrolls.
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
        <div className="min-w-0">
            <h1 className="font-heading text-h1 text-ink mb-8">Gradebook</h1>

            {courses.length === 0 ? (
                <div className="bg-surface rounded-md shadow-card p-8 text-center">
                    <p className="text-body-md text-text-secondary">You have not created a course yet.</p>
                </div>
            ) : (
                <div className="grid gap-3 mb-8 min-w-0">
                    {courses.map((course) => {
                        const isSelected = course.id === courseId
                        return (
                            <Fragment key={course.id}>
                                <Link
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
                                        {(course.subject || course.description) && (
                                            <p className="text-caption text-text-secondary mt-1">
                                                {course.subject}
                                                {course.subject && course.description && (
                                                    <span className="mx-1.5 inline-block h-1 w-1 rounded-full bg-text-secondary align-middle" />
                                                )}
                                                {course.description}
                                            </p>
                                        )}
                                    </div>
                                </Link>

                                {/* Grid always renders once a course is selected and access is
                                    confirmed — with or without enrolled students, with or without
                                    columns yet. GradebookGrid itself handles both empty cases. */}
                                {isSelected && gridData !== null && (
                                    <div className="space-y-4 min-w-0">
                                        <GradesVisibilityToggle courseId={courseId!} initialVisible={gridData.gradesVisible} />
                                        <GradebookGrid
                                            courseId={courseId!}
                                            initialData={gridData}
                                            canEdit
                                            assignmentOptions={linkable?.assignments ?? []}
                                            quizOptions={linkable?.quizzes ?? []}
                                        />
                                    </div>
                                )}
                            </Fragment>
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
        </div>
    )
}