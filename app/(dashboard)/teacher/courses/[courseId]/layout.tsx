import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-user'
import { getEnrollableStudents } from '@/features/courses/actions/enroll-student'
import { CourseMenu } from '@/features/courses/components/CourseMenu'
import { CreateMenu } from '@/features/courses/components/CreateMenu'
import { EnrollStudentForm } from '@/features/courses/components/EnrollStudentForm'
import { CourseTabs } from '@/components/layout/CourseTabs'

// Shared chrome for the three "browsing" course tabs — Stream, People,
// Grades. This is a Next.js route group layout (the `(overview)`
// folder it lives in doesn't appear in the URL), so it deliberately
// does NOT wrap lesson/quiz/assignment create-or-edit routes — those
// stay outside this group and get their own dedicated screen, no
// header/tabs, matching real Google Classroom: the class name stays
// visible almost everywhere, but the Stream/Classwork/People/Grades
// tab row only shows on the actual browsing pages, never on a create
// or edit screen.
//
// Previously this header+tabs markup only existed inside the Stream
// page.tsx — People and Grades had no header/tabs at all (just a bare
// Back button), which is the bug this layout fixes.
export default async function TeacherCourseOverviewLayout({
    children,
    params,
}: {
    children: ReactNode
    params: Promise<{ courseId: string }>
}) {
    const { courseId } = await params
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const [{ data: course, error: courseError }, enrollableStudents] = await Promise.all([
        supabase
            .from('courses')
            .select('id, title, subject, description, is_published, show_classmates')
            .eq('id', courseId)
            .eq('teacher_id', user.id)
            .is('deleted_at', null)
            .single(),
        getEnrollableStudents(courseId),
    ])

    if (courseError || !course) {
        notFound()
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="font-heading text-h1 text-ink">{course.subject || course.title}</h1>
                        {!course.is_published && (
                            <span className="inline-flex items-center rounded-full bg-warning-soft px-2.5 py-1 text-caption font-semibold text-warning">
                                Unpublished
                            </span>
                        )}
                    </div>
                    {course.subject && (
                        <p className="text-body-md text-text-secondary">{course.title}</p>
                    )}
                    {course.description && (
                        <p className="text-caption text-text-secondary mt-1">{course.description}</p>
                    )}
                    {!course.is_published && (
                        <p className="mt-1 text-caption text-text-secondary">
                            Students can&apos;t see this class yet. Use the menu to publish it.
                        </p>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
                    <EnrollStudentForm courseId={courseId} students={enrollableStudents} />
                    <CreateMenu courseId={courseId} />
                    <CourseMenu courseId={course.id} isPublished={course.is_published} />
                </div>
            </div>

            <CourseTabs courseId={courseId} role="teacher" />

            {children}
        </div>
    )
}
