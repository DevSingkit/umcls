import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { ROLE_DASHBOARD } from "@/lib/navigation/nav-items";

// Standalone page (outside the (dashboard) shell) — reached when a logged-in
// user's role doesn't match the page they tried to open (AUTH_NOTES.md).
// Uses getCurrentUser(), not requireUser(), so a broken session can't loop
// back into this page.
export default async function UnauthorizedPage() {
    const user = await getCurrentUser();
    const backHref = user ? ROLE_DASHBOARD[user.role] : "/";
    const backLabel = user ? "Back to your dashboard" : "Back to login";

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
            <ShieldAlert size={64} className="text-text-secondary" aria-hidden="true" />
            <h1 className="text-h1 text-ink">You don&apos;t have access to this page</h1>
            <p className="max-w-sm text-body-md text-text-secondary">
                Your account role doesn&apos;t have permission to view this page. If you think this is a
                mistake, contact your school admin.
            </p>
            <Link
                href={backHref}
                className="mt-2 inline-flex h-11 items-center rounded-md bg-ink px-6 text-body-emphasis text-on-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
            >
                {backLabel}
            </Link>
        </div>
    );
}