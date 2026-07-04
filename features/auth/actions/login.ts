// See lib/auth/AUTH_NOTES.md for why these checks exist

'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: 'Please enter your email and password.' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error || !data.user) {
        return { error: 'Invalid email or password.' }
    }

    // Confirm the account is active and get the role.
    // We check this here too, not just in middleware, in case
    // middleware is ever skipped by mistake.
    const { data: profile } = await supabase
        .from('users')
        .select('role, is_active')
        .eq('id', data.user.id)
        .single()

    if (!profile || !profile.is_active) {
        await supabase.auth.signOut()
        return { error: 'This account is not active. Please contact your school admin.' }
    }

    // ADD THIS: seed last_seen_at so middleware inactivity check doesn't
    // immediately fire on the first request after login (null = inactive by design)
    await supabase
        .from('users')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', data.user.id)


    if (profile.role === 'admin') {
        redirect('/admin')
    } else if (profile.role === 'teacher') {
        redirect('/teacher')
    } else {
        redirect('/student')
    }
}