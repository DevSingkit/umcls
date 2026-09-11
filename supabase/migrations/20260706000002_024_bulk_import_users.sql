-- Atomic batch creation helper for PH2-003 CSV Bulk Import.
--
-- This function itself does NOT create Supabase Auth accounts (that
-- has to happen from the server action, via the service-role client,
-- same as the single-user create-user.ts flow). What this function
-- does is the second half: once auth accounts exist, it writes all the
-- matching public.users rows in one transaction, so if anything fails
-- partway through, none of the rows are left behind half-created.
--
-- Row-level validation (name length, email format, password strength,
-- role value) happens in the server action before this function is
-- ever called, using the same zod schema as the single-user flow. This
-- function assumes it is only ever called with already-validated,
-- already-created auth users.
CREATE OR REPLACE FUNCTION public.bulk_finalize_users(
  p_users jsonb -- array of { auth_id, full_name, email, role }
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    );
  END LOOP;

  -- log_audit_event reads auth.uid() itself, so this must be called
  -- with the admin's own session (not the service role client), the
  -- same way every other action in this project logs actions.
  PERFORM public.log_audit_event(
    p_action => 'BULK_IMPORT_USERS',
    p_metadata => jsonb_build_object('count', jsonb_array_length(p_users))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_finalize_users(jsonb) TO authenticated;
