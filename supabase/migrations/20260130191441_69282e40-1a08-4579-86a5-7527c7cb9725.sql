-- Create a function to get country leaderboard (total completions by country)
CREATE OR REPLACE FUNCTION public.get_country_leaderboard()
RETURNS TABLE (
  country_code TEXT,
  total_completions BIGINT,
  user_count BIGINT
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.country_code,
    COUNT(lc.id) AS total_completions,
    COUNT(DISTINCT p.id) AS user_count
  FROM public.profiles p
  LEFT JOIN public.level_completions lc ON lc.user_id = p.id
  WHERE p.country_code IS NOT NULL
  GROUP BY p.country_code
  ORDER BY total_completions DESC
$$;