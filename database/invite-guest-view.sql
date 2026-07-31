-- Invite guest view: gift registry + optional "who's coming" list
-- Run in Supabase → SQL Editor (safe to re-run).
-- Host controls live in planning_data.settings:
--   showGiftRegistryOnInvite (default true)
--   guestsCanSeeWhosComing (default false)

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
  e_planning JSONB;
  host_name TEXT;
  show_gifts BOOLEAN;
  show_whos BOOLEAN;
  gifts_json JSONB;
  votes_json JSONB;
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
    organizer_id,
    COALESCE(planning_data, '{}'::jsonb)
  INTO
    e_id, e_title, e_description, e_category, e_date, e_time, e_location,
    e_venue, e_image, e_visibility, e_is_free, e_price, e_share, e_organizer,
    e_planning
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

  -- Defaults: gifts ON, who's coming OFF (host can enable)
  show_gifts := CASE
    WHEN e_planning #>> '{settings,showGiftRegistryOnInvite}' IS NULL THEN true
    WHEN lower(e_planning #>> '{settings,showGiftRegistryOnInvite}') IN ('false', '0', 'f', 'no') THEN false
    ELSE true
  END;
  show_whos := CASE
    WHEN e_planning #>> '{settings,guestsCanSeeWhosComing}' IS NULL THEN false
    WHEN lower(e_planning #>> '{settings,guestsCanSeeWhosComing}') IN ('true', '1', 't', 'yes') THEN true
    ELSE false
  END;

  IF show_gifts THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', g->>'id',
        'name', COALESCE(g->>'name', 'Gift'),
        'url', COALESCE(g->>'url', ''),
        'price', COALESCE((g->>'price')::numeric, 0),
        'claimed', COALESCE((g->>'claimed')::boolean, false)
      )
      ORDER BY COALESCE(g->>'name', '')
    ), '[]'::jsonb)
    INTO gifts_json
    FROM jsonb_array_elements(COALESCE(e_planning->'gifts', '[]'::jsonb)) AS g
    WHERE NULLIF(trim(COALESCE(g->>'name', '')), '') IS NOT NULL;
  ELSE
    gifts_json := '[]'::jsonb;
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE status = 'going'),
    COUNT(*) FILTER (WHERE status = 'maybe'),
    COUNT(*) FILTER (WHERE status = 'not_going')
  INTO going_count, maybe_count, not_going_count
  FROM invite_rsvps
  WHERE event_id = e_id;

  IF show_whos THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'name', r.guest_name,
        'status', r.status
      )
      ORDER BY r.status, r.guest_name
    ), '[]'::jsonb)
    INTO votes_json
    FROM invite_rsvps r
    WHERE r.event_id = e_id;
  ELSE
    votes_json := '[]'::jsonb;
  END IF;

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
    'invite_options', jsonb_build_object(
      'showGiftRegistry', show_gifts,
      'guestsCanSeeWhosComing', show_whos
    ),
    'gifts', gifts_json,
    'votes', votes_json,
    'counts', CASE WHEN show_whos THEN jsonb_build_object(
      'going', going_count,
      'maybe', maybe_count,
      'not_going', not_going_count,
      'total', going_count + maybe_count + not_going_count
    ) ELSE jsonb_build_object(
      'going', 0,
      'maybe', 0,
      'not_going', 0,
      'total', 0
    ) END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_event(TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
