Add this right after the existing `log_audit_event` call for `AUTH_LOGIN`
in `features/auth/actions/login.ts`, so it only runs on a real successful
login, same as the audit log entry:

    await supabase.rpc('log_audit_event', {
        p_action: 'AUTH_LOGIN',
        p_metadata: { ip },
    })

    // Record this login for the admin dashboard's weekly activity graph.
    // Not a big deal if this ever fails silently, the login itself
    // already succeeded and the audit log above is the real record.
    await supabase.from('login_events').insert({
        user_id: data.user.id,
        role: profile.role,
    })

Nothing else in the file changes.
