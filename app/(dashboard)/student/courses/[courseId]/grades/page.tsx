import { getMyScores } from '@/features/grades/queries/get-my-scores'
import { MyScoresList } from '@/features/grades/components/MyScoresList'

// Course-scoped Grades tab (student). Replaces the old standalone
// /student/grades page and its dead getMyFinalGrades()/
// get-my-final-grade.ts import. Uses the real, already-built display
// component for this data — MyScoresList — instead of hand-rolled
// markup; get-my-scores.ts was the query half of this feature,
// MyScoresList is the display half, both already existed and just
// needed wiring into a course-scoped route. No visibility toggle —
// migration 083 dropped courses.grades_visible_to_students along with
// the rest of the manual gradebook layer; a score is visible as soon
// as it's graded, same as real Classroom.
export default async function StudentCourseGradesPage({
    params,
}: {
    params: Promise<{ courseId: string }>
}) {
    const { courseId } = await params
    const scores = await getMyScores(courseId)

    return <MyScoresList courseId={courseId} scores={scores} />
}
