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
    const backHref = user ? ROLE_DASHBOARD[user.role] : "/login";
    const backLabel = user ? "Back to your dashboard" : "Back to login";

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
            <ShieldAlert size={64} className="text-steel" aria-hidden="true" />
            <h1 className="text-display-xs text-charcoal">You don&apos;t have access to this page</h1>
            <p className="max-w-sm text-body-md text-graphite">
                Your account role doesn&apos;t have permission to view this page. If you think this is a
                mistake, contact your school admin.
            </p>
            <Link
                href={backHref}
                className="mt-2 inline-flex h-11 items-center rounded-md bg-primary px-6 text-button-md text-on-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
                {backLabel}
            </Link>
        </div>
    );
}