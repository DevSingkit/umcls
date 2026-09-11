import { Construction } from "lucide-react";

interface ComingSoonPageProps {
    searchParams: Promise<{ feature?: string }>;
}

// Shared destination for nav items not yet built in V1 (see
// lib/navigation/nav-items.ts `isV1: false` entries and VERSION_ROADMAP.md).
// Keeps every role's nav at the design system's required 5 tabs without
// linking to a 404.
export default async function ComingSoonPage({ searchParams }: ComingSoonPageProps) {
    const { feature } = await searchParams;
    const label = feature ?? "This feature";

    return (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <Construction size={64} className="text-text-secondary" aria-hidden="true" />
            <h1 className="text-h1 text-ink">{label} is coming soon</h1>
            <p className="max-w-sm text-body-md text-text-secondary">
                This part of the LMS is scoped for a later version.
            </p>
        </div>
    );
}