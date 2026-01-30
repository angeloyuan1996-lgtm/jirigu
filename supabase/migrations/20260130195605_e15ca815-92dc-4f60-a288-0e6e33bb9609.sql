-- Remove unused user_count column
ALTER TABLE public.country_leaderboard_cache DROP COLUMN user_count;

-- Update refresh function to not use user_count
CREATE OR REPLACE FUNCTION public.refresh_country_leaderboard_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.country_leaderboard_cache (country_code, total_completions, last_updated)
  SELECT 
    p.country_code,
    COUNT(lc.id) AS total_completions,
    now() AS last_updated
  FROM public.profiles p
  LEFT JOIN public.level_completions lc ON lc.user_id = p.id
  WHERE p.country_code IS NOT NULL
  GROUP BY p.country_code
  ON CONFLICT (country_code) 
  DO UPDATE SET 
    total_completions = country_leaderboard_cache.total_completions + EXCLUDED.total_completions,
    last_updated = now();
END;
$$;