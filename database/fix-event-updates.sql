-- FIX EVENT UPDATES (run once in Supabase → SQL Editor)
-- Makes Public / Private / Invite Only and all host edits save reliably.

-- 1) Ensure visibility column exists
ALTER TABLE events ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';

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

-- 2) RLS: host can always UPDATE their own events (including visibility changes)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_update" ON events;
DROP POLICY IF EXISTS "events_update_own" ON events;
DROP POLICY IF EXISTS "Enable update for users based on organizer_id" ON events;

CREATE POLICY "events_update" ON events
FOR UPDATE
TO authenticated
USING (
  auth.uid() = organizer_id
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
)
WITH CHECK (
  auth.uid() = organizer_id
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Keep SELECT usable for hosts after switching to private
DROP POLICY IF EXISTS "events_select" ON events;
CREATE POLICY "events_select" ON events
FOR SELECT
USING (
  COALESCE(visibility, 'public') = 'public'
  OR auth.uid() = organizer_id
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
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

-- 3) Reliable update function (bypasses RLS edge-cases; still checks organizer)
CREATE OR REPLACE FUNCTION public.save_my_event(p_id bigint, p_patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.events%ROWTYPE;
  v_vis text;
  v_title text;
  v_description text;
  v_category text;
  v_location text;
  v_image text;
  v_price numeric;
  v_date date;
  v_time time;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row FROM public.events WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF v_row.organizer_id IS DISTINCT FROM v_uid
     AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid AND role = 'admin') THEN
    RAISE EXCEPTION 'Not allowed to update this event';
  END IF;

  v_vis := COALESCE(NULLIF(trim(p_patch->>'visibility'), ''), v_row.visibility, 'public');
  IF v_vis NOT IN ('public', 'private', 'invite_only') THEN
    v_vis := 'public';
  END IF;

  v_title := COALESCE(NULLIF(trim(p_patch->>'title'), ''), v_row.title);
  v_description := COALESCE(p_patch->>'description', v_row.description);
  v_category := COALESCE(NULLIF(trim(p_patch->>'category'), ''), v_row.category);
  v_location := COALESCE(NULLIF(trim(p_patch->>'location'), ''), v_row.location);
  v_image := COALESCE(NULLIF(trim(p_patch->>'image'), ''), v_row.image);
  v_price := COALESCE((p_patch->>'price')::numeric, v_row.price, 0);

  BEGIN
    v_date := COALESCE((p_patch->>'date')::date, v_row.date);
  EXCEPTION WHEN others THEN
    v_date := v_row.date;
  END;

  BEGIN
    v_time := COALESCE((p_patch->>'time')::time, v_row.time);
  EXCEPTION WHEN others THEN
    v_time := v_row.time;
  END;

  UPDATE public.events SET
    title = v_title,
    description = v_description,
    category = v_category,
    date = v_date,
    time = v_time,
    location = v_location,
    price = v_price,
    visibility = v_vis,
    image = v_image
  WHERE id = p_id
  RETURNING * INTO v_row;

  -- Optional is_free (ignore if column missing)
  BEGIN
    IF p_patch ? 'is_free' THEN
      UPDATE public.events
      SET is_free = COALESCE((p_patch->>'is_free')::boolean, false)
      WHERE id = p_id
      RETURNING * INTO v_row;
    END IF;
  EXCEPTION WHEN undefined_column THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'title', v_row.title,
    'visibility', v_row.visibility,
    'share_token', v_row.share_token,
    'location', v_row.location,
    'category', v_row.category,
    'date', v_row.date,
    'time', v_row.time,
    'description', v_row.description,
    'price', v_row.price,
    'image', v_row.image,
    'organizer_id', v_row.organizer_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.save_my_event(bigint, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_my_event(bigint, jsonb) TO authenticated;

-- 4) Refresh view so listings include visibility
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

NOTIFY pgrst, 'reload schema';
