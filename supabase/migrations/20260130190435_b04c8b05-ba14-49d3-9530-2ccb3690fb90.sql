-- Add country_code column to profiles table for caching geolocation
ALTER TABLE public.profiles 
ADD COLUMN country_code TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.country_code IS 'ISO 3166-1 alpha-2 country code from IP geolocation, cached on first detection';