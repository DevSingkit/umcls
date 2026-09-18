import { requireRole } from '@/lib/auth/get-current-user'
import { CreateUserForm } from '@/features/admin/components/CreateUserForm'

// One job: create a new account. Split out of the old combined
// admin/users/page.tsx.
//
// Design pass: this is single-form content, so §7.8's max-w-2xl cap is
// correct here (unlike the list pages above) — kept as is, just
// dropped the uppercase "• ADMIN" eyebrow per §10, same reasoning as
// the Users list page.
export default async function AdminNewUserPage() {
    await requireRole(['admin'])

    return (
        <div className="max-w-2xl">
            <h1 className="text-h1 text-ink mb-8">Create a new account</h1>

            <CreateUserForm />
        </div>
    )
}