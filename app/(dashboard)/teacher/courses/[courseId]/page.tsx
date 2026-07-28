import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-user'
import { getTeacherCourseStream } from '@/features/courses/actions/get-teacher-course-stream'
import { TeacherCourseStream } from '@/features/courses/components/TeacherCourseStream'
import { CourseMenu } from '@/features/courses/components/CourseMenu'
import { MaterialList } from '@/features/materials/components/MaterialList'
import { CreateMenu } from '@/features/courses/components/CreateMenu'

export default async function TeacherCourseDetailPage({
    params,
}: {
    params: Promise<{ courseId: string }>
}) {
    const { courseId } = await params
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, title, description, is_published, show_classmates')
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
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="font-heading text-h1 text-ink">{course.title}</h1>
                    {course.description && (
                        <p className="text-body-md text-text-secondary">{course.description}</p>
                    )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                    <CreateMenu courseId={courseId} />
                    <CourseMenu courseId={course.id} isPublished={course.is_published} />
                </div>
            </div>

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
