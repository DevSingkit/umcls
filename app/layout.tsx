import type { Metadata } from 'next'
import './globals.css'
// Importing env here means the whole app fails to boot with a clear error
// if any required variable is missing — PH0-002's core acceptance
// criterion. Keep this import first, before anything else in this file
// that might otherwise fail more confusingly.
import '@/lib/env'

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

export const metadata: Metadata = {
  title: 'UMCLS',
  description: 'School Learning Management System',
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}