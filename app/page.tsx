// app/page.tsx
//
// Landing page — UMCLS LMS
// Design system: DESIGN-LMS.md v1.0 (UMCLS Classroom Design System)
//
// Redesigned 2026-07-16: shifted from a "product/system" pitch to a
// school-story pitch. Removed the feature grid (lessons/quizzes/AI/etc.
// as software capabilities) and the "one system, three roles" section
// entirely — those framed the page around the LMS as a product. Replaced
// with content about the school itself: who UMCLS is, how its teachers
// actually teach, and what a family can expect. Header sign-in, permit
// badges, and footer are unchanged.

import Image from "next/image";
import Link from "next/link";

import {
  Heart,
  BookOpen,
  Users2,
  HandHeart,
  Phone,
  MapPin,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────────────

const teachingApproach = [
  {
    icon: Heart,
    title: "Teachers who know your child by name",
    description:
      "Small class sizes mean a teacher isn't managing a crowd — they're teaching your child specifically, and they notice when something isn't clicking.",
  },
  {
    icon: BookOpen,
    title: "Lessons built for how kids actually learn",
    description:
      "Clear explanations, worked examples, and practice that builds up gradually — not rushed to cover a syllabus, paced to what a student in Grades 1 to 6 can actually absorb.",
  },
  {
    icon: HandHeart,
    title: "Extra support when a lesson doesn't land",
    description:
      "When a student is struggling with something, a teacher steps back in with a simpler explanation and works through it again — nobody gets left behind because a topic moved on without them.",
  },
  {
    icon: Users2,
    title: "Parents guiding learning at home",
    description:
      "Especially for our younger learners, parents are part of the classroom too — helping their child work through lessons at home, not just checking a report card later.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink antialiased">
      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-hairline bg-surface px-4 sm:px-6">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between py-3">
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
            className="inline-flex h-11 items-center gap-2 rounded-md bg-brand px-6 text-body-md font-semibold text-on-ink transition-colors hover:bg-brand-hover"
          >
            Sign in
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="px-4 pb-16 pt-12 sm:px-6 md:pb-24 md:pt-16">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-label text-text-secondary">
            Elementary · United Methodist Cooperative
          </p>

          <h1 className="mt-4 max-w-3xl font-heading text-h1 text-ink md:text-[3rem] md:leading-[1.1]">
            A school where every child is known, not just enrolled
          </h1>

          <p className="mt-6 max-w-xl text-body-lg text-ink-soft">
            &ldquo;At UMCLS, every child in elementary gets a teacher who
            knows them by name, and a lesson that meets them where they
            are.&rdquo;
          </p>

          <p className="mt-4 max-w-xl text-body-md text-text-secondary">
            We&rsquo;re a small Christian elementary school in Tala, Caloocan
            City, built around one idea: teaching should adjust to the child,
            not the other way around.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/login"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-brand px-7 text-body-md font-semibold text-on-ink transition-colors hover:bg-brand-hover"
            >
              Sign in to your account
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>

            <Link
              href="#teaching"
              className="inline-flex h-11 items-center gap-2 rounded-md border-[1.5px] border-hairline-strong bg-surface px-7 text-body-md font-semibold text-ink transition-colors hover:bg-surface-sunken"
            >
              How we teach
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-soft px-4 py-1.5 text-caption font-semibold text-brand">
              <HandHeart className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              DepEd NCR Recognized
            </span>       
          </div>
        </div>
      </section>

      {/* ── Our story ────────────────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6 md:py-24">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-label text-text-secondary">Who we are</p>

          <h2 className="mt-3 font-heading text-h2 text-ink">
            A community, not just a classroom.
          </h2>

          <p className="mt-6 text-body-lg leading-relaxed text-ink-soft">
            United Methodist Cooperative Learning System has been teaching
            children in Tala since our doors first opened, built on a simple
            belief: every child deserves a teacher who has the time to notice
            them. We&rsquo;re small on purpose. That means a student isn&rsquo;t
            one of a hundred names a teacher has to remember — they&rsquo;re
            someone the teacher already knows, term after term.
          </p>

          <p className="mt-4 text-body-md text-text-secondary">
            Kindergarten and elementary learners alike are part of our family
            here, and that&rsquo;s reflected in how classes are run: patiently,
            personally, and with faith woven into how we care for our students,
            not just what we teach them.
          </p>
        </div>
      </section>

      {/* ── How we teach ─────────────────────────────────────────────────── */}
      <section id="teaching" className="px-4 py-20 sm:px-6 md:py-24">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-label text-text-secondary">How we teach</p>

          <h2 className="mt-3 max-w-xl font-heading text-h2 text-ink">
            Teaching that adjusts to the child in front of us.
          </h2>

          <p className="mt-4 max-w-lg text-body-md text-text-secondary">
            Every teacher at UMCLS is trained to spot the moment a lesson
            isn&rsquo;t landing, and to do something about it before a
            student falls behind.
          </p>

          <div className="mt-14 grid gap-5 sm:grid-cols-2">
            {teachingApproach.map((item) => (
              <div
                key={item.title}
                className="rounded-md bg-surface p-7 shadow-card transition-shadow hover:shadow-card-hover"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-pill bg-brand-soft">
                  <item.icon className="h-6 w-6 text-brand" strokeWidth={1.5} aria-hidden="true" />
                </div>

                <h3 className="mt-5 text-body-emphasis text-ink">
                  {item.title}
                </h3>

                <p className="mt-2 text-caption text-text-secondary">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA band ─────────────────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6 md:py-24">
        <div className="mx-auto max-w-[1200px]">
          <div className="rounded-md bg-ink px-8 py-16 text-center md:px-16">
            <h2 className="font-heading text-h2 text-on-ink">
              Already a UMCLS family?
            </h2>

            <p className="mx-auto mt-4 max-w-md text-body-md text-on-ink/70">
              If you&rsquo;re a teacher or parent at UMCLS, your account has
              already been created. Sign in with the credentials sent to your
              email.
            </p>

            <Link
              href="/login"
              className="mt-8 inline-flex h-11 items-center gap-2 rounded-md bg-brand px-7 text-body-md font-semibold text-on-ink transition-colors hover:bg-brand-hover"
            >
              Sign in
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
                src="/logo.png"
                alt="UMCLS LMS"
                width={100}
                height={30}
                className="h-40 w-auto object-contain"
              />
              <p className="mt-3 text-caption text-on-ink/70">
                United Methodist Cooperative
                <br />
                Learning System, Inc.
              </p>
            </div>

            <div>
              <p className="text-label text-on-ink">Contact</p>
              <ul className="mt-3 space-y-2.5">
                <li className="flex items-start gap-2 text-caption text-on-ink/70">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                  <span>
                    847 Sampaguita Street, San Jose,
                    <br />
                    Tala, Caloocan City, Metro Manila 1437
                  </span>
                </li>
                <li className="flex items-center gap-2 text-caption text-on-ink/70">
                  <Phone className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                  +63 975 152 1284
                </li>
                <li className="flex items-center gap-2 text-caption">
                  <Link
                    href="https://facebook.com/p/United-Methodist-Cooperative-Learning-System-Inc-61576554814851"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center gap-1 text-on-ink hover:underline"
                  >
                    Facebook page
                    <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-label text-on-ink">Government recognition</p>
              <ul className="mt-3 space-y-2 text-caption text-on-ink/70">
                <li>DepEd NCR Region</li>
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