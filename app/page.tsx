// app/page.tsx
//
// Landing page — UMCLSI LMS
//
// DESIGN-LMS 2.1 fact-correction pass (2026-09-06):
// - Removed all DepEd permit numbers (K-0025, E-0024) — these were
//   unverified and the school asked for them to be dropped entirely
//   rather than guess at correct permit IDs. Recognition is now
//   stated generically ("DepEd Recognized") without inventing a
//   permit number.
// - Grade levels corrected: the school offers Nursery, Kindergarten 1,
//   Kindergarten 2, and Elementary Grades 1–6 — NOT "Kindergarten" and
//   "Elementary (Grades 4 to 6)" as the previous copy claimed.
// - Enrollment is real but not published as exact headcounts on the
//   public site per the school's instruction — reflected here only
//   as qualitative language ("growing community of learners"), never
//   as numbers.
// - Contact details corrected to verified info: phone 0994 584 9446,
//   email umcls20educ@gmail.com, address "847 Sampaguita Street, Tala,
//   Caloocan City, Metro Manila". Old placeholder phone/email/partial
//   address removed from the footer.
// - Only one verified social channel exists (Facebook) — footer link
//   text/URL left as-is, no other socials implied.

import Image from "next/image";
import Link from "next/link";

import {
  Heart,
  BookOpen,
  Users2,
  HandHeart,
  Phone,
  Mail,
  MapPin,
  ArrowUpRight,
  ArrowRight,
  Gamepad2,
  Quote,
  CalendarDays,
  CheckCircle2,
} from "lucide-react";
import { SiteNav } from "@/components/layout/SiteNav";

// ─── Data ────────────────────────────────────────────────────────────────────

const trustStats = [
  { label: "DepEd Recognized" },
  { label: "Christ-Centered & Values-Focused" },
  { label: "Cooperative Learning Approach" },
];

const programs = [
  {
    icon: Users2,
    title: "Nursery & Kindergarten",
    description:
      "Early childhood education across Nursery, Kindergarten 1, and Kindergarten 2 — play-based literacy, foundational math, and Christian character formation.",
  },
  {
    icon: BookOpen,
    title: "Elementary (Grades 1 to 6)",
    description:
      "DepEd K-12 aligned curriculum emphasizing academic excellence, cooperative learning, and moral development.",
  },
  {
    icon: Gamepad2,
    title: "Mission Engine (Gamified LMS)",
    description:
      "Interactive digital practice, quizzes, and skill challenges designed to make homework engaging and measurable.",
  },
];

const advantages = [
  {
    icon: HandHeart,
    title: "Christ-Centered Foundation",
    description: "Daily devotions and moral values integrated across all learning activities.",
  },
  {
    icon: Users2,
    title: "Classroom Without Losers",
    description: "Cooperative learning dynamics that emphasize peer support, empathy, and collective growth over rivalry.",
  },
  {
    icon: Heart,
    title: "Safe & Nurturing Environment",
    description: "Dedicated faculty providing personal attention in a modern, supportive classroom setting.",
  },
];

const corePillars = [
  {
    title: "Character & Faith First",
    quote: "We nurture young minds with sound academic fundamentals while anchoring them in Christian faith and integrity.",
  },
  {
    title: "Cooperative Growth",
    quote: "Students learn by encouraging and guiding one another, building leadership and teamwork skills early on.",
  },
  {
    title: "Interactive Mastery",
    quote: "Our gamified learning tools provide real-time feedback so every child masters key concepts at their own pace.",
  },
];

