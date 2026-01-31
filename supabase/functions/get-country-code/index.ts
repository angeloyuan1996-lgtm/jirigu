import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// In-memory rate limiting store (resets when function cold starts)
// For production, consider using Redis or database-backed rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limit configuration
const RATE_LIMIT_MAX_REQUESTS = 10; // Maximum requests per window
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour window

// In-memory cache for country codes (reduces external API calls)
const countryCache = new Map<string, { country: string | null; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours cache

function isRateLimited(ip: string): { limited: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  
  if (!entry || now >= entry.resetTime) {
    // New window or expired - reset counter
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { limited: false, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }
  
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    // Rate limit exceeded
    return { limited: true, remaining: 0, resetIn: entry.resetTime - now };
  }
  
  // Increment counter
  entry.count++;
  rateLimitStore.set(ip, entry);
  return { limited: false, remaining: RATE_LIMIT_MAX_REQUESTS - entry.count, resetIn: entry.resetTime - now };
}

function getCachedCountry(ip: string): string | null | undefined {
  const cached = countryCache.get(ip);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.country;
  }
  // Clear expired entry
  if (cached) {
    countryCache.delete(ip);
  }
  return undefined; // undefined means not cached, null means cached as "unknown"
}

function setCachedCountry(ip: string, country: string | null): void {
  countryCache.set(ip, { country, expiresAt: Date.now() + CACHE_TTL_MS });
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the user's IP from headers (Supabase passes this)
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown'

    // Check rate limit
    const rateLimit = isRateLimited(clientIP);
    
    const rateLimitHeaders = {
      'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
      'X-RateLimit-Remaining': rateLimit.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(rateLimit.resetIn / 1000).toString(),
    };

    if (rateLimit.limited) {
      console.log('Rate limit exceeded for IP:', clientIP);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.', country: null }),
        { 
          headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' }, 
          status: 429 
        }
      )
    }

    // Check cache first
    const cachedCountry = getCachedCountry(clientIP);
    if (cachedCountry !== undefined) {
      console.log('Cache hit for IP:', clientIP, '-> Country:', cachedCountry);
      return new Response(
        JSON.stringify({ country: cachedCountry, cached: true }),
        { headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log('Detecting country for IP:', clientIP)

    // Call ipinfo.io API (free tier, no token required for basic usage)
    const response = await fetch(`https://ipinfo.io/${clientIP}/json`)
    
    if (!response.ok) {
      console.error('ipinfo.io API error:', response.status)
      // Cache the failure to avoid hammering the API
      setCachedCountry(clientIP, null);
      return new Response(
        JSON.stringify({ error: 'Failed to detect country', country: null }),
        { headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const data = await response.json()
    const countryCode = data.country || null

    console.log('Detected country:', countryCode)
    
    // Cache the result
    setCachedCountry(clientIP, countryCode);

    return new Response(
      JSON.stringify({ country: countryCode }),
      { headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error detecting country:', errorMessage)
    return new Response(
      JSON.stringify({ error: 'Service temporarily unavailable', country: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})