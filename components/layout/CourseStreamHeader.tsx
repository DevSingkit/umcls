"use client";

import { usePageHeader } from "@/components/layout/PageHeaderContext";
import { CourseTabs } from "@/components/layout/CourseTabs";

interface CourseStreamHeaderProps {
  courseId: string;
  role: "student" | "teacher";
  title: string;
  subject?: string;
  subtitle?: string;
}

/**
 * Sets the TopNav breadcrumb (UMCLSI > title) and the course tab row for
 * the duration this component is mounted. Rendered once near the top of
 * a course detail page — renders nothing itself.
 */
export function CourseStreamHeader({
  courseId,
  role,
  title,
  subject,
  subtitle,
}: CourseStreamHeaderProps) {
  usePageHeader({
    title,
    subject,
    subtitle,
    tabs: <CourseTabs courseId={courseId} role={role} />,
  });

  return null;
}
