-- Fix search_path for get_country_leaderboard function
CREATE OR REPLACE FUNCTION public.get_country_leaderboard()
RETURNS TABLE (country_code TEXT, total_completions BIGINT, user_count BIGINT)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT 
    country_code,
    total_completions,
    user_count
  FROM public.country_leaderboard_cache
  ORDER BY total_completions DESC;
$$;

-- Fix search_path for refresh_country_leaderboard_cache function
CREATE OR REPLACE FUNCTION public.refresh_country_leaderboard_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update existing countries with real data
  INSERT INTO public.country_leaderboard_cache (country_code, total_completions, user_count, last_updated)
  SELECT 
    p.country_code,
    COUNT(lc.id) AS total_completions,
    COUNT(DISTINCT p.id) AS user_count,
    now() AS last_updated
  FROM public.profiles p
  LEFT JOIN public.level_completions lc ON lc.user_id = p.id
  WHERE p.country_code IS NOT NULL
  GROUP BY p.country_code
  ON CONFLICT (country_code) 
  DO UPDATE SET 
    total_completions = country_leaderboard_cache.total_completions + EXCLUDED.total_completions,
    user_count = country_leaderboard_cache.user_count + EXCLUDED.user_count,
    last_updated = now();
END;
$$;