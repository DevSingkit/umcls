// app/about/page.tsx

import {
  HandHeart,
  Sparkles,
  Users2,
  HeartHandshake,
  ScrollText,
  ShieldCheck,
  BookOpenCheck,
  Trees,
  Award,
  Landmark,
  GraduationCap,
} from "lucide-react";
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

const historyMilestones = [
  {
    year: "Church Ministry Roots",
    title: "Methodist Educational Vision",
    description: "Established as an educational ministry extension of the United Methodist Church, dedicated to providing accessible, value-centric basic education in Northern Caloocan.",
  },
  {
    year: "DepEd Recognition",
    title: "Government Accreditation",
    description: "Secured official recognition from the Department of Education (DepEd) Division of Caloocan City for complete Kindergarten and Elementary levels.",
  },
  {
    year: "Cooperative Model",
    title: "Peer-Based Learning Paradigm",
    description: "Adopted a cooperative learning methodology that structures classroom seating and tasks around team problem-solving and peer mentorship.",
  },
  {
    year: "LMS & Modernization",
    title: "Digital & LMS Integration",
    description: "Implemented modern digital learning resources and LMS integration while preserving traditional classroom discipline and Christian values.",
  },
];

const facilities = [
  {
    icon: ShieldCheck,
    title: "Secured & Monitored Campus",
    description: "Controlled single-entry gate with full-time security staff suited for young Nursery to Grade 6 students.",
  },
  {
    icon: BookOpenCheck,
    title: "Cooperative Learning Classrooms",
    description: "Classrooms configured with group-oriented workspaces that foster peer collaboration and active teacher monitoring.",
  },
  {
    icon: Trees,
    title: "Community-Centered Location",
    description: "Conveniently situated at 847 Sampaguita Street, Barangay Tala, Caloocan City — accessible to local neighborhood families.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink antialiased">
      <SiteNav />

      {/* Hero Section */}
      <section className="px-4 py-12 sm:px-6 md:py-16">
        <div className="mx-auto max-w-[1280px]">
          <p className="text-caption font-semibold uppercase tracking-wider text-brand">
            Who We Are
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            United Methodist Cooperative Learning System, Inc.
          </h1>
          <p className="mt-4 max-w-2xl text-body-md leading-relaxed text-ink-soft">
            A recognized private basic education institution operating under the DepEd Division of Caloocan City and an educational ministry associated with the United Methodist Church network. We serve Nursery through Grade 6 in Tala, Caloocan City, centered on cooperative learning—where students help each other grow academically, socially, and spiritually.
          </p>

          {/* Quick Institutional Summary */}
          <div className="mt-8 grid grid-cols-2 gap-4 rounded-xl border border-border bg-surface p-6 shadow-sm md:grid-cols-4">
            <div>
              <p className="text-caption text-text-secondary">Institution Type</p>
              <p className="mt-1 text-body-md font-bold text-ink">Private Basic Education</p>
            </div>
            <div>
              <p className="text-caption text-text-secondary">DepEd Division</p>
              <p className="mt-1 text-body-md font-bold text-ink">Caloocan City</p>
            </div>
            <div>
              <p className="text-caption text-text-secondary">Affiliation</p>
              <p className="mt-1 text-body-md font-bold text-ink">United Methodist Church</p>
            </div>
            <div>
              <p className="text-caption text-text-secondary">Address</p>
              <p className="mt-1 text-body-md font-bold text-ink">Tala, Caloocan City</p>
            </div>
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="px-4 py-10 sm:px-6 md:py-12">
        <div className="mx-auto grid max-w-[1280px] gap-8 lg:grid-cols-2">
          {/* Vision Card */}
          <div className="rounded-xl border border-border bg-surface p-8 shadow-sm">
            <p className="text-caption font-semibold uppercase tracking-wider text-brand">
              Vision
            </p>
            <h2 className="mt-2 text-xl font-bold text-ink">
              Our Future Outlook
            </h2>
            <p className="mt-4 text-body-md leading-relaxed text-ink-soft">
              To be a premier Christian basic education institution in Tala, Caloocan City, recognized for nurturing academically competent, faith-filled, and socially responsible lifelong learners who exemplify Christ-like character and collaborative leadership in their communities.
            </p>
          </div>

          {/* Mission Card */}
          <div className="rounded-xl border border-border bg-surface p-8 shadow-sm">
            <p className="text-caption font-semibold uppercase tracking-wider text-brand">
              Mission
            </p>
            <h2 className="mt-2 text-xl font-bold text-ink">
              Our Educational Purpose
            </h2>
            <p className="mt-4 text-body-md leading-relaxed text-ink-soft">
              United Methodist Cooperative Learning System, Inc. is committed to providing accessible, high-quality Christian education through a learner-centered and cooperative curriculum that develops students intellectually, morally, and spiritually.
            </p>
          </div>
        </div>

        {/* Mission Pillars */}
        <div className="mx-auto mt-8 max-w-[1280px]">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {missionPillars.map((item) => (
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

      {/* Institutional Heritage & Timeline */}
      <section className="px-4 py-10 sm:px-6 md:py-12">
        <div className="mx-auto max-w-[1280px]">
          <p className="text-caption font-semibold uppercase tracking-wider text-brand">
            Our Foundation
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">Institutional Heritage</h2>
          <p className="mt-4 max-w-2xl text-body-md text-text-secondary">
            Built upon Methodist traditions of educational stewardship and community service in Northern Caloocan.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {historyMilestones.map((milestone) => (
              <div
                key={milestone.title}
                className="rounded-xl border border-border bg-surface p-6 shadow-sm"
              >
                <span className="text-caption font-semibold uppercase text-brand">
                  {milestone.year}
                </span>
                <h3 className="mt-2 text-body-md font-bold text-ink">{milestone.title}</h3>
                <p className="mt-2 text-caption leading-relaxed text-text-secondary">
                  {milestone.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="px-4 py-10 sm:px-6 md:py-12">
        <div className="mx-auto max-w-[1280px]">
          <p className="text-caption font-semibold uppercase tracking-wider text-brand">
            What Guides Us
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">Our Core Values</h2>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {coreValues.map((value) => (
              <div
                key={value.title}
                className="rounded-xl border border-border bg-surface p-6 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
                  <value.icon className="h-6 w-6 text-brand" strokeWidth={2} aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-body-md font-bold text-ink">{value.title}</h3>
                <p className="mt-2 text-caption leading-relaxed text-text-secondary">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recognition & Institutional Standards */}
      <section className="px-4 py-10 sm:px-6 md:py-12">
        <div className="mx-auto max-w-[1280px]">
          <p className="text-caption font-semibold uppercase tracking-wider text-brand">
            Accreditation & Standards
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">
            Government Recognition & Church Affiliation
          </h2>
          <p className="mt-4 max-w-2xl text-body-md text-text-secondary">
            UMCLSI strictly complies with government curriculum mandates while operating under the guidance of United Methodist governance principles.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-4 py-2 text-caption font-semibold text-brand">
              <Award className="h-4 w-4" />
              DepEd Division of Caloocan City Recognized
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-4 py-2 text-caption font-semibold text-brand">
              <Landmark className="h-4 w-4" />
              United Methodist Church Ministry Partner
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-4 py-2 text-caption font-semibold text-brand">
              <GraduationCap className="h-4 w-4" />
              K to 12 Curriculum Compliant
            </span>
          </div>
        </div>
      </section>

      {/* Campus & Facilities */}
      <section className="px-4 py-10 sm:px-6 md:py-12">
        <div className="mx-auto max-w-[1280px]">
          <p className="text-caption font-semibold uppercase tracking-wider text-brand">
            Our Campus
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">Campus & Environment</h2>
          <p className="mt-4 max-w-2xl text-body-md text-text-secondary">
            A dedicated elementary learning environment designed specifically for pre-school and grade school safety and active collaboration.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {facilities.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-border bg-surface p-6 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
                  <item.icon className="h-6 w-6 text-brand" strokeWidth={2} aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-body-md font-bold text-ink">{item.title}</h3>
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