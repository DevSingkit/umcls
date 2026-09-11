// app/academics/page.tsx

import { Calendar, Clock, BookOpen, Download, ShieldCheck, HeartHandshake, Sparkles, School } from "lucide-react";
import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";

const earlyChildhoodFocus = [
  "Foundational literacy, numeracy, & fine motor skills",
  "Social integration & cooperative classroom habits",
  "Early spiritual formation via daily Bible stories & guided prayer",
];

const elementarySubjects = [
  "English",
  "Mathematics",
  "Science",
  "Filipino",
  "Araling Panlipunan (Social Studies)",
  "MAPEH (Music, Arts, P.E., Health)",
  "Edukasyon sa Pagpapakatao (ESP / Values Education)",
];

const methodology = [
  {
    title: "Methodist Cooperative Learning Model",
    description: "Structured group tasks and peer-led exercises designed to build collaborative problem-solving skills rather than individual competition.",
  },
  {
    title: "UMCLSI LMS Integration",
    description: "Digital assignment tracking, learning modules, and direct teacher-parent communication through our dedicated online portal.",
  },
];

const coCurriculars = [
  "Boy Scouts of the Philippines (BSP)",
  "Girl Scouts of the Philippines (GSP)",
  "UMCLSI Campus Ministry & Choir",
  "Inter-Class Intramurals",
  "Science & Mathematics Clubs",
];

const handbookHighlights = [
  {
    title: "Flag Ceremony & Punctuality",
    description: "Daily flag ceremony begins promptly at 7:00 AM. Regular attendance is strictly monitored per DepEd guidelines.",
  },
  {
    title: "Prescribed Uniform Schedule",
    description: "Official complete uniform required Mon, Tue, Thu; Campus/Ministry shirt on Wed; Official P.E. / Scout uniform on Fri.",
  },
  {
    title: "Child Protection & Anti-Bullying",
    description: "Strict enforcement of DepEd Child Protection Policy (DO 40, s. 2012) ensuring a safe, supportive learning environment.",
  },
  {
    title: "Christian Character & Conduct",
    description: "Behavioral standards grounded in United Methodist Christian values across classroom, campus, and online interactions.",
  },
];

const depEdQuarterlyCycle = [
  { term: "First Quarter (Q1)", period: "August – October", status: "Diagnostic & Foundational Assessment" },
  { term: "Second Quarter (Q2)", period: "October – December", status: "Mid-Year Progress & Parent Conference" },
  { term: "Third Quarter (Q3)", period: "January – March", status: "Core Skill Integration & Mastery" },
  { term: "Fourth Quarter (Q4)", period: "April – May", status: "Final Periodical Exams & Moving-Up/Graduation" },
];

