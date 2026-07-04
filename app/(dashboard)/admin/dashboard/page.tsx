// Placeholder — this route exists so PH0-006's routing/shell can be tested
// end to end (login → role dashboard). The real V1 content (a bare
// user/course list, per VERSION_ROADMAP.md) ships in PH2-002.
export default function AdminDashboardPage() {
    return (
        <div>
            <h1 className="text-display-sm text-ink">Admin Dashboard</h1>
            <p className="mt-2 text-body-md text-graphite">
                Placeholder page from PH0-006. The bare user/course list lands in PH2-002.
            </p>
        </div>
    );
}