-- Allow users to create their own profile row if the signup trigger missed it.
-- Fixes login ↔ dashboard loops when auth.users exists but profiles does not.

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

GRANT SELECT, INSERT, UPDATE ON TABLE profiles TO authenticated;

NOTIFY pgrst, 'reload schema';
