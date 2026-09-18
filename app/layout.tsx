import type { Metadata, Viewport } from 'next'
import { Fredoka, Nunito, Roboto } from 'next/font/google'
import './globals.css'
import '@/lib/env.server'
export const dynamic = 'force-dynamic'

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
const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-roboto',
  display: 'swap',
})
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
