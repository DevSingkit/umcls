-- answer_options_rls.test.sql
-- Checks RC-03: students can read the safe view (no answer key visible),
-- and cannot read the raw table directly. Also checks the view itself
-- never exposes the is_correct column, which is the whole point of it.

begin;
select plan(4);

-- Test 1: the view has no is_correct column, structurally, regardless of role
select isnt(
    (select count(*) from information_schema.columns
     where table_name = 'answer_options_for_student' and column_name = 'is_correct'),
    1,
    'answer_options_for_student view has no is_correct column'
);

-- Test 2: authenticated role has no direct SELECT grant on the raw table
select ok(
    not has_table_privilege('authenticated', 'answer_options', 'SELECT'),
    'authenticated role cannot select directly from answer_options'
);

-- Test 3: authenticated role does have SELECT on the safe view
select ok(
    has_table_privilege('authenticated', 'answer_options_for_student', 'SELECT'),
    'authenticated role can select from answer_options_for_student'
);

-- Test 4: querying the view as a student does not error out
-- (this is the bug that was found live: with security_invoker = true,
-- students got "permission denied for table answer_options" instead of
-- just seeing their rows. This test would have caught that.)
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "33333333-3333-3333-3333-333333333333"}';

select lives_ok(
    $$select * from answer_options_for_student limit 1$$,
    'querying answer_options_for_student as authenticated does not throw a permission error'
);

select * from finish();
rollback;