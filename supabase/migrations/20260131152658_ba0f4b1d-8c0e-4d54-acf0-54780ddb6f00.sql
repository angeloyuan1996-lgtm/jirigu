-- Fix PUBLIC_DATA_EXPOSURE: Restrict profiles table to authenticated users only
-- This prevents anonymous scraping of user data while maintaining friend search functionality

-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- Create a new policy that only allows authenticated users to view profiles
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Add a comment explaining the security decision
COMMENT ON POLICY "Authenticated users can view profiles" ON public.profiles IS 
'Profiles are readable by authenticated users only to prevent anonymous scraping while supporting friend search and social features.';