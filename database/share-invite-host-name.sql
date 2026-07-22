-- Patch: show host name on invite pages
-- Run in Supabase SQL Editor if you already ran share-invite-rsvp.sql earlier.

CREATE OR REPLACE FUNCTION public.get_invite_event(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e RECORD;
  host_name TEXT;
  going_count INT;
  maybe_count INT;
  not_going_count INT;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 8 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid invite link');
  END IF;

  SELECT * INTO e FROM events WHERE share_token = trim(p_token) LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invite link not found');
  END IF;

  SELECT COALESCE(NULLIF(trim(p.name), ''), split_part(COALESCE(p.email, ''), '@', 1), 'Host')
  INTO host_name
  FROM profiles p
  WHERE p.id = e.organizer_id;

  SELECT
    COUNT(*) FILTER (WHERE status = 'going'),
    COUNT(*) FILTER (WHERE status = 'maybe'),
    COUNT(*) FILTER (WHERE status = 'not_going')
  INTO going_count, maybe_count, not_going_count
  FROM invite_rsvps
  WHERE event_id = e.id;

  RETURN jsonb_build_object(
    'success', true,
    'event', jsonb_build_object(
      'id', e.id,
      'title', e.title,
      'description', e.description,
      'category', e.category,
      'date', e.date,
      'time', e.time,
      'location', e.location,
      'venue_name', COALESCE(e.venue_name, ''),
      'image', COALESCE(e.image, 'images/default-event.jpg'),
      'visibility', COALESCE(e.visibility, 'public'),
      'is_free', COALESCE(e.is_free, true),
      'price', COALESCE(e.price, 0),
      'share_token', e.share_token,
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

NOTIFY pgrst, 'reload schema';
