// lib/ml/mastery-shakiness.ts
//
// Thesis ML component (see migration 20260906000002_102's header for
// the full design rationale). This file is deliberately isolated from
// any database or Next.js concerns — pure math only — so it reads
// cleanly on its own (useful for a thesis appendix / defense) and can
// be unit-tested in isolation from submit-question-attempt.ts's
// Supabase wiring.
//
// This IS logistic regression, trained via stochastic gradient
// descent (SGD), exactly as the thesis paper states. Nothing here is
// a hand-picked threshold rule — every number that decides "is this
// shaky" is a weight that started at 0 and only moved because real
// outcomes nudged it. See predictShakiness/updateWeights below for
// where that nudging actually happens.

export type ShakinessFeatures = {
    // Raw count of times the student revealed the hint while working
    // toward mastery on this question — NOT a normalized rate.
    hintUses: number
    // Raw count of wrong attempts before reaching mastery.
    wrongCount: number
    // Days between the student's previous attempt on this question and
    // the attempt that achieved mastery. 0 if there was no prior
    // attempt to measure from.
    daysSincePractice: number
}

export type ShakinessWeights = {
    weightHintUses: number
    weightDaysSincePractice: number
    weightWrongCount: number
    intercept: number
}

// Untrained starting point — every weight at 0. With all weights at 0,
// predictShakiness always returns exactly 0.5 (a coin flip) regardless
// of the input features, which is the correct, expected behavior for
// a model that hasn't seen any real outcomes yet.
export const INITIAL_SHAKINESS_WEIGHTS: ShakinessWeights = {
    weightHintUses: 0,
    weightDaysSincePractice: 0,
    weightWrongCount: 0,
    intercept: 0,
}

function sigmoid(z: number): number {
    return 1 / (1 + Math.exp(-z))
}

/**
 * Logistic regression prediction: combines the three features with
 * their current learned weights into a single probability (0 to 1)
 * that this mastery is "shaky" — i.e. likely to not hold up if the
 * student is asked this question again later.
 */
export function predictShakiness(features: ShakinessFeatures, weights: ShakinessWeights): number {
    const z =
        weights.weightHintUses * features.hintUses +
        weights.weightDaysSincePractice * features.daysSincePractice +
        weights.weightWrongCount * features.wrongCount +
        weights.intercept
    return sigmoid(z)
}

// Standard SGD step size. Not tuned against real data yet — there is
// none — a reasonable, commonly-used default. Revisit once real
// outcomes accumulate and there's something to actually tune against.
const LEARNING_RATE = 0.05

/**
 * The actual "learning" step. Given what the model predicted, what
 * really happened (1 = confirmed shaky, since v1 only trains on that
 * outcome — see migration header), and the features that led to that
 * prediction, nudges each weight in the direction that would have made
 * the prediction closer to correct. This is the only place any weight
 * value ever changes — nothing here is set by hand.
 */
export function updateWeights(
    features: ShakinessFeatures,
    weights: ShakinessWeights,
    actualOutcome: 0 | 1
): ShakinessWeights {
    const predicted = predictShakiness(features, weights)
    const error = actualOutcome - predicted

    return {
        weightHintUses: weights.weightHintUses + LEARNING_RATE * error * features.hintUses,
        weightDaysSincePractice:
            weights.weightDaysSincePractice + LEARNING_RATE * error * features.daysSincePractice,
        weightWrongCount: weights.weightWrongCount + LEARNING_RATE * error * features.wrongCount,
        intercept: weights.intercept + LEARNING_RATE * error,
    }
}
