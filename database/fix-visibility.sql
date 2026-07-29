-- Ensure visibility works for Private / Invite Only / Public
-- Run in Supabase → SQL Editor

ALTER TABLE events ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';

-- Drop old check if present, then re-add
DO $$
BEGIN
  ALTER TABLE events DROP CONSTRAINT IF EXISTS events_visibility_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE events
  ADD CONSTRAINT events_visibility_check
  CHECK (visibility IN ('public', 'private', 'invite_only'));

UPDATE events
SET visibility = 'public'
WHERE visibility IS NULL OR visibility NOT IN ('public', 'private', 'invite_only');

-- Recreate view so e.* includes visibility (views expand columns at create time)
DROP VIEW IF EXISTS events_with_stats;
CREATE VIEW events_with_stats
WITH (security_invoker = true)
AS
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

-- Host-only private events
DROP POLICY IF EXISTS "events_select" ON events;
CREATE POLICY "events_select" ON events FOR SELECT USING (
  COALESCE(visibility, 'public') = 'public'
  OR auth.uid() = organizer_id
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
  OR (
    COALESCE(visibility, 'public') = 'invite_only'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(planning_data->'guests', '[]'::jsonb)) AS g
      WHERE lower(nullif(trim(g->>'email'), ''))
        = lower((SELECT email FROM profiles WHERE id = auth.uid()))
    )
  )
);

-- Explicit WITH CHECK so changing visibility always passes RLS
DROP POLICY IF EXISTS "events_update" ON events;
CREATE POLICY "events_update" ON events FOR UPDATE
USING (
  auth.uid() = organizer_id
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
)
WITH CHECK (
  auth.uid() = organizer_id
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

NOTIFY pgrst, 'reload schema';
