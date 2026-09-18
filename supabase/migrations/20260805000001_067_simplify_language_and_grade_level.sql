-- 20260805000001_067_simplify_language_and_grade_level.sql

-- Grade level on courses, set once by the teacher, used to scope Simplify generation.
-- Nullable since existing courses won't have one set yet; not forcing a backfill.
alter table courses
    add column grade_level integer check (grade_level between 1 and 6);

-- Language on lesson_simplifications. A lesson can now have an English version,
-- a Tagalog version, or both, generated and published independently.
alter table lesson_simplifications
    add column language text not null default 'english'
        check (language in ('english', 'tagalog'));

-- Old constraint only allowed one row per lesson. Replace with one row per
-- lesson per language, so English and Tagalog can coexist.
alter table lesson_simplifications
    drop constraint lesson_simplifications_lesson_id_key;

alter table lesson_simplifications
    add constraint lesson_simplifications_lesson_language_unique
        unique (lesson_id, language);

-- Student's last-picked Simplify language, remembered across every lesson
-- so they don't have to pick it every time.
alter table users
    add column preferred_simplify_language text not null default 'english'
        check (preferred_simplify_language in ('english', 'tagalog'));