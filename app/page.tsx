// app/page.tsx
//
// Landing page — UMCLS LMS
// Design system: DESIGN-LMS.md v3.0.0 (Mastercard-inspired editorial redesign)
//
// What changed vs. the v2.1 build:
//   • Page shell moved off pure white → Canvas Cream #F3F0EE everywhere (§1.1 "warm canvas, never white")
//   • Header replaced with a floating white pill nav (§3.3) instead of a flat bordered top bar
//   • Primary CTA is now an Ink pill (#141413), not Electric Blue — blue is reserved for data/semantic use only (§1.2)
//   • Radii collapsed to the three-tier system: 20px buttons, 40px cards/hero, 999px pills (§1.5) — no more 4px/16px
//   • Feature + role cards use circle icon frames instead of square icon tiles, echoing the circle-portrait signature (§7.8)
//   • A ghost watermark word sits behind the feature section per §7.8, hidden on mobile
//   • Section eyebrows now carry the small orange "•" per §1.3 ("• WHAT THE SYSTEM DOES")
//   • Footer is the one dark (ink) surface on the page, per "one dark tone only" (§1.1)

import Image from "next/image";
import Link from "next/link";

import {
  BookOpen,
  ClipboardCheck,
  BarChart3,
  Shield,
  Users,
  Sparkles,
  Phone,
  MapPin,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────────────

const features = [
  {
    icon: BookOpen,
    title: "Lessons & materials",
    description:
      "Teachers create rich-text lessons with embedded videos and downloadable PDFs. Students read on any device — no horizontal scrolling, no clutter.",
  },
  {
    icon: ClipboardCheck,
    title: "Quizzes & assignments",
    description:
      "Multiple-choice and true/false quizzes with instant auto-grading. File-upload assignments with teacher feedback and a running score.",
  },
  {
    icon: Sparkles,
    title: "AI re-teach lessons",
    description:
      "When a student struggles, the system can generate a simplified explanation — reviewed and approved by the teacher before any student sees it.",
  },
  {
    icon: BarChart3,
    title: "Grades & progress",
    description:
      "Running averages per course, per-assignment scores, and teacher-visible struggle indicators to spot who needs help at a glance.",
  },
  {
    icon: Shield,
    title: "Secure & private",
    description:
      "Row-level security on every query, encrypted data at rest and in transit, and Data Privacy Act-aligned erasure. Children's data is protected by design.",
  },
  {
    icon: Users,
    title: "Three roles, one system",
    description:
      "Administrators manage users and view analytics. Teachers build content and grade. Parents guide their children through lessons at home.",
  },
];

const roles = [
  {
    label: "Administrator",
    // role-admin token #356373 — storm-teal
    badgeClass: "bg-[#356373]/10 text-[#356373]",
    borderClass: "border-[#356373]/20",
    items: [
      "Create and manage user accounts",
      "Bulk-import students via CSV",
      "View analytics and audit logs",
      "Assign teachers to courses",
    ],
  },
  {
    label: "Teacher",
    // role-teacher token — ink badge on fog surface
    badgeClass: "bg-[#E8E8E8] text-[#141413]",
    borderClass: "border-[#D1CDC7]",
    items: [
      "Build courses, lessons, and quizzes",
      "Grade submissions with written feedback",
      "Track class progress with struggle indicators",
      "Generate and publish AI re-teach lessons",
    ],
  },
  {
    label: "Student / Parent",
    // role-student token #dbeafe — accent-soft
    badgeClass: "bg-[#dbeafe] text-[#3860BE]",
    borderClass: "border-[#dbeafe]",
    items: [
      "Read lessons on phone or laptop",
      "Submit assignments and take quizzes",
      "View grades and teacher feedback",
      "Access simplified lessons when struggling",
    ],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F3F0EE] text-[#141413] antialiased">
      {/* ── Floating pill nav ────────────────────────────────────────────── */}
      <div className="sticky top-4 z-40 px-4 sm:top-6">
        <header className="mx-auto flex max-w-[1200px] items-center justify-between rounded-full bg-white px-5 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.04)] sm:px-8">
          <Link href="/" className="inline-flex min-h-[44px] items-center">
            <Image
              src="/logo.png"
              alt="UMCLS LMS"
              width={112}
              height={34}
              priority
              className="h-8 w-auto object-contain"
            />
          </Link>

          <Link
            href="/login"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#141413] px-6 text-[14px] font-medium tracking-[-0.42px] text-[#F3F0EE] transition-colors hover:bg-[#292929]"
          >
            Sign in
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </header>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="px-4 pb-16 pt-16 sm:px-6 md:pb-24 md:pt-20 lg:pt-24">
        <div className="mx-auto max-w-[1200px]">
          <p className="flex items-center gap-1.5 text-[14px] font-bold uppercase tracking-[0.56px] text-[#696969]">
            <span aria-hidden="true" className="text-[#F37338]">
              •
            </span>
            Grades 1–6 · United Methodist Cooperative
          </p>

          {/* display-xxl / -2% tracking */}
          <h1 className="mt-4 max-w-3xl text-[40px] font-medium leading-[1.0] tracking-[-0.8px] text-[#141413] sm:text-[52px] sm:tracking-[-1.04px] lg:text-[64px] lg:tracking-[-1.28px]">
            Cooperative Learning System
          </h1>

          <p className="mt-6 max-w-xl text-[18px] italic leading-[1.4] text-[#696969]">
            &ldquo;Classroom without walls&hellip; Classroom with care.&rdquo;
          </p>

          <p className="mt-4 max-w-xl text-[16px] font-normal leading-[1.4] text-[#696969]">
            A simple, secure Learning Management System built for grades
            1–6. Teachers create lessons and quizzes. Parents guide their
            children at home. No complexity, no clutter — just learning.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/login"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[20px] bg-[#141413] px-7 text-[16px] font-medium tracking-[-0.48px] text-[#F3F0EE] transition-colors hover:bg-[#292929]"
            >
              Sign in to your account
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="#features"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[20px] border-[1.5px] border-[#141413] bg-white px-7 text-[16px] font-medium tracking-[-0.48px] text-[#141413] transition-colors hover:bg-[#F3F0EE]"
            >
              See what&rsquo;s inside
            </Link>
          </div>

          {/* Recognition pills — kept out of the CTA row so the ink pill reads
              as the only "signal" element in the viewport */}
          <div className="mt-10 flex flex-wrap gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d4f5e3] px-4 py-1.5 text-[12px] font-bold uppercase tracking-[0.48px] text-[#1a7a4a]">
              <Shield className="h-3 w-3" strokeWidth={2} />
              DepEd NCR Recognized
            </span>
            <span className="inline-flex items-center rounded-full border border-[#D1CDC7] bg-white px-4 py-1.5 text-[13px] text-[#696969]">
              Kinder Permit K-0025 s.&nbsp;2023
            </span>
            <span className="inline-flex items-center rounded-full border border-[#D1CDC7] bg-white px-4 py-1.5 text-[13px] text-[#696969]">
              Elementary Permit E-0024 s.&nbsp;2023
            </span>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="relative overflow-hidden px-4 py-20 sm:px-6 md:py-24">
        {/* Ghost watermark — cream-on-cream, decorative only, hidden on mobile */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-6 right-0 hidden select-none text-[140px] font-medium leading-none tracking-[-2.8px] text-[#E8E8E8] md:block lg:text-[180px]"
        >
          LEARN
        </span>

        <div className="relative mx-auto max-w-[1200px]">
          <p className="flex items-center gap-1.5 text-[14px] font-bold uppercase tracking-[0.56px] text-[#696969]">
            <span aria-hidden="true" className="text-[#F37338]">
              •
            </span>
            What the system does
          </p>

          <h2 className="mt-3 max-w-xl text-[28px] font-medium leading-[1.2] tracking-[-0.56px] text-[#141413] md:text-[36px] md:tracking-[-0.72px]">
            Everything a school needs. Nothing it doesn&rsquo;t.
          </h2>

          <p className="mt-4 max-w-lg text-[16px] leading-[1.4] text-[#696969]">
            Built around real classroom workflows — not feature checkboxes.
            Each capability exists because a teacher or parent asked for it.
          </p>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-[40px] bg-white p-7 shadow-[0_24px_48px_rgba(0,0,0,0.08)] transition-transform hover:-translate-y-0.5"
              >
                {/* Circle icon frame — echoes the circle-portrait signature */}
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F3F0EE]">
                  <feature.icon
                    className="h-6 w-6 text-[#141413]"
                    strokeWidth={1.5}
                  />
                </div>

                <h3 className="mt-5 text-[16px] font-medium leading-[1.4] tracking-[-0.32px] text-[#141413]">
                  {feature.title}
                </h3>

                <p className="mt-2 text-[14px] leading-[1.5] text-[#696969]">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles ────────────────────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6 md:py-24">
        <div className="mx-auto max-w-[1200px]">
          <p className="flex items-center gap-1.5 text-[14px] font-bold uppercase tracking-[0.56px] text-[#696969]">
            <span aria-hidden="true" className="text-[#F37338]">
              •
            </span>
            Three roles
          </p>

          <h2 className="mt-3 max-w-xl text-[28px] font-medium leading-[1.2] tracking-[-0.56px] text-[#141413] md:text-[36px] md:tracking-[-0.72px]">
            One system for everyone in the classroom.
          </h2>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {roles.map((role) => (
              <div
                key={role.label}
                className={`rounded-[40px] border bg-white p-7 shadow-[0_24px_48px_rgba(0,0,0,0.08)] ${role.borderClass}`}
              >
                <span
                  className={`inline-flex rounded-full px-4 py-1.5 text-[12px] font-bold uppercase tracking-[0.48px] ${role.badgeClass}`}
                >
                  {role.label}
                </span>

                <ul className="mt-6 space-y-3.5">
                  {role.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-[14px] leading-[1.5] text-[#3d3d3d]"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#141413]"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA band ─────────────────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6 md:py-24">
        <div className="mx-auto max-w-[1200px]">
          <div className="relative overflow-hidden rounded-[40px] bg-[#141413] px-8 py-16 text-center md:px-16">
            <h2 className="text-[28px] font-medium leading-[1.2] tracking-[-0.56px] text-[#F3F0EE] md:text-[36px] md:tracking-[-0.72px]">
              Ready to get started?
            </h2>

            <p className="mx-auto mt-4 max-w-md text-[16px] leading-[1.4] text-[#9A9390]">
              If you&rsquo;re a teacher or parent at UMCLS, your account has
              already been created. Sign in with the credentials sent to your
              email.
            </p>

            <Link
              href="/login"
              className="mt-8 inline-flex min-h-[44px] items-center gap-2 rounded-[20px] bg-[#F3F0EE] px-7 text-[16px] font-medium tracking-[-0.48px] text-[#141413] transition-colors hover:bg-white"
            >
              Sign in
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer — the one dark (ink) surface on the page ────────────────── */}
      <footer className="bg-[#141413] text-[#F3F0EE]">
        <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6">
          <div className="grid gap-10 md:grid-cols-3">
            <div>
              <Image
                src="/logo.png"
                alt="UMCLS LMS"
                width={100}
                height={30}
                className="h-8 w-auto object-contain brightness-0 invert"
              />
              <p className="mt-3 text-[13px] leading-[1.5] text-[#9A9390]">
                United Methodist Cooperative
                <br />
                Learning System, Inc.
              </p>
            </div>

            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.48px] text-[#F3F0EE]">
                Contact
              </p>
              <ul className="mt-3 space-y-2.5">
                <li className="flex items-start gap-2 text-[13px] leading-[1.5] text-[#9A9390]">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
                  <span>
                    847 Sampaguita Street, San Jose,
                    <br />
                    Tala, Caloocan City, Metro Manila 1437
                  </span>
                </li>
                <li className="flex items-center gap-2 text-[13px] text-[#9A9390]">
                  <Phone className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  +63 975 152 1284
                </li>
                <li className="flex items-center gap-2 text-[13px]">
                  <Link
                    href="https://facebook.com/p/United-Methodist-Cooperative-Learning-System-Inc-61576554814851"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center gap-1 text-[#F3F0EE] hover:underline"
                  >
                    Facebook page
                    <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.48px] text-[#F3F0EE]">
                Government recognition
              </p>
              <ul className="mt-3 space-y-2 text-[13px] leading-[1.5] text-[#9A9390]">
                <li>Kindergarten Permit K-0025 s.&nbsp;2023</li>
                <li>Elementary Permit E-0024 s.&nbsp;2023</li>
                <li>DepEd NCR Region</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-[#3d3d3d] pt-6 text-center text-[12px] text-[#9A9390]">
            &copy;&nbsp;{new Date().getFullYear()} United Methodist Cooperative
            Learning System, Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}