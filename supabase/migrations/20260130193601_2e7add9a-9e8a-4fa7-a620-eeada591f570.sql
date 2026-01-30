-- Create cached leaderboard table
CREATE TABLE public.country_leaderboard_cache (
  country_code TEXT PRIMARY KEY,
  total_completions BIGINT NOT NULL DEFAULT 0,
  user_count BIGINT NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (public read access)
ALTER TABLE public.country_leaderboard_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view leaderboard cache"
ON public.country_leaderboard_cache
FOR SELECT
USING (true);

-- Insert initial seed data (smaller countries get smaller values)
INSERT INTO public.country_leaderboard_cache (country_code, total_completions, user_count) VALUES
('CN', 98432, 12453),
('IN', 87654, 10234),
('US', 76543, 8765),
('ID', 54321, 6543),
('BR', 48765, 5432),
('PK', 43210, 4321),
('NG', 38765, 3876),
('BD', 34567, 3456),
('RU', 32109, 3210),
('MX', 28765, 2876),
('JP', 26543, 2654),
('PH', 24321, 2432),
('VN', 22109, 2210),
('DE', 19876, 1987),
('TR', 18765, 1876),
('FR', 17654, 1765),
('GB', 16543, 1654),
('IT', 15432, 1543),
('TH', 14321, 1432),
('ZA', 13210, 1321),
('KR', 12109, 1210),
('ES', 11098, 1109),
('CO', 10987, 1098),
('UA', 9876, 987),
('AR', 8765, 876),
('PL', 7654, 765),
('CA', 6543, 654),
('MY', 5432, 543),
('AU', 4321, 432),
('TW', 3210, 321),
('NL', 2987, 298),
('SA', 2765, 276),
('CL', 2543, 254),
('PE', 2321, 232),
('BE', 2109, 210),
('GR', 1987, 198),
('CZ', 1876, 187),
('PT', 1765, 176),
('SE', 1654, 165),
('HU', 1543, 154),
('AT', 1432, 143),
('IL', 1321, 132),
('CH', 1210, 121),
('SG', 1098, 109),
('HK', 987, 98),
('DK', 876, 87),
('FI', 765, 76),
('NO', 654, 65),
('NZ', 543, 54),
('IE', 432, 43);

-- Update the get_country_leaderboard function to read from cache
CREATE OR REPLACE FUNCTION public.get_country_leaderboard()
RETURNS TABLE (country_code TEXT, total_completions BIGINT, user_count BIGINT)
LANGUAGE sql STABLE
AS $$
  SELECT 
    country_code,
    total_completions,
    user_count
  FROM public.country_leaderboard_cache
  ORDER BY total_completions DESC;
$$;

-- Create function to refresh cache with real data (to be called by cron job)
CREATE OR REPLACE FUNCTION public.refresh_country_leaderboard_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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