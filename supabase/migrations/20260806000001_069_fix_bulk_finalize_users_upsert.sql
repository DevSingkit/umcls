-- Fixes bulk_finalize_users() colliding with the row handle_new_user()
-- already inserted into public.users the moment each Auth account was
-- created in step 1 of bulkImportUsers (features/admin/actions/bulk-import.ts).
-- The plain INSERT here was always going to conflict on users_pkey (id) —
-- this RPC's real job is to fill in full_name/email/role on the row that
-- already exists, not create a new one, so it's now an upsert.
CREATE OR REPLACE FUNCTION public.bulk_finalize_users(p_users jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user jsonb;
BEGIN
  FOR v_user IN SELECT * FROM jsonb_array_elements(p_users)
  LOOP
    INSERT INTO public.users (id, full_name, email, role)
    VALUES (
      (v_user->>'auth_id')::uuid,
      v_user->>'full_name',
      v_user->>'email',
      v_user->>'role'
    )
    ON CONFLICT (id) DO UPDATE
      SET full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          role = EXCLUDED.role;
  END LOOP;
  -- log_audit_event reads auth.uid() itself, so this must be called
  -- with the admin's own session (not the service role client), the
  -- same way every other action in this project logs actions.
  PERFORM public.log_audit_event(
    p_action => 'BULK_IMPORT_USERS',
    p_metadata => jsonb_build_object('count', jsonb_array_length(p_users))
  );
END;
$function$