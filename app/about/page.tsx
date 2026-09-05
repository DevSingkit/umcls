// app/about/page.tsx
//
// About Us.
//
// DESIGN-LMS 2.1 content pass (2026-09-06, continued): Mission and
// Vision replaced with the school's official statements (previously
// shorter placeholder copy). Core Values expanded from 4 to the
// official 5 — Faith, Excellence, Cooperation, Integrity, Service —
// each with its Filipino term, per the source content. Values grid
// changed from 2-col to 3-col on desktop to fit 5 items without an
// awkward orphaned last row at 2-col (5 items in a 2-col grid leaves
// one alone; 3-col gives a clean 3+2).

import { HandHeart, Sparkles, Users2, HeartHandshake, ShieldCheck, BookOpenCheck, Trees, ScrollText } from "lucide-react";
import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";

const coreValues = [
  {
    icon: HandHeart,
    title: "Faith (Pananampalataya)",
    description: "Anchoring all aspects of learning, growth, and character formation in Christian faith and Methodist tradition.",
  },
  {
    icon: Sparkles,
    title: "Excellence (Kagalingan)",
    description: "Striving for high standards in academic achievement, teaching quality, and personal development.",
  },
  {
    icon: Users2,
    title: "Cooperation (Pagtutulungan)",
    description: "Embracing collaborative learning, peer support, and strong community partnerships.",
  },
  {
    icon: ScrollText,
    title: "Integrity (Katapatan)",
    description: "Upholding honesty, responsibility, and moral courage in every action and relationship.",
  },
  {
    icon: HeartHandshake,
    title: "Service (Paglilingkod)",
    description: "Encouraging students to use their gifts to serve their families, school, church, and the broader community.",
  },
];

const missionPillars = [
  {
    title: "Cultivate Faith & Character",
    description: "Integrate United Methodist principles and Christian values into daily learning to help students build a strong spiritual and moral foundation.",
  },
  {
    title: "Deliver Academic Excellence",
    description: "Align with DepEd standards to ensure students acquire essential literacy, critical thinking, and problem-solving skills from early childhood through elementary education.",
  },
  {
    title: "Foster Cooperative Learning",
    description: "Promote teamwork, mutual respect, and collaborative problem-solving among students, teachers, and parents.",
  },
  {
    title: "Serve the Community",
    description: "Engage active partnerships with families and the local Tala community to foster a safe, inclusive, and supportive environment for every learner.",
  },
];

const facilities = [
  {
    icon: ShieldCheck,
    title: "A safe, secured campus",
    description: "A controlled, monitored campus environment suited to Nursery through Grade 6 learners.",
  },
  {
    icon: BookOpenCheck,
    title: "Classrooms built for cooperative learning",
    description: "Grouped seating and shared workspaces designed around group-based, peer-supported lessons.",
  },
  {
    icon: Trees,
    title: "Rooted in the Tala community",
    description: "Located at 847 Sampaguita Street, Tala, Caloocan City — serving families in Northern Caloocan.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink antialiased">
      <SiteNav />

      {/* ── Intro ────────────────────────────────────────────────────── */}
      <section className="px-4 pb-12 pt-10 sm:px-6 md:pb-20 md:pt-16">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-label text-text-secondary">Who we are</p>
          <h1 className="mt-4 max-w-2xl text-h1 text-ink md:text-[3rem] md:leading-[1.0]">
            United Methodist Cooperative Learning System, Inc.
          </h1>

          <p className="mt-6 max-w-xl text-body-lg text-ink-soft">
            A recognized private basic education institution operating under
            the DepEd Division of Caloocan City, and a ministry extension
            associated with the United Methodist Church (UMC) network in
            Metro Manila. We serve Nursery through Grade 6 in Tala, Caloocan
            City, built around cooperative learning: students helping each
            other grow, not competing against each other.
          </p>
        </div>
      </section>

      {/* ── Vision ───────────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-label text-text-secondary">Vision</p>
          <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-ink-soft">
            To be a premier Christian basic education institution in Tala,
            Caloocan City, recognized for nurturing academically competent,
            faith-filled, and socially responsible lifelong learners who
            exemplify Christ-like character and collaborative leadership in
            their communities.
          </p>
        </div>
      </section>

      {/* ── Mission ──────────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-label text-text-secondary">Mission</p>
          <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-ink-soft">
            United Methodist Cooperative Learning System, Inc. is committed
            to providing accessible, high-quality Christian education
            through a learner-centered and cooperative curriculum. We strive
            to:
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {missionPillars.map((item) => (
              <div
                key={item.title}
                className="rounded-md bg-surface p-7 shadow-card transition-shadow hover:shadow-card-hover"
              >
                <h3 className="text-body-emphasis text-ink">{item.title}</h3>
                <p className="mt-2 text-caption text-text-secondary">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Core values ──────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-label text-text-secondary">What guides us</p>
          <h2 className="mt-3 text-h2 text-ink">Our core values</h2>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {coreValues.map((value) => (
              <div
                key={value.title}
                className="rounded-md bg-surface p-7 shadow-card transition-shadow hover:shadow-card-hover"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-pill bg-brand-soft">
                  <value.icon className="h-6 w-6 text-brand" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-body-emphasis text-ink">{value.title}</h3>
                <p className="mt-2 text-caption text-text-secondary">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Recognition & affiliation ────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-label text-text-secondary">Recognition</p>
          <h2 className="mt-3 text-h2 text-ink">
            Recognized by DepEd, rooted in a larger church
          </h2>
          <p className="mt-4 max-w-xl text-body-md text-text-secondary">
            UMCLSI operates under the DepEd Division of Caloocan City, and is
            affiliated with the United Methodist Church network in Metro
            Manila as a ministry extension bringing Christian basic
            education to the Tala community.
          </p>

          <div className="mt-8 flex flex-wrap gap-2.5">
            <span className="inline-flex items-center rounded-pill bg-brand-soft px-4 py-1.5 text-caption font-semibold text-brand">
              DepEd Division of Caloocan City
            </span>
            <span className="inline-flex items-center rounded-pill bg-brand-soft px-4 py-1.5 text-caption font-semibold text-brand">
              United Methodist Church &ndash; Metro Manila
            </span>
          </div>
        </div>
      </section>

      {/* ── Facilities ───────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-label text-text-secondary">Our campus</p>
          <h2 className="mt-3 text-h2 text-ink">Campus &amp; environment</h2>
          <p className="mt-4 max-w-xl text-body-md text-text-secondary">
            A campus sized for an elementary school rather than spread thin
            across one &mdash; safe, community-facing, and set up for the way
            we teach.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {facilities.map((item) => (
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

      <SiteFooter />
    </div>
  );
}