export default function AcademicsPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink antialiased">
      <SiteNav />

      {/* Hero Section */}
      <section className="px-4 py-12 sm:px-6 md:py-16">
        <div className="mx-auto max-w-[1280px]">
          <p className="text-caption font-semibold uppercase tracking-wider text-brand">
            Academics & Life at UMCLSI
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            DepEd-Recognized K-12 Basic Education
          </h1>
          <p className="mt-4 max-w-2xl text-body-md leading-relaxed text-ink-soft">
            Operating under the DepEd Division of Caloocan City, United Methodist Cooperative Learning System, Inc. delivers structured Early Childhood and Elementary instruction rooted in Methodist values and peer-supported learning.
          </p>

          {/* Key Academic Metadata */}
          <div className="mt-8 grid grid-cols-2 gap-4 rounded-xl border border-border bg-surface p-6 shadow-sm md:grid-cols-4">
            <div>
              <p className="text-caption text-text-secondary">Grade Levels</p>
              <p className="mt-1 text-body-md font-bold text-ink">Nursery – Grade 6</p>
            </div>
            <div>
              <p className="text-caption text-text-secondary">Governance</p>
              <p className="mt-1 text-body-md font-bold text-ink">DepEd Caloocan / UMC</p>
            </div>
            <div>
              <p className="text-caption text-text-secondary">Class Schedule</p>
              <p className="mt-1 text-body-md font-bold text-ink">Mon – Fri (7:00 AM – 3:30 PM)</p>
            </div>
            <div>
              <p className="text-caption text-text-secondary">Location</p>
              <p className="mt-1 text-body-md font-bold text-ink">Tala, Caloocan City</p>
            </div>
          </div>
        </div>
      </section>

      {/* Early Childhood */}
      <section className="px-4 py-10 sm:px-6 md:py-12">
        <div className="mx-auto max-w-[1280px]">
          <p className="text-caption font-semibold uppercase tracking-wider text-brand">
            Pre-Elementary
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">
            Early Childhood Program (Nursery & Kindergarten 1–2)
          </h2>
          <p className="mt-4 max-w-xl text-body-md text-text-secondary">
            Structured play-based learning designed to build early developmental readiness prior to Grade 1 entry:
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {earlyChildhoodFocus.map((item) => (
              <div
                key={item}
                className="rounded-xl border border-border bg-surface p-6 shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
                  <Sparkles className="h-5 w-5" />
                </div>
                <p className="mt-4 text-body-md font-medium text-ink">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Elementary */}
      <section className="px-4 py-10 sm:px-6 md:py-12">
        <div className="mx-auto max-w-[1280px]">
          <p className="text-caption font-semibold uppercase tracking-wider text-brand">
            DepEd K-12 Aligned
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">Elementary Core Curriculum (Grades 1–6)</h2>
          <p className="mt-4 max-w-2xl text-body-md text-text-secondary">
            Full compliance with national elementary learning competencies, reinforced by daily Christian devotions and moral instruction.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {elementarySubjects.map((subject) => (
              <span
                key={subject}
                className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-4 py-2 text-caption font-semibold text-brand"
              >
                <BookOpen className="h-4 w-4" />
                {subject}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* DepEd Quarterly Grading Cycle */}
      <section className="px-4 py-10 sm:px-6 md:py-12">
        <div className="mx-auto max-w-[1280px]">
          <p className="text-caption font-semibold uppercase tracking-wider text-brand">
            Academic Year
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">DepEd Grading Period Structure</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {depEdQuarterlyCycle.map((item) => (
              <div
                key={item.term}
                className="rounded-xl border border-border bg-surface p-6 shadow-sm"
              >
                <div className="flex items-center gap-2 text-brand">
                  <Calendar className="h-5 w-5" />
                  <span className="text-caption font-semibold uppercase">{item.term}</span>
                </div>
                <p className="mt-3 text-body-md font-bold text-ink">{item.period}</p>
                <p className="mt-1 text-caption text-text-secondary">{item.status}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Learning Methodology */}
      <section className="px-4 py-10 sm:px-6 md:py-12">
        <div className="mx-auto max-w-[1280px]">
          <p className="text-caption font-semibold uppercase tracking-wider text-brand">
            Instructional Model
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">Methodology & LMS Integration</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {methodology.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-border bg-surface p-6 shadow-sm transition-all hover:shadow-md"
              >
                <h3 className="text-body-md font-bold text-ink">{item.title}</h3>
                <p className="mt-2 text-caption leading-relaxed text-text-secondary">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Co-Curricular & Organizations */}
      <section className="px-4 py-10 sm:px-6 md:py-12">
        <div className="mx-auto max-w-[1280px]">
          <p className="text-caption font-semibold uppercase tracking-wider text-brand">
            Student Life
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">Approved Co-Curricular Organizations</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            {coCurriculars.map((activity) => (
              <span
                key={activity}
                className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-4 py-2 text-caption font-semibold text-brand"
              >
                <School className="h-4 w-4" />
                {activity}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Student Handbook & Policy Highlights */}
      <section className="px-4 py-10 sm:px-6 md:py-12">
        <div className="mx-auto max-w-[1280px]">
          <p className="text-caption font-semibold uppercase tracking-wider text-brand">
            Institutional Policies
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">Student Handbook Rules & Guidelines</h2>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {handbookHighlights.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-border bg-surface p-6 shadow-sm"
              >
                <h3 className="text-body-md font-bold text-ink">{item.title}</h3>
                <p className="mt-2 text-caption leading-relaxed text-text-secondary">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}