const announcements = [
  {
    date: "Enrollment",
    title: "School Year Enrollment Open",
    description: "Slots for Nursery, Kindergarten, and Grades 1–6 are now open — visit the registrar or inquire online.",
  },
  {
    date: "Academics",
    title: "Quarterly Assessment Calendar",
    description: "Review upcoming schedule and examination guidelines on the LMS portal.",
  },
  {
    date: "Ministry",
    title: "Campus Chapel & Devotionals",
    description: "Weekly student assemblies for worship, prayer, and character enrichment.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink antialiased">
      <SiteNav />

      <section className="px-4 pb-12 pt-10 sm:px-6 md:pb-24 md:pt-16">
        <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-pill bg-brand-soft px-3.5 py-1 text-caption font-semibold text-brand">
              <HandHeart className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              <span>Classroom without walls... Classroom without losers</span>
            </div>

            <h1 className="mt-4 text-h1 text-ink md:text-[3rem] md:leading-[1.1]">
              Nurturing Minds, Building Character, Growing in Faith.
            </h1>

            <p className="mt-6 max-w-xl text-body-lg text-ink-soft">
              A private Christian basic education institution serving the
              community of Tala, Caloocan City — offering Nursery,
              Kindergarten, and Elementary (Grades 1–6) education paired with
              interactive learning technology.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/admissions"
                className="inline-flex h-14 items-center gap-2 rounded-md bg-brand px-7 text-body-md font-semibold text-on-ink transition-colors hover:bg-brand-hover"
              >
                Admissions
                <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center gap-2 rounded-md border-2 border-hairline bg-surface px-7 text-body-md font-semibold text-ink transition-colors hover:bg-surface-sunken"
              >
                Log in
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-soft px-4 py-1.5 text-caption font-semibold text-brand">
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                DepEd Recognized
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-surface-sunken px-4 py-1.5 text-caption font-semibold text-ink-soft">
                <MapPin className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                847 Sampaguita Street, Tala, Caloocan City
              </span>
            </div>
          </div>

          {/* Hero visual slot */}
          <div className="aspect-[4/3] w-full overflow-hidden rounded-md bg-surface-sunken shadow-card" />
        </div>
      </section>

      {/* ── Trust & credentials bar ─────────────────────────────────────── */}
      <section className="border-y border-hairline bg-surface px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-6">
          <ul className="flex flex-wrap gap-x-8 gap-y-2">
            {trustStats.map((stat) => (
              <li key={stat.label} className="text-caption font-semibold text-text-secondary">
                {stat.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Welcome message ──────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-[900px]">
          <p className="text-label text-text-secondary">Our Educational Philosophy</p>
          <h2 className="mt-3 text-h2 text-ink">Welcome to UMCLSI</h2>
          <p className="mt-6 text-body-lg leading-relaxed text-ink-soft">
            Every child who joins our school community enters a space built on cooperative 
            learning and Christian values. We operate on the principle of a 
            <em>&ldquo;Classroom without walls... Classroom without losers&rdquo;</em> — where 
            students grow academically by encouraging one another rather than competing against each other.
          </p>
          <p className="mt-4 text-body-md text-text-secondary">
            We&apos;re a growing community of learners across Nursery,
            Kindergarten, and Elementary, and by combining caring instruction
            with interactive tools like our Mission Engine LMS, we ensure
            every learner receives focused attention, sound academic
            guidance, and a strong moral foundation.
          </p>
        </div>
      </section>

      {/* ── Curriculum & core programs ───────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-label text-text-secondary">What we offer</p>
          <h2 className="mt-3 text-h2 text-ink">Curriculum &amp; Grade Levels</h2>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {programs.map((program) => (
              <div
                key={program.title}
                className="rounded-md bg-surface p-7 shadow-card transition-shadow hover:shadow-card-hover"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-pill bg-brand-soft">
                  <program.icon className="h-6 w-6 text-brand" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-body-emphasis text-ink">{program.title}</h3>
                <p className="mt-2 text-caption text-text-secondary">{program.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The UMCLS Advantage ──────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-label text-text-secondary">Why choose us</p>
          <h2 className="mt-3 text-h2 text-ink">The UMCLS Advantage</h2>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {advantages.map((item) => (
              <div
                key={item.title}
                className="rounded-md bg-surface p-7 shadow-card transition-shadow hover:shadow-card-hover"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-pill bg-brand-soft">
                  <item.icon className="h-6 w-6 text-brand" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-body-emphasis text-ink">{item.title}</h3>
                <p className="mt-2 text-caption text-text-secondary">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Educational Commitments ──────────────────────────────────────── */}
      <section className="bg-surface px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-label text-text-secondary">What drives our mission</p>
          <h2 className="mt-3 text-h2 text-ink">Our Core Commitments</h2>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {corePillars.map((item) => (
              <div key={item.title} className="rounded-md bg-canvas p-7 border-2 border-hairline">
                <Quote className="h-5 w-5 text-brand" strokeWidth={1.5} aria-hidden="true" />
                <h3 className="mt-3 text-body-emphasis text-ink">{item.title}</h3>
                <p className="mt-2 text-body-md text-ink-soft">{item.quote}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Announcements & LMS portal notice ────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-[1200px]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-label text-text-secondary">Stay in the loop</p>
              <h2 className="mt-3 text-h2 text-ink">Latest Announcements</h2>
            </div>
            <Link
              href="/contact"
              className="inline-flex h-12 items-center gap-1 text-body-md font-semibold text-brand hover:underline"
            >
              Contact us for details
              <ArrowUpRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {announcements.map((item) => (
              <div
                key={item.title}
                className="rounded-md bg-surface p-7 shadow-card transition-shadow hover:shadow-card-hover"
              >
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-soft px-3 py-1 text-caption font-semibold text-brand">
                  <CalendarDays className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  {item.date}
                </span>
                <h3 className="mt-4 text-body-emphasis text-ink">{item.title}</h3>
                <p className="mt-2 text-caption text-text-secondary">{item.description}</p>
              </div>
            ))}
          </div>

          {/* Portal callout */}
          <div className="mt-10 flex flex-col items-start justify-between gap-6 rounded-md bg-brand-soft p-8 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-body-emphasis text-ink">
                Students and parents: access the LMS portal
              </h3>
              <p className="mt-1 text-body-md text-ink-soft">
                Check schedules, coursework, and updates any time.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex h-14 shrink-0 items-center gap-2 rounded-md bg-brand px-7 text-body-md font-semibold text-on-ink transition-colors hover:bg-brand-hover"
            >
              Go to LMS Portal
              <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-ink text-on-ink">
        <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6">
          <div className="grid gap-10 md:grid-cols-3">
            <div>
              <Image
                src="/logo.webp"
                alt="UMCLSI LMS"
                width={100}
                height={30}
                className="h-8 w-auto object-contain"
              />
              <p className="mt-3 text-caption text-on-ink/70">
                United Methodist Cooperative
                <br />
                Learning System, Inc.
              </p>
              <p className="mt-2 text-caption text-on-ink/50 italic">
                &ldquo;Classroom without walls... Classroom without losers&rdquo;
              </p>
            </div>

            <div>
              <p className="text-label text-on-ink">Contact &amp; Location</p>
              <ul className="mt-3 space-y-2.5">
                <li className="flex items-start gap-2 text-caption text-on-ink/70">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                  <span>
                    847 Sampaguita Street, Tala,
                    <br />
                    Caloocan City, Metro Manila
                  </span>
                </li>
                <li className="flex items-center gap-2 text-caption text-on-ink/70">
                  <Phone className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                  <a href="tel:+639945849446" className="hover:underline">
                    0994 584 9446
                  </a>
                </li>
                <li className="flex items-center gap-2 text-caption text-on-ink/70">
                  <Mail className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                  <a href="mailto:umcls20educ@gmail.com" className="hover:underline">
                    umcls20educ@gmail.com
                  </a>
                </li>
                <li className="flex items-center gap-2 text-caption">
                  <Link
                    href="https://facebook.com/p/United-Methodist-Cooperative-Learning-System-Inc-61576554814851"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-12 items-center gap-1 text-on-ink hover:underline"
                  >
                    Official Facebook Page
                    <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-label text-on-ink">Government Recognition</p>
              <ul className="mt-3 space-y-2 text-caption text-on-ink/70">
                <li>DepEd NCR Region</li>
                <li>Nursery through Elementary Grade 6</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-6 text-center text-caption text-on-ink/70">
            &copy;&nbsp;{new Date().getFullYear()} United Methodist Cooperative
            Learning System, Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
