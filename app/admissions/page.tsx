// app/admissions/page.tsx
//
// Admissions & Enrollment. The application steps are a genuine ordered
// sequence, so a numbered list is appropriate here (unlike a decorative
// 01/02/03 card grid).
//
// DESIGN-LMS 2.1 (2026-08-31): removed font-heading (Fredoka) from all
// headings on this page — global default is now Roboto (font-document)
// via globals.css's base h1-h6 rule.
//
// DESIGN-LMS 2.1 bugfix pass (2026-08-31, continued): `pb-xl`/`pt-lg`
// on the hero section weren't real Tailwind spacing keys — same dead-
// token bug as the amber/text-heading-lg finds elsewhere. Fixed to
// real values, matching the other public pages' identical hero fix.
//
// DESIGN-LMS 2.1 bugfix pass (2026-08-31, continued again): both CTAs
// on this page were missed in the first pass. "Start an inquiry" was
// h-11 (44px, below the 56px primary floor) and used an arbitrary
// hover:bg-brand/90 instead of the standard hover:bg-brand-hover token
// every other primary button uses. "Ask about fees" was h-11 (44px,
// below the 48px secondary floor). Both fixed.

import Link from "next/link";
import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";

const requirements = [
  "PSA birth certificate",
  "Report card (Form 138)",
  "Good Moral Certificate",
  "Two 2x2 ID photos",
];

const steps = [
  {
    title: "Submit an application",
    description: "Fill out the online application, or visit the registrar in person.",
  },
  {
    title: "Student assessment or interview",
    description: "A short assessment or interview to help us place your child in the right section.",
  },
  {
    title: "Submit credentials and pay enrolment fee",
    description: "Bring the required documents and settle the enrolment fee to confirm the slot.",
  },
  {
    title: "Orientation and section assignment",
    description: "Attend orientation, meet the teacher, and receive your child's section assignment.",
  },
];

export default function AdmissionsPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink antialiased">
      <SiteNav />

      {/* ── Intro ────────────────────────────────────────────────────── */}
      <section className="px-4 pb-12 pt-10 sm:px-6 md:pb-20 md:pt-16">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-label text-text-secondary">Join UMCLSI</p>
          <h1 className="mt-4 max-w-2xl text-h1 text-ink md:text-[3rem] md:leading-[1.1]">
            Admissions and enrollment
          </h1>
          <p className="mt-6 max-w-xl text-body-lg text-ink-soft">
            Here&apos;s what you&apos;ll need, and what the process looks
            like from application to your child&apos;s first day.
          </p>
          <Link
            href="/contact"
            className="mt-8 inline-flex h-14 items-center gap-2 rounded-md bg-brand px-7 text-body-md font-semibold text-on-ink transition-colors hover:bg-brand-hover"
          >
            Start an inquiry
          </Link>
        </div>
      </section>

      {/* ── Requirements ─────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="text-h2 text-ink">What to bring</h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {requirements.map((item) => (
              <li
                key={item}
                className="rounded-md bg-surface p-5 text-body-md text-ink-soft shadow-card"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Application steps ────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="text-h2 text-ink">How to apply</h2>

          <ol className="mt-10 space-y-8 border-l-2 border-hairline-strong pl-6 md:space-y-10 md:pl-8">
            {steps.map((step, index) => (
              <li key={step.title}>
                <p className="text-body-emphasis text-ink">
                  {index + 1}. {step.title}
                </p>
                <p className="mt-2 max-w-xl text-body-md text-text-secondary">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Tuition & payment ────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="text-h2 text-ink">Tuition and payment</h2>
          <p className="mt-4 max-w-xl text-body-md text-text-secondary">
            Installment plans are available, and payment can be made through
            GCash, bank transfer, or directly at the registrar. Reach out to
            the registrar for a full fee breakdown for your child&apos;s
            grade level.
          </p>
          <Link
            href="/contact"
            className="mt-6 inline-flex h-12 items-center gap-2 rounded-md border-2 border-hairline bg-surface px-7 text-body-md font-semibold text-ink transition-colors hover:bg-surface-sunken"
          >
            Ask about fees
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
