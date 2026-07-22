-- Eventify: Advanced event planning fields (idempotent)
-- Run once in Supabase SQL Editor after deploying the Create Event upgrade.

ALTER TABLE events ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE events ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_name TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS maps_url TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'
  CHECK (visibility IN ('public', 'private', 'invite_only'));
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_free BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE events ADD COLUMN IF NOT EXISTS contact_email TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS contact_phone TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS website TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS gallery JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE events ADD COLUMN IF NOT EXISTS planning_data JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Drop CHECK and re-add only if needed (visibility may already exist without constraint)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'events_visibility_check'
  ) THEN
    BEGIN
      ALTER TABLE events ADD CONSTRAINT events_visibility_check
        CHECK (visibility IN ('public', 'private', 'invite_only'));
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;
END $$;

-- Drop and recreate view (CREATE OR REPLACE cannot reorder/rename columns
-- when events gains new fields before organizer_name in e.*)
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

INSERT INTO storage.buckets (id, name, public) VALUES ('event-documents', 'event-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "event_docs_read" ON storage.objects;
DROP POLICY IF EXISTS "event_docs_insert" ON storage.objects;
DROP POLICY IF EXISTS "event_docs_delete" ON storage.objects;

CREATE POLICY "event_docs_read" ON storage.objects FOR SELECT USING (
  bucket_id = 'event-documents' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "event_docs_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'event-documents' AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "event_docs_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'event-documents' AND auth.uid()::text = (storage.foldername(name))[1]
);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT SELECT ON events_with_stats TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
