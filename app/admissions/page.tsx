// app/admissions/page.tsx
//
// Admissions & Enrollment.
//
// DESIGN-LMS 2.1 content pass (2026-09-06): requirements were a single
// merged list; the brief distinguishes New Students/Kindergarten
// (PSA birth cert, baptismal cert if applicable, 2x2 photos) from
// Transferees Grades 1-6 (Form 138, Good Moral cert, PSA birth cert,
// LRN) — split into two lists. Steps reordered/renamed to match the
// brief's five-step sequence exactly: Inquiry & Application →
// Document Submission → Assessment/Interview → Assessment of Fees &
// Payment → Official Enrollment (with LMS credential issuance named
// explicitly, which the previous copy omitted).

import Link from "next/link";
import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";

const newStudentRequirements = [
  "PSA birth certificate (original & photocopy)",
  "Baptismal certificate (if applicable)",
  "Two 2x2 ID photos",
];

const transfereeRequirements = [
  "Form 138 (original report card from previous school)",
  "Certificate of Good Moral Character",
  "PSA birth certificate",
  "Learner Reference Number (LRN)",
];

const steps = [
  {
    title: "Inquiry & application",
    description: "Submit the initial application form online or on-campus.",
  },
  {
    title: "Document submission",
    description: "Submit the required academic and civil documents for your child's grade level.",
  },
  {
    title: "Assessment or interview",
    description: "A brief student evaluation and parent orientation to help place your child in the right section.",
  },
  {
    title: "Assessment of fees & payment",
    description: "Settle tuition and miscellaneous fees at the finance desk.",
  },
  {
    title: "Official enrollment",
    description: "Receive your child's class schedule and LMS portal credentials.",
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
            Open for Preschool (Nursery, Kindergarten 1 &amp; 2) and
            Elementary (Grades 1&ndash;6). Here&apos;s what you&apos;ll need,
            and what the process looks like from inquiry to your
            child&apos;s first day.
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

          <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-16">
            <div>
              <p className="text-label text-text-secondary">
                New students &amp; Kindergarten
              </p>
              <ul className="mt-4 space-y-3">
                {newStudentRequirements.map((item) => (
                  <li
                    key={item}
                    className="rounded-md bg-surface p-5 text-body-md text-ink-soft shadow-card"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-label text-text-secondary">
                Transferees (Grades 1&ndash;6)
              </p>
              <ul className="mt-4 space-y-3">
                {transfereeRequirements.map((item) => (
                  <li
                    key={item}
                    className="rounded-md bg-surface p-5 text-body-md text-ink-soft shadow-card"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
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
            Consult the administration desk for the latest tuition fee
            breakdown, available payment schemes, and discounts (such as
            early bird or sibling discounts) for your child&apos;s grade
            level.
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
