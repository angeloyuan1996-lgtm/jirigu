-- Update function to sort by country_code alphabetically when scores are equal
DROP FUNCTION IF EXISTS public.get_country_leaderboard();

CREATE FUNCTION public.get_country_leaderboard()
RETURNS TABLE (country_code TEXT, total_completions BIGINT)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT 
    country_code,
    total_completions
  FROM public.country_leaderboard_cache
  ORDER BY total_completions DESC, country_code ASC;
$$;