// app/page.tsx

import Image from "next/image";
import Link from "next/link";

import {
  Heart,
  BookOpen,
  Users2,
  HandHeart,
  ArrowUpRight,
  ArrowRight,
  Quote,
  CalendarDays,
  MapPin,
} from "lucide-react";
import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";

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
      "Early childhood education across Nursery, Kindergarten 1, and Kindergarten 2 with play-based literacy, foundational math, and Christian character formation.",
  },
  {
    icon: BookOpen,
    title: "Elementary (Grades 1 to 6)",
    description:
      "DepEd K-12 aligned curriculum emphasizing academic excellence, cooperative learning, and moral development.",
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
  }
];

const announcements = [
  {
    date: "Enrollment",
    title: "School Year Enrollment Open",
    description: "Slots for Nursery, Kindergarten, and Grades 1 through 6 are now open, so visit the registrar or inquire online.",
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
    <div className="min-h-screen bg-canvas text-ink antialiased flex flex-col font-sans">
      <SiteNav />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="px-6 pb-16 pt-12 md:pb-24 md:pt-20">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>

              <h1 className="mt-6 text-3xl font-extrabold text-ink sm:text-4xl md:text-5xl md:leading-[1.15]">
                Nurturing Minds, Building Character, Growing in Faith.
              </h1>

              <p className="mt-6 max-w-2xl text-lg text-ink-soft leading-relaxed">
                A private Christian basic education institution serving the
                community of Tala, Caloocan City, offering Nursery,
                Kindergarten, and Elementary education.
              </p>

              {/* 56px Primary Touch Targets */}
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link
                  href="/login"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-surface px-8 text-xl font-bold text-ink border border-hairline shadow-card hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 transition-all"
                >
                  Log in
                </Link>
                <Link
                  href="/admissions"
                  className="inline-flex h-14 items-center justify-center gap-3 rounded-xl bg-brand px-8 text-xl font-bold text-white shadow-clay-sm active:shadow-clay-inset hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 transition-all"
                >
                  Admissions
                  <ArrowRight className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />
                </Link>
                
              </div>

              {/* High-Visibility Badges */}
              <div className="mt-8 flex flex-wrap gap-3">
                
                <span className="inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-base font-bold text-ink-soft border border-hairline shadow-clay-sm">
                  <MapPin className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                  847 Sampaguita Street, Tala, Caloocan City
                </span>
              </div>
            </div>

            {/* Hero visual slot */}
            <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-surface border border-hairline shadow-card relative">
              <Image 
                src="/hero.jpg" 
                alt="United Methodist Cooperative Learning System Hero Visual" 
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </section>

        {/* ── Trust & credentials bar ─────────────────────────────────────── */}
        <section className="bg-surface px-6 py-8 border-y border-hairline shadow-clay-sm">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6">
            <ul className="flex flex-wrap gap-x-10 gap-y-3">
              {trustStats.map((stat) => (
                <li key={stat.label} className="text-lg font-bold text-ink-soft flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand shadow-clay-sm" />
                  {stat.label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Welcome message ──────────────────────────────────────────────── */}
        <section className="px-6 py-16 md:py-20">
          <div className="mx-auto max-w-4xl bg-surface rounded-2xl p-8 md:p-12 border border-hairline shadow-card">
            <span className="text-base font-bold uppercase tracking-wider text-brand">Our Educational Philosophy</span>
            <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-ink">Welcome to UMCLSI</h2>
            <p className="mt-6 text-xl leading-relaxed text-ink-soft">
              Every child who joins our school community enters a space built on cooperative 
              learning and Christian values, operating on the principle of a 
              <strong className="text-ink"> Classroom without walls and a Classroom without losers</strong>, where 
              students grow academically by encouraging one another rather than competing against each other.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-ink-soft">
              We are a growing community of learners across Nursery,
              Kindergarten, and Elementary, and by combining caring instruction
              with interactive tools, we ensure
              every learner receives focused attention, sound academic
              guidance, and a strong moral foundation.
            </p>
          </div>
        </section>

        {/* ── Curriculum & core programs ───────────────────────────────────── */}
        <section className="px-6 py-16 md:py-20">
          <div className="mx-auto max-w-7xl">
            <span className="text-base font-bold uppercase tracking-wider text-brand">What we offer</span>
            <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-ink">Curriculum &amp; Grade Levels</h2>

            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {programs.map((program) => (
                <div
                  key={program.title}
                  className="rounded-2xl bg-surface p-8 border border-hairline shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-soft shadow-clay-sm">
                      <program.icon className="h-7 w-7 text-brand" strokeWidth={2} aria-hidden="true" />
                    </div>
                    <h3 className="mt-6 text-2xl font-bold text-ink">{program.title}</h3>
                    <p className="mt-3 text-lg leading-relaxed text-ink-soft">{program.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── The UMCLS Advantage ──────────────────────────────────────────── */}
        <section className="px-6 py-16 md:py-20">
          <div className="mx-auto max-w-7xl">
            <span className="text-base font-bold uppercase tracking-wider text-brand">Why choose us</span>
            <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-ink">The UMCLS Advantage</h2>

            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {advantages.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl bg-surface p-8 border border-hairline shadow-card hover:shadow-card-hover transition-all"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-soft shadow-clay-sm">
                    <item.icon className="h-7 w-7 text-brand" strokeWidth={2} aria-hidden="true" />
                  </div>
                  <h3 className="mt-6 text-2xl font-bold text-ink">{item.title}</h3>
                  <p className="mt-3 text-lg leading-relaxed text-ink-soft">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Educational Commitments ──────────────────────────────────────── */}
        <section className="bg-surface px-6 py-16 md:py-20 border-y border-hairline shadow-clay-sm">
          <div className="mx-auto max-w-7xl">
            <span className="text-base font-bold uppercase tracking-wider text-brand">What drives our mission</span>
            <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-ink">Our Core Commitments</h2>

            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {corePillars.map((item) => (
                <div key={item.title} className="rounded-2xl bg-surface-sunken p-8 border border-hairline shadow-clay-inset">
                  <Quote className="h-8 w-8 text-brand" strokeWidth={2} aria-hidden="true" />
                  <h3 className="mt-4 text-2xl font-bold text-ink">{item.title}</h3>
                  <p className="mt-3 text-lg leading-relaxed text-ink-soft">{item.quote}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Announcements & LMS portal notice ────────────────────────────── */}
        <section className="px-6 py-16 md:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-base font-bold uppercase tracking-wider text-brand">Stay in the loop</span>
                <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-ink">Latest Announcements</h2>
              </div>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 text-xl font-bold text-brand hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 transition-colors"
              >
                Contact us for details
                <ArrowUpRight className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {announcements.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl bg-surface p-8 border border-hairline shadow-card hover:shadow-card-hover transition-all"
                >
                  <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 text-base font-bold text-brand shadow-clay-sm">
                    <CalendarDays className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                    {item.date}
                  </span>
                  <h3 className="mt-6 text-2xl font-bold text-ink">{item.title}</h3>
                  <p className="mt-3 text-lg leading-relaxed text-ink-soft">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}