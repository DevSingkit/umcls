import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-user'
import { CourseStreamHeader } from '@/components/layout/CourseStreamHeader'

// Shared chrome for the three "browsing" course tabs (student) — Stream,
// People, Scores. This is a Next.js route group layout (the `(overview)`
// folder it lives in doesn't appear in the URL), matching teacher's
// layout structure. Deliberately does NOT wrap lesson/quiz/assignment
// detail screens — those stay outside this group and get their own
// dedicated full screen without the browsing tab row.
export default async function StudentCourseOverviewLayout({
    children,
    params,
}: {
    children: ReactNode
    params: Promise<{ courseId: string }>
}) {
    const { courseId } = await params
    const user = await requireRole(['student'])
    const supabase = await createClient()

    const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', courseId)
        .eq('student_id', user.id)
        .eq('status', 'active')
        .single()

    if (!enrollment) {
        notFound()
    }

    const { data: course } = await supabase
        .from('courses')
        .select('id, title, description, subject')
        .eq('id', courseId)
        .single()

    if (!course) {
        notFound()
    }

    return (
        <div className="flex flex-col gap-6">
            <CourseStreamHeader
                courseId={courseId}
                role="student"
                title={course.title}
                subtitle={course.description || undefined}
            />

            {children}
        </div>
    )
}
