-- audit_logs_rls.test.sql
-- Checks RC-02: admins can read audit_logs, nobody else can, and nobody
-- can insert, update, or delete rows directly. All writes must go through
-- the log_audit_event() function instead.

begin;
select plan(5);

-- Setup: create a fake admin, a fake teacher, and a fake audit log row.
-- (Assumes a users table with id/role columns and a seed helper is not
-- available yet, so this uses direct inserts. Adjust if the project has
-- a shared test fixture helper by the time this runs.)
insert into auth.users (id, email) values
    ('11111111-1111-1111-1111-111111111111', 'admin@test.local'),
    ('22222222-2222-2222-2222-222222222222', 'teacher@test.local');

insert into public.users (id, role, full_name, is_active) values
    ('11111111-1111-1111-1111-111111111111', 'admin', 'Test Admin', true),
    ('22222222-2222-2222-2222-222222222222', 'teacher', 'Test Teacher', true);

insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, metadata)
values ('11111111-1111-1111-1111-111111111111', 'admin', 'test_action', 'users', '00000000-0000-0000-0000-000000000000', '{}');

-- Test 1: admin can select from audit_logs
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "11111111-1111-1111-1111-111111111111"}';

select isnt_empty(
    'select * from audit_logs',
    'admin can read audit_logs'
);

-- Test 2: teacher cannot select from audit_logs
set local "request.jwt.claims" to '{"sub": "22222222-2222-2222-2222-222222222222"}';

select is_empty(
    'select * from audit_logs',
    'teacher cannot read audit_logs'
);

-- Test 3: no insert policy exists for authenticated role at all
select throws_ok(
    $$insert into audit_logs (actor_id, actor_role, action) values ('22222222-2222-2222-2222-222222222222', 'teacher', 'sneaky_insert')$$,
    'new row violates row-level security policy for table "audit_logs"',
    'direct insert into audit_logs is blocked for authenticated users'
);

-- Test 4: no update policy exists
select throws_ok(
    $$update audit_logs set action = 'tampered' where true$$,
    'new row violates row-level security policy for table "audit_logs"',
    'direct update on audit_logs is blocked for authenticated users'
);

-- Test 5: no delete policy exists
select throws_ok(
    $$delete from audit_logs where true$$,
    'new row violates row-level security policy for table "audit_logs"',
    'direct delete on audit_logs is blocked for authenticated users'
);

select * from finish();
rollback;