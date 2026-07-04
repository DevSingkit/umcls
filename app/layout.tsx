import type { Metadata } from 'next'
import './globals.css'
// Importing env here means the whole app fails to boot with a clear error
// if any required variable is missing — PH0-002's core acceptance
// criterion. Keep this import first, before anything else in this file
// that might otherwise fail more confusingly.
import '@/lib/env'

export const metadata: Metadata = {
  title: 'LMS',
  description: 'School Learning Management System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
