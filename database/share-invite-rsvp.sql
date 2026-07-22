-- Eventify: Shareable invite link + RSVP votes (Coming / Maybe / Not coming)
-- Run once in Supabase → SQL Editor → New query → Paste all → Run
-- Safe to run more than once.

ALTER TABLE events ADD COLUMN IF NOT EXISTS share_token TEXT;

-- Optional planning columns (ignore if already present)
ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_name TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS events_share_token_uidx
  ON events (share_token)
  WHERE share_token IS NOT NULL;

UPDATE events
SET share_token = encode(gen_random_bytes(12), 'hex')
WHERE share_token IS NULL OR share_token = '';

CREATE TABLE IF NOT EXISTS invite_rsvps (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('going', 'maybe', 'not_going')),
  voter_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, voter_key)
);

CREATE INDEX IF NOT EXISTS invite_rsvps_event_id_idx ON invite_rsvps (event_id);

ALTER TABLE invite_rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invite_rsvps_select_organizer" ON invite_rsvps;
CREATE POLICY "invite_rsvps_select_organizer" ON invite_rsvps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = invite_rsvps.event_id
        AND (e.organizer_id = auth.uid()
          OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    )
  );

CREATE OR REPLACE FUNCTION public.get_invite_event(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e_id BIGINT;
  e_title TEXT;
  e_description TEXT;
  e_category TEXT;
  e_date DATE;
  e_time TIME;
  e_location TEXT;
  e_venue TEXT;
  e_image TEXT;
  e_visibility TEXT;
  e_is_free BOOLEAN;
  e_price NUMERIC;
  e_share TEXT;
  e_organizer UUID;
  host_name TEXT;
  going_count INT;
  maybe_count INT;
  not_going_count INT;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 8 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid invite link');
  END IF;

  SELECT
    id, title, description, category, date, time, location,
    COALESCE(venue_name, ''),
    COALESCE(image, 'images/default-event.jpg'),
    COALESCE(visibility, 'public'),
    COALESCE(is_free, true),
    COALESCE(price, 0),
    share_token,
    organizer_id
  INTO
    e_id, e_title, e_description, e_category, e_date, e_time, e_location,
    e_venue, e_image, e_visibility, e_is_free, e_price, e_share, e_organizer
  FROM events
  WHERE share_token = trim(p_token)
  LIMIT 1;

  IF e_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invite link not found');
  END IF;

  SELECT COALESCE(NULLIF(trim(p.name), ''), split_part(COALESCE(p.email, ''), '@', 1), 'Host')
  INTO host_name
  FROM profiles p
  WHERE p.id = e_organizer;

  SELECT
    COUNT(*) FILTER (WHERE status = 'going'),
    COUNT(*) FILTER (WHERE status = 'maybe'),
    COUNT(*) FILTER (WHERE status = 'not_going')
  INTO going_count, maybe_count, not_going_count
  FROM invite_rsvps
  WHERE event_id = e_id;

  RETURN jsonb_build_object(
    'success', true,
    'event', jsonb_build_object(
      'id', e_id,
      'title', e_title,
      'description', e_description,
      'category', e_category,
      'date', e_date,
      'time', e_time,
      'location', e_location,
      'venue_name', COALESCE(e_venue, ''),
      'image', COALESCE(e_image, 'images/default-event.jpg'),
      'visibility', COALESCE(e_visibility, 'public'),
      'is_free', COALESCE(e_is_free, true),
      'price', COALESCE(e_price, 0),
      'share_token', e_share,
      'organizer_name', COALESCE(host_name, 'Host'),
      'host_name', COALESCE(host_name, 'Host')
    ),
    'counts', jsonb_build_object(
      'going', going_count,
      'maybe', maybe_count,
      'not_going', not_going_count
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_invite_rsvp(
  p_token TEXT,
  p_name TEXT,
  p_email TEXT DEFAULT '',
  p_status TEXT DEFAULT 'going',
  p_voter_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e_id BIGINT;
  v_key TEXT;
  v_status TEXT;
  v_name TEXT;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 8 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid invite link');
  END IF;

  v_name := trim(COALESCE(p_name, ''));
  IF v_name = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Please enter your name');
  END IF;

  v_status := lower(trim(COALESCE(p_status, '')));
  IF v_status NOT IN ('going', 'maybe', 'not_going') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Choose Coming, Maybe, or Not coming');
  END IF;

  SELECT id INTO e_id FROM events WHERE share_token = trim(p_token) LIMIT 1;
  IF e_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invite link not found');
  END IF;

  v_key := NULLIF(trim(COALESCE(p_voter_key, '')), '');
  IF v_key IS NULL THEN
    v_key := encode(gen_random_bytes(16), 'hex');
  END IF;

  INSERT INTO invite_rsvps (event_id, guest_name, guest_email, status, voter_key, updated_at)
  VALUES (e_id, v_name, trim(COALESCE(p_email, '')), v_status, v_key, NOW())
  ON CONFLICT (event_id, voter_key) DO UPDATE
    SET guest_name = EXCLUDED.guest_name,
        guest_email = EXCLUDED.guest_email,
        status = EXCLUDED.status,
        updated_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'message', CASE v_status
      WHEN 'going' THEN 'Marked as Coming — thanks!'
      WHEN 'maybe' THEN 'Marked as Maybe — thanks!'
      ELSE 'Marked as Not coming — thanks!'
    END,
    'status', v_status,
    'voter_key', v_key
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_organizer_invite_rsvps(p_event_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_owner BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = p_event_id
      AND (
        e.organizer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      )
  ) INTO is_owner;

  IF NOT COALESCE(is_owner, false) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authorized', 'votes', '[]'::jsonb, 'counts', '{}'::jsonb);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'votes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', r.id,
        'guest_name', r.guest_name,
        'guest_email', r.guest_email,
        'status', r.status,
        'updated_at', r.updated_at
      ) ORDER BY r.updated_at DESC)
      FROM invite_rsvps r
      WHERE r.event_id = p_event_id
    ), '[]'::jsonb),
    'counts', (
      SELECT jsonb_build_object(
        'going', COUNT(*) FILTER (WHERE status = 'going'),
        'maybe', COUNT(*) FILTER (WHERE status = 'maybe'),
        'not_going', COUNT(*) FILTER (WHERE status = 'not_going'),
        'total', COUNT(*)
      )
      FROM invite_rsvps
      WHERE event_id = p_event_id
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_event(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_invite_rsvp(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_organizer_invite_rsvps(BIGINT) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE invite_rsvps TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE invite_rsvps_id_seq TO authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Recreate view so e.* includes share_token
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
