// app/admissions/page.tsx

import Link from "next/link";
import { FileText, CheckCircle2, HelpCircle } from "lucide-react";
import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";

const newStudentRequirements = [
  "PSA Birth Certificate (original & clear photocopy)",
  "Baptismal Certificate (if applicable)",
  "Two (2) recent 2x2 ID photos with white background",
  "Duly accomplished UMCLSI Enrollment Form",
];

const transfereeRequirements = [
  "Form 138 / Report Card (original with learner status)",
  "Learner Reference Number (LRN) validation",
  "Certificate of Good Moral Character from previous school",
  "PSA Birth Certificate (original & photocopy)",
  "Two (2) recent 2x2 ID photos with white background",
];

const steps = [
  {
    title: "Inquiry & Application",
    description: "Submit the initial application form online or directly at the UMCLSI campus administration office.",
  },
  {
    title: "Document Submission",
    description: "Submit required academic and civil documents tailored to your child's entry level (Pre-School or Elementary Transferee).",
  },
  {
    title: "Assessment & Interview",
    description: "Participate in a brief learner assessment and parent orientation to ensure proper grade and section placement.",
  },
  {
    title: "Assessment of Fees & Payment",
    description: "Settle matriculation, miscellaneous, and learning resource fees at the school finance desk under flexible payment plans.",
  },
  {
    title: "Official Enrollment & LMS Credentials",
    description: "Receive your child's official section assignment, class schedule, uniform vouchers, and UMCLSI LMS portal credentials.",
  },
];

export default function AdmissionsPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink antialiased">
      <SiteNav />

      {/* Hero Section */}
      <section className="px-4 py-12 sm:px-6 md:py-16">
        <div className="mx-auto max-w-[1280px]">
          <p className="text-caption font-semibold uppercase tracking-wider text-brand">
            Join UMCLSI
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Admissions and Enrollment
          </h1>
          <p className="mt-4 max-w-2xl text-body-md leading-relaxed text-ink-soft">
            Now accepting applications for Early Childhood (Nursery, Kindergarten 1 & 2) and Elementary Education (Grades 1–6). Follow our streamlined 5-step admissions process below.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center rounded-lg bg-brand px-6 py-3 text-caption font-semibold text-white transition-all hover:bg-brand-hover"
            >
              Start an Inquiry
            </Link>
          </div>

          {/* Enrollment Status Bar */}
          <div className="mt-8 grid grid-cols-2 gap-4 rounded-xl border border-border bg-surface p-6 shadow-sm md:grid-cols-4">
            <div>
              <p className="text-caption text-text-secondary">Levels Open</p>
              <p className="mt-1 text-body-md font-bold text-ink">Nursery to Grade 6</p>
            </div>
            <div>
              <p className="text-caption text-text-secondary">Governance</p>
              <p className="mt-1 text-body-md font-bold text-ink">DepEd Division Caloocan</p>
            </div>
            <div>
              <p className="text-caption text-text-secondary">Payment Options</p>
              <p className="mt-1 text-body-md font-bold text-ink">Annual / Term Schemes</p>
            </div>
            <div>
              <p className="text-caption text-text-secondary">Office Hours</p>
              <p className="mt-1 text-body-md font-bold text-ink">Mon–Fri (8:00 AM–4:00 PM)</p>
            </div>
          </div>
        </div>
      </section>

      {/* Admission Requirements */}
      <section className="px-4 py-10 sm:px-6 md:py-12">
        <div className="mx-auto max-w-[1280px]">
          <p className="text-caption font-semibold uppercase tracking-wider text-brand">
            Documentation
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">Required Documents for Admission</h2>

          <div className="mt-8 grid gap-8 md:grid-cols-2">
            {/* New Students & Kindergarten */}
            <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
              <div className="flex items-center gap-2 text-brand">
                <FileText className="h-5 w-5" />
                <span className="text-caption font-semibold uppercase tracking-wider">
                  New Students &amp; Kindergarten
                </span>
              </div>
              <ul className="mt-4 space-y-3">
                {newStudentRequirements.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-body-md text-ink-soft">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Transferees */}
            <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
              <div className="flex items-center gap-2 text-brand">
                <FileText className="h-5 w-5" />
                <span className="text-caption font-semibold uppercase tracking-wider">
                  Transferees (Grades 1–6)
                </span>
              </div>
              <ul className="mt-4 space-y-3">
                {transfereeRequirements.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-body-md text-ink-soft">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Enrollment Sequence */}
      <section className="px-4 py-10 sm:px-6 md:py-12">
        <div className="mx-auto max-w-[1280px]">
          <p className="text-caption font-semibold uppercase tracking-wider text-brand">
            Step-by-step
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">How to Complete Enrollment</h2>

          <div className="mt-8 relative border-l-2 border-border pl-6 space-y-8 md:pl-8 md:space-y-10">
            {steps.map((step, index) => (
              <div key={step.title} className="relative">
                {/* Node badge */}
                <div className="absolute -left-[31px] md:-left-[39px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-brand bg-surface" />
                
                <span className="text-caption font-semibold uppercase tracking-wider text-brand">
                  Step {index + 1}
                </span>
                <h3 className="mt-1 text-body-md font-bold text-ink">{step.title}</h3>
                <p className="mt-2 max-w-2xl text-caption leading-relaxed text-text-secondary">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tuition & Financial Support */}
      <section className="px-4 py-10 sm:px-6 md:py-12">
        <div className="mx-auto max-w-[1280px]">
          <div className="rounded-xl border border-border bg-surface p-8 shadow-sm">
            <p className="text-caption font-semibold uppercase tracking-wider text-brand">
              Financial Information
            </p>
            <h2 className="mt-2 text-2xl font-bold text-ink">Tuition, Fees & Payment Plans</h2>
            <p className="mt-4 max-w-2xl text-body-md leading-relaxed text-text-secondary">
              Tuition schedules and payment plans (annual, semestral, or quarterly) are structured to keep quality Christian basic education accessible to local Tala families. Sibling discounts and early registration incentives are available at the administration desk.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-3 text-caption font-semibold text-white transition-all hover:bg-brand-hover"
              >
                Inquire About Tuition Schedule
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}