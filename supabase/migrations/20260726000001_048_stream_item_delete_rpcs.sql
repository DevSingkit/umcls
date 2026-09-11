-- 048_stream_item_delete_rpcs.sql
-- Same issue as migration 036 (delete_material): the *_update RLS
-- policies' WITH CHECK rejects this UPDATE even when the caller is
-- verifiably the owning teacher. Rather than debug the RLS policy
-- itself, use the same proven workaround — a SECURITY DEFINER RPC
-- that does the ownership check explicitly in SQL and performs the
-- update under elevated privileges.

create or replace function delete_lesson(p_lesson_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_course_id uuid;
    v_is_owner boolean;
begin
    select course_id into v_course_id from lessons where id = p_lesson_id and deleted_at is null;
    if v_course_id is null then
        return false;
    end if;

    select exists (
        select 1 from courses
        where id = v_course_id and teacher_id = auth.uid()
    ) into v_is_owner;

    if not v_is_owner then
        return false;
    end if;

    update lessons set deleted_at = now() where id = p_lesson_id;
    return true;
end;
$$;

create or replace function delete_quiz(p_quiz_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_course_id uuid;
    v_is_owner boolean;
begin
    select course_id into v_course_id from quizzes where id = p_quiz_id and deleted_at is null;
    if v_course_id is null then
        return false;
    end if;

    select exists (
        select 1 from courses
        where id = v_course_id and teacher_id = auth.uid()
    ) into v_is_owner;

    if not v_is_owner then
        return false;
    end if;

    update quizzes set deleted_at = now() where id = p_quiz_id;
    return true;
end;
$$;

create or replace function delete_assignment(p_assignment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_course_id uuid;
    v_is_owner boolean;
begin
    select course_id into v_course_id from assignments where id = p_assignment_id and deleted_at is null;
    if v_course_id is null then
        return false;
    end if;

    select exists (
        select 1 from courses
        where id = v_course_id and teacher_id = auth.uid()
    ) into v_is_owner;

    if not v_is_owner then
        return false;
    end if;

    update assignments set deleted_at = now() where id = p_assignment_id;
    return true;
end;
$$;
