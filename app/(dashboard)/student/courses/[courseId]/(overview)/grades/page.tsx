import { getMyScores } from '@/features/grades/queries/get-my-scores'
import { MyScoresList } from '@/features/grades/components/MyScoresList'

export default async function StudentCourseGradesPage({
    params,
}: {
    params: Promise<{ courseId: string }>
}) {
    const { courseId } = await params
    const scores = await getMyScores(courseId)

    return <MyScoresList courseId={courseId} scores={scores} />
}
