import type { Metadata, Viewport } from 'next'
import { Roboto } from 'next/font/google'
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

// Single face for both headings and body — Roboto, the same choice
// Google Classroom itself uses throughout its UI. Replaces the earlier
// Nunito (headings) + Inter (body) pairing, which read as too soft/
// rounded for this app's professional-school-tool direction. One font
// family, two weight sets, exposed as CSS variables so tailwind.config.ts's
// `font-heading` and `font-sans` can both point at the same face without
// loading it twice.
const robotoHeading = Roboto({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-roboto-heading',
  display: 'swap',
})

const robotoBody = Roboto({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-roboto-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'UMCLS',
  description: 'School Learning Management System',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${robotoHeading.variable} ${robotoBody.variable}`}>
      <body>{children}</body>
    </html>
  )
}
