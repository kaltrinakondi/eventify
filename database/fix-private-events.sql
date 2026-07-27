-- Private events: only the organizer (host) can read them via the API.
-- Invite-only: host, admin, or logged-in user whose email is on the guest list.
-- Public: everyone.
-- Run in Supabase → SQL Editor.

-- 1) Table RLS
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

-- 2) View must use invoker rights so RLS on events applies
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

-- 3) Invite RPC: private events are host-only (no guest invite page)
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

  IF COALESCE(e_visibility, 'public') = 'private' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'This is a private event. Only the host can view it.'
    );
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
  e_visibility TEXT;
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

  SELECT id, COALESCE(visibility, 'public')
  INTO e_id, e_visibility
  FROM events
  WHERE share_token = trim(p_token)
  LIMIT 1;

  IF e_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invite link not found');
  END IF;

  IF e_visibility = 'private' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'This is a private event. Only the host can view it.'
    );
  END IF;

  v_key := nullif(trim(COALESCE(p_voter_key, '')), '');
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

  RETURN jsonb_build_object('success', true, 'message', 'RSVP saved', 'voter_key', v_key, 'status', v_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_event(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_invite_rsvp(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
