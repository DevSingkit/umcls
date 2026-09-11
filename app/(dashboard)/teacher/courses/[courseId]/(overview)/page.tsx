import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-user'
import { getTeacherCourseStream } from '@/features/courses/actions/get-teacher-course-stream'
import { TeacherCourseStream } from '@/features/courses/components/TeacherCourseStream'
import { AnnouncementComposer } from '@/features/courses/components/AnnouncementComposer'
import { MaterialList } from '@/features/materials/components/MaterialList'

// Header, CourseTabs, and course-level actions (Add a student,
// +Create, ⋮ menu) now live in the shared (overview)/layout.tsx —
// this page is just the Stream content itself.
//
// PHASE 3.8 ADDITION (2026-08-28): AnnouncementComposer sits above
// TeacherCourseStream, matching Classroom's own layout (compose box
// pinned at the top of the stream, posts below it) — confirmed with
// user (inline composer, not a new page, unlike lesson/quiz/
// assignment creation).
export default async function TeacherCourseDetailPage({
    params,
}: {
    params: Promise<{ courseId: string }>
}) {
    const { courseId } = await params
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    // Confirms the course still belongs to this teacher — the layout
    // already does this same check before rendering at all, but this
    // page can still be requested directly (e.g. a stale link), so it
    // keeps its own guard rather than assuming the layout already ran.
    const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('teacher_id', user.id)
        .is('deleted_at', null)
        .single()

    if (courseError || !course) {
        notFound()
    }

    const [streamResult, materialsRes] = await Promise.all([
        getTeacherCourseStream(courseId),
        supabase
            .from('materials')
            .select('id, file_name, file_type, file_size_bytes, storage_path, external_url, created_at')
            .eq('course_id', courseId)
            .is('lesson_id', null)
            .is('assignment_id', null) // course-wide materials only — exclude both lesson- and assignment-attached ones
            .is('deleted_at', null),
    ])

    if ('error' in streamResult) {
        notFound()
    }

    const materials = materialsRes.data ?? []

    return (
        <div className="flex flex-col gap-6">
            <AnnouncementComposer courseId={courseId} />

            <TeacherCourseStream courseId={courseId} items={streamResult.items} />

            {materials.length > 0 && (
                <section>
                    <h2 className="mb-3 text-label text-text-secondary">Materials</h2>
                    <MaterialList materials={materials} canDelete />
                </section>
            )}
        </div>
    )
}
