// Validates a YouTube URL and extracts its video ID. Used twice:
// once server-side when a lesson is saved (reject anything that isn't
// really a youtube.com/youtu.be URL — SECURITY.md §A03), and again at
// render time to build the iframe src from a known-safe, re-assembled
// URL rather than trusting whatever string happens to be sitting in
// lessons.youtube_url. Never interpolate the raw stored value directly
// into an iframe src.

const VIDEO_ID_PATTERN = /^[\w-]{11}$/

export function extractYoutubeVideoId(url: string): string | null {
    let parsed: URL
    try {
        parsed = new URL(url)
    } catch {
        return null
    }

    const host = parsed.hostname.replace(/^www\./, '').replace(/^m\./, '')

    if (host === 'youtu.be') {
        const id = parsed.pathname.slice(1)
        return VIDEO_ID_PATTERN.test(id) ? id : null
    }

    if (host === 'youtube.com') {
        if (parsed.pathname === '/watch') {
            const id = parsed.searchParams.get('v')
            return id && VIDEO_ID_PATTERN.test(id) ? id : null
        }
        if (parsed.pathname.startsWith('/embed/')) {
            const id = parsed.pathname.split('/')[2] ?? ''
            return VIDEO_ID_PATTERN.test(id) ? id : null
        }
    }

    return null
}

// Canonical watch URL, used when writing to the DB — normalizes
// whatever valid form the teacher pasted (youtu.be short link, embed
// link, watch link with extra query params) into one consistent shape.
export function toCanonicalYoutubeUrl(videoId: string): string {
    return `https://www.youtube.com/watch?v=${videoId}`
}

// Safe embed URL, used when rendering the iframe — built from a
// re-validated ID, never from the raw stored string directly.
export function toYoutubeEmbedUrl(videoId: string): string {
    return `https://www.youtube.com/embed/${videoId}`
}
