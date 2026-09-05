// app/academics/page.tsx
//
// Academics & Student Life.
//
// DESIGN-LMS 2.1 content pass (2026-09-06): the curriculum overview
// previously collapsed Nursery/Kindergarten and Grades 1-6 into one
// vague paragraph. Split into two explicit levels per the brief:
// Early Childhood (Nursery, Kindergarten 1 & 2) and Elementary
// (Grades 1-6), the latter now naming all seven DepEd subjects
// (English, Math, Science, Filipino, Araling Panlipunan, MAPEH, ESP)
// instead of just "English and Math". Also added a Digital Integration
// item under Learning Methodology naming the LMS specifically for
// coursework submission and resources, which the brief called out and
// the previous copy omitted entirely.

import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";

const earlyChildhoodFocus = [
  "Foundational literacy & numeracy",
  "Motor skills & social interaction",
  "Early spiritual formation through Bible stories & guided play",
];

const elementarySubjects = [
  "English",
  "Mathematics",
  "Science",
  "Filipino",
  "Araling Panlipunan (Social Studies)",
  "MAPEH (Music, Arts, P.E., Health)",
  "Edukasyon sa Pagpapakatao (Values Education)",
];

const methodology = [
  {
    title: "Cooperative Learning Model",
    description: "Group-based activities, peer interaction, and interactive exercises designed to build teamwork and confidence.",
  },
  {
    title: "Digital Integration",
    description: "Coursework submission, learning resources, and academic updates through the UMCLSI LMS, alongside traditional classroom teaching.",
  },
];

const activities = [
  "Campus ministry",
  "Scout units",
  "Choir",
  "Arts",
  "Sports",
  "Science club",
];

const handbookHighlights = [
  {
    title: "Attendance",
    description: "Regular attendance is expected, with clear steps for reporting absences.",
  },
  {
    title: "Dress code",
    description: "Uniform and grooming standards, consistent across grade levels.",
  },
  {
    title: "Anti-bullying",
    description: "A clear process for reporting and addressing bullying, taken seriously at every level.",
  },
  {
    title: "Conduct",
    description: "Expectations for behavior in and out of the classroom, in line with our values.",
  },
];

export default function AcademicsPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink antialiased">
      <SiteNav />

      {/* ── Intro ────────────────────────────────────────────────────── */}
      <section className="px-4 pb-12 pt-10 sm:px-6 md:pb-20 md:pt-16">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-label text-text-secondary">Life at UMCLSI</p>
          <h1 className="mt-4 max-w-2xl text-h1 text-ink md:text-[3rem] md:leading-[1.1]">
            Academics and student life
          </h1>
          <p className="mt-6 max-w-xl text-body-lg text-ink-soft">
            Fully aligned with DepEd curriculum standards for basic
            education, from Nursery through Grade 6, with values woven
            through every subject.
          </p>
        </div>
      </section>

      {/* ── Early Childhood ──────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-label text-text-secondary">Ages 3&ndash;5</p>
          <h2 className="mt-3 text-h2 text-ink">
            Early Childhood Education (Nursery &amp; Kindergarten)
          </h2>
          <p className="mt-4 max-w-xl text-body-md text-text-secondary">
            Covering Nursery, Kindergarten 1, and Kindergarten 2, with a
            play-based foundation focused on:
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            {earlyChildhoodFocus.map((item) => (
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

      {/* ── Elementary ───────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-label text-text-secondary">Grades 1&ndash;6</p>
          <h2 className="mt-3 text-h2 text-ink">Elementary Education</h2>
          <p className="mt-4 max-w-xl text-body-md text-text-secondary">
            A DepEd K-12 aligned core curriculum, taught alongside daily
            Christian education &mdash; integrated devotions, values lessons,
            and character development.
          </p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            {elementarySubjects.map((subject) => (
              <span
                key={subject}
                className="inline-flex items-center rounded-pill bg-brand-soft px-4 py-1.5 text-caption font-semibold text-brand"
              >
                {subject}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Learning methodology ─────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="text-h2 text-ink">Learning methodology</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {methodology.map((item) => (
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

      {/* ── Co-curricular ────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="text-h2 text-ink">Co-curricular activities</h2>
          <div className="mt-8 flex flex-wrap gap-2.5">
            {activities.map((activity) => (
              <span
                key={activity}
                className="inline-flex items-center rounded-pill bg-brand-soft px-4 py-1.5 text-caption font-semibold text-brand"
              >
                {activity}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Student handbook ─────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="text-h2 text-ink">Student handbook highlights</h2>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {handbookHighlights.map((item) => (
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

      <SiteFooter />
    </div>
  );
}
