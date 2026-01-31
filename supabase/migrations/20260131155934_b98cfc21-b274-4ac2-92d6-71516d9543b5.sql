-- Fix: Restrict level_completions SELECT to authenticated users only
-- This prevents anonymous users from scraping completion data

DROP POLICY IF EXISTS "Anyone can view completions" ON public.level_completions;

CREATE POLICY "Authenticated users can view completions"
ON public.level_completions FOR SELECT
TO authenticated
USING (true);