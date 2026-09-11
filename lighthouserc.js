/**
 * PH0-008 — Lighthouse CI config.
 *
 * Per VERSION_ROADMAP.md: the performance gate may be relaxed for V1
 * (real content/images/quiz interactivity aren't fully built yet, so
 * failing merges on perf right now would just be noise). The
 * accessibility gate must NOT be relaxed at any version — this is a
 * school app used by children; that gate stays at `error`.
 *
 * When V1 is done and you're ready to enforce performance too, change
 * `performance` below from `warn` to `error`. Search this file for
 * "V1 RELAXED" when that day comes.
 */
module.exports = {
    ci: {
        collect: {
            numberOfRuns: 3,
            settings: {
                preset: 'desktop',
                extraHeaders: JSON.stringify({
                    'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '',
                }),
            },
        },
        assert: {
            assertions: {
                'categories:performance': ['warn', { minScore: 0.85 }], // V1 RELAXED
                'categories:accessibility': ['error', { minScore: 0.95 }],
                'categories:best-practices': ['warn', { minScore: 0.9 }],
                'categories:seo': ['warn', { minScore: 0.9 }],
            },
        },
        upload: {
            target: 'temporary-public-storage',
        },
    },
};