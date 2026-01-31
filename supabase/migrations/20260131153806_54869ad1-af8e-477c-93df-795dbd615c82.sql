-- Fix MISSING_RLS_PROTECTION: Add explicit RLS policies to deny write operations on leaderboard cache
-- Only the refresh function (SECURITY DEFINER) should be able to modify this table

-- Deny all INSERT operations from regular users
CREATE POLICY "No direct inserts to leaderboard cache"
ON public.country_leaderboard_cache FOR INSERT
TO authenticated, anon
WITH CHECK (false);

-- Deny all UPDATE operations from regular users
CREATE POLICY "No direct updates to leaderboard cache"
ON public.country_leaderboard_cache FOR UPDATE
TO authenticated, anon
USING (false)
WITH CHECK (false);

-- Deny all DELETE operations from regular users
CREATE POLICY "No direct deletes from leaderboard cache"
ON public.country_leaderboard_cache FOR DELETE
TO authenticated, anon
USING (false);

-- Add comment explaining the security model
COMMENT ON TABLE public.country_leaderboard_cache IS 
'Leaderboard cache table. Read-only for all users. Updates are performed only by the refresh_country_leaderboard_cache() SECURITY DEFINER function which runs with elevated privileges.';