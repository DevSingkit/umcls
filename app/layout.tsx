import type { Metadata, Viewport } from 'next'
import { Fredoka, Nunito, Roboto } from 'next/font/google'
import './globals.css'

// Importing env here means the whole app fails to boot with a clear error
// if any required variable is missing — PH0-002's core acceptance
// criterion. Keep this import first, before anything else in this file
// that might otherwise fail more confusingly.
//
// env.server.ts spreads clientEnv into serverEnv (see lib/env.server.ts),
// so importing it alone validates both schemas — no need to also import
// env.client.ts separately here. Safe in this file specifically because
// RootLayout is a Server Component; env.server.ts's 'server-only' guard
// would throw if this import ever leaked into client code.
import '@/lib/env.server'

// PRODUCTION BUG FOUND during PH8-002 live verification: without this,
// Next.js statically pre-renders pages like /login at BUILD time and
// Vercel's CDN serves that same cached HTML to every visitor. The CSP
// nonce is generated fresh PER REQUEST in middleware.ts, so a
// build-time-baked page can never contain a matching nonce — its
// <script> tags either have none or a stale one. With 'strict-dynamic'
// in the CSP (which makes browsers trust ONLY nonce/hash-matched
// scripts), every script on the page gets silently blocked: no click
// handlers, no password toggle, nothing. This didn't show up on
// localhost because `next dev` always renders fresh per request and
// never serves a statically cached build. Forcing dynamic rendering
// here means every request actually re-runs the render, so the nonce
// middleware generates each time can actually reach the HTML it's
// supposed to match.
export const dynamic = 'force-dynamic'

// DESIGN-LMS 2.1 REDESIGN (2026-08-31): reverses the earlier single-
// Roboto decision (see git history / ADAPTIVE-ENGINE-LOG.md — that
// choice was made explicitly and for a real reason at the time: Nunito
// read "too soft/rounded" for what was then a plain document-style
// tool). The redesign's two-mode system needs a real distinction
// between the two modes at the font level, not just color, so three
// families are loaded:
//
// - Fredoka  → Mission Mode headings, scores, 3D button text (the
//              gamified/kid-facing surface: lesson reading, missions,
//              mission results only — NOT quizzes, which stay
//              Classroom Mode per this pass's explicit scoping).
// - Nunito   → Classroom Mode's default body font app-wide (dashboards,
//              coursework, grades, admin, assignments, quizzes incl.
//              quiz results). Also now the default for h1-h6 — see
//              globals.css's changelog note.
// - Roboto   → reserved specifically for dense structured document
//              bodies (lesson-authoring rich text, printable content)
//              per DESIGN-LMS 2.1 §3 and globals.css's `.font-document`
//              utility, applied explicitly per-component, never as a
//              default anymore.
//
// Variable names match exactly what tailwind.config.ts's fontFamily
// map and globals.css already expect (--font-fredoka, --font-nunito,
// --font-roboto).
//
// BUGFIX (2026-08-31, continued): this file was loading two extra
// Roboto variables — --font-roboto-heading and --font-roboto-body —
// that tailwind.config.ts never mapped to anything and no component
// ever referenced. Dead weight: two unnecessary font downloads on
// every page load for zero visual effect. Removed; only the three
// variables the app actually uses (fredoka/nunito/roboto) remain.
const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-fredoka',
  display: 'swap',
})

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-nunito',
  display: 'swap',
})

// Roboto: reserved for dense structured document bodies via the
// explicit `.font-document` utility only (§3) — not a default anymore.
const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-roboto',
  display: 'swap',
})

// Metadata/viewport per DESIGN-LMS 2.1 §6.5 — title template so child
// pages can set a short title (e.g. "Dashboard") and get
// "Dashboard | UMCLS Classroom" automatically; maximumScale/
// userScalable: false prevents iOS's pinch-zoom-on-input-focus
// annoyance on the many mobile forms across this app; themeColor
// matches the sidebar/header raspberry-pink so the mobile browser
// chrome (status bar area) reads as part of the app, not blank white.
export const metadata: Metadata = {
  title: {
    default: 'UMCLS Classroom | Elementary Learning Platform',
    template: '%s | UMCLS Classroom',
  },
  description:
    'Official learning portal and gamified mission engine for UMCLS elementary students, parents, and teachers.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#8F1349',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fredoka.variable} ${nunito.variable} ${roboto.variable}`}
    >
      <body className="bg-canvas text-ink font-sans antialiased selection:bg-brand-soft selection:text-brand">
        {children}
      </body>
    </html>
  )
}
