-- Optional upgrade for Eventify feature pack
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, email)
);

CREATE TABLE IF NOT EXISTS event_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_views (
  event_id UUID PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  views INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
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
  EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND (e.organizer_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')))
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
CREATE POLICY notif_own ON notifications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS checkin_host ON event_checkins;
CREATE POLICY checkin_host ON event_checkins FOR ALL USING (
  EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND (e.organizer_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')))
) WITH CHECK (
  EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND (e.organizer_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')))
);

CREATE OR REPLACE FUNCTION increment_event_views(p_event_id UUID)
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
