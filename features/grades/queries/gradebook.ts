// This file used to hold the auto-computed DepEd summary queries
// (getDepEdGradesForCourse, computeDepEdGradesForCourse) and the older
// assignment/quiz average queries (getGradebookForCourse,
// getGradebookForCourseInRange, getAssignmentHeatmapForCourse). All of
// that was replaced by the manual, teacher-built gradebook — see
// features/grades/actions/gradebook-items.ts and migration 072 for the
// current system. Only resolveWeightProfileKey survives here, since
// gradebook-items.ts imports it directly rather than duplicating the
// subject -> weight-profile matching logic.

export function resolveWeightProfileKey(subject: string | null): 'default' | 'mapeh' {
    return subject?.trim().toLowerCase() === 'mapeh' ? 'mapeh' : 'default'
}
