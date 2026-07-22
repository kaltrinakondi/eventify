-- Optional upgrade for Eventify feature pack
-- Matches events.id = BIGINT and profiles.id = UUID
-- Run in Supabase SQL Editor (New query → paste all → Run)

-- Clean up a failed partial run (safe if tables do not exist yet)
DROP TABLE IF EXISTS waitlist CASCADE;
DROP TABLE IF EXISTS event_reports CASCADE;
DROP TABLE IF EXISTS event_views CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS event_checkins CASCADE;
DROP FUNCTION IF EXISTS increment_event_views(BIGINT);
DROP FUNCTION IF EXISTS increment_event_views(UUID);

CREATE TABLE waitlist (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, email)
);

CREATE TABLE event_reports (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE event_views (
  event_id BIGINT PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  views INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE event_checkins (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_key TEXT NOT NULL,
  guest_name TEXT NOT NULL DEFAULT '',
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, guest_key)
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS waitlist_insert ON waitlist;
CREATE POLICY waitlist_insert ON waitlist FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS waitlist_select_host ON waitlist;
CREATE POLICY waitlist_select_host ON waitlist FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = event_id
      AND (
        e.organizer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      )
  )
  OR auth.uid() = user_id
);

DROP POLICY IF EXISTS reports_insert ON event_reports;
CREATE POLICY reports_insert ON event_reports FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS reports_select_admin ON event_reports;
CREATE POLICY reports_select_admin ON event_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS views_select ON event_views;
CREATE POLICY views_select ON event_views FOR SELECT USING (true);

DROP POLICY IF EXISTS views_upsert ON event_views;
CREATE POLICY views_upsert ON event_views FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS notif_own ON notifications;
CREATE POLICY notif_own ON notifications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS checkin_host ON event_checkins;
CREATE POLICY checkin_host ON event_checkins FOR ALL USING (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = event_id
      AND (
        e.organizer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = event_id
      AND (
        e.organizer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      )
  )
);

CREATE OR REPLACE FUNCTION increment_event_views(p_event_id BIGINT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v INT;
BEGIN
  INSERT INTO event_views (event_id, views, updated_at)
  VALUES (p_event_id, 1, NOW())
  ON CONFLICT (event_id) DO UPDATE
    SET views = event_views.views + 1, updated_at = NOW()
  RETURNING views INTO v;
  RETURN v;
END;
$$;
