import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { ROLE_DASHBOARD } from "@/lib/navigation/nav-items";

export default async function UnauthorizedPage() {
  const user = await getCurrentUser();
  const backHref = user ? ROLE_DASHBOARD[user.role] : "/";
  const backLabel = user ? "Back to your dashboard" : "Back to login";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-6 text-center antialiased">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
        <ShieldAlert className="h-8 w-8 text-brand" aria-hidden="true" />
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        You don&apos;t have access to this page
      </h1>

      <p className="max-w-md text-caption leading-relaxed text-text-secondary">
        Your account role doesn&apos;t have permission to view this page. If you think this is a
        mistake, contact your school administrator.
      </p>

      <Link
        href={backHref}
        className="mt-2 inline-flex h-12 items-center justify-center rounded-lg bg-brand px-6 text-caption font-semibold text-white transition-all hover:bg-brand-hover"
      >
        {backLabel}
      </Link>
    </div>
  );
}