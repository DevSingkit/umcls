-- Tracks when a user last opened their notification bell, separate
-- from is_read (which stays purely about the individual notification's
-- highlight, set only when that specific notification is clicked).
--
-- Badge count = notifications where created_at > notification_badge_cleared_at.
-- Opening the bell sets this to now() (see mark-badge-seen action),
-- which immediately zeroes the badge for everything currently visible,
-- while their individual highlights (is_read) stay exactly as they
-- were until each one is actually clicked. A brand new notification
-- arriving after that moment has created_at > the new cleared_at, so
-- it counts toward the badge again right away, even if the panel
-- happens to still be open.
--
-- Nullable, defaults to null — a user who has never opened the bell
-- has every notification counted (null is treated as "epoch" in the
-- badge query, see get-unread-badge-count).

ALTER TABLE public.users
  ADD COLUMN notification_badge_cleared_at timestamp with time zone;
