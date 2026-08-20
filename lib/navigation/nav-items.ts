import type { LucideIcon } from "lucide-react";
import {
    Home,
    Users,
    ScrollText,
    Settings,
    GraduationCap,
    Archive,
    BookOpen,
} from "lucide-react";

export type Role = "admin" | "teacher" | "student";

export interface NavItem {
    label: string;
    href: string;
    icon: LucideIcon;
    isV1: boolean;
    isActive?: (pathname: string) => boolean;
}
export const NAV_ITEMS: Record<Role, NavItem[]> = {
    admin: [
        { label: "Dashboard", href: "/admin/dashboard", icon: Home, isV1: true },
        {
            label: "Archive",
            href: "/admin/courses",
            icon: BookOpen,
            isV1: true, 
        },
        {
            label: "Audit Logs",
            href: "/admin/audit-logs",
            icon: ScrollText,
            isV1: true, 
        },
        {
            label: "Bulk Import",
            href: "/admin/bulk-import",
            icon: Users,
            isV1: true, 
        },
        
        {
            label: "Backups",
            href: "/admin/backups",
            icon: Archive,
            isV1: true, 
        },
        
    ],
    teacher: [
        { label: "Dashboard", href: "/teacher/dashboard", icon: Home, isV1: true },
        {
            label: "People",
            href: "/teacher/people",
            icon: Users,
            isV1: true, 
        },
        {
            label: "Grades",
            href: "/teacher/gradebook",
            icon: GraduationCap,
            isV1: true, 
        },
        
        {
            label: "Archived",
            href: "/teacher/archived",
            icon: Archive,
            isV1: true, 
        },
        
    ],
    student: [
        { label: "Home", href: "/student/dashboard", icon: Home, isV1: true },
        {
            label: "People",
            href: "/student/people",
            icon: Users,
            isV1: true, 
        },
        {
            label: "Grades",
            href: "/student/grades",
            icon: GraduationCap,
            isV1: true, 
        },
        {
            label: "Archived",
            href: "/student/archived",
            icon: Archive,
            isV1: true, 
        },
    ],
};

export const ROLE_LABELS: Record<Role, string> = {
    admin: "Admin",
    teacher: "Teacher",
    student: "Student",
};

export const ROLE_DASHBOARD: Record<Role, string> = {
    admin: "/admin/dashboard",
    teacher: "/teacher/dashboard",
    student: "/student/dashboard",
};