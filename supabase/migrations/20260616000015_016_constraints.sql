-- 20260616_016_constraints.sql
-- Source: DATABASE.md §5 Constraints & Foreign Keys
-- All foreign keys are defined inline in the CREATE TABLE statements already applied.

-- REPLACED: enrollments_not_teacher CHECK constraint (FIND-022).
-- CHECK constraints cannot reliably reference other tables in all
-- PostgreSQL/Supabase contexts. Enforcement is a BEFORE INSERT trigger
-- instead — see 017_triggers.sql §7.6.

-- Submission file or text response required (at least one)
alter table assignment_submissions
    add constraint submissions_has_content
    check (response_text is not null or file_path is not null);

-- quiz available_until must be after available_from
alter table quizzes
    add constraint quizzes_dates_order
    check (available_until is null or available_from is null or available_until > available_from);

-- score must be within max_score range.
-- NOTE: PostgreSQL does not permit subqueries in CHECK constraints.
-- Enforcement is via a BEFORE INSERT OR UPDATE OF score trigger instead.
-- Application-layer Zod validation (GradeSubmissionSchema) provides the
-- first line of defense; this trigger is the DB backstop.
create or replace function trg_fn_check_submission_score()
returns trigger language plpgsql as $$
declare
    v_max_score numeric(6,2);
begin
    select max_score into v_max_score
    from assignments
    where id = new.assignment_id;

    if new.score is not null and (new.score < 0 or new.score > v_max_score) then
        raise exception
            'Score % is outside the valid range [0, %] for assignment %',
            new.score, v_max_score, new.assignment_id
            using errcode = 'check_violation';
    end if;

    return new;
end;
$$;

create trigger trg_check_submission_score
    before insert or update of score on assignment_submissions
    for each row execute function trg_fn_check_submission_score();
