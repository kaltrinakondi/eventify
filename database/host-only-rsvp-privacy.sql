-- Hide RSVP counts from public invite links (host-only visibility)
-- Run in Supabase SQL Editor

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

  -- Do NOT return RSVP names/counts here — only the host can see those
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
    )
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
