-- Fix: recreate events view so share_token is included, and backfill tokens
-- Run in Supabase SQL Editor (after share-invite-rsvp.sql Success)

UPDATE events
SET share_token = encode(gen_random_bytes(12), 'hex')
WHERE share_token IS NULL OR share_token = '';

DROP VIEW IF EXISTS events_with_stats;

CREATE VIEW events_with_stats AS
SELECT
  e.*,
  p.name AS organizer_name,
  p.email AS organizer_email,
  (SELECT COUNT(*)::int FROM rsvps r WHERE r.event_id = e.id AND r.status = 'going') AS rsvp_count,
  (SELECT COUNT(*)::int FROM rsvps r WHERE r.event_id = e.id AND r.status = 'maybe') AS maybe_count,
  (SELECT ROUND(AVG(rv.rating)::numeric, 1) FROM reviews rv WHERE rv.event_id = e.id) AS avg_rating,
  (SELECT COUNT(*)::int FROM reviews rv WHERE rv.event_id = e.id) AS review_count
FROM events e
JOIN profiles p ON e.organizer_id = p.id;

GRANT SELECT ON events_with_stats TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
