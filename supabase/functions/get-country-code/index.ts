import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    console.log('Detecting country for IP:', clientIP)

    // Call ipinfo.io API (free tier, no token required for basic usage)
    const response = await fetch(`https://ipinfo.io/${clientIP}/json`)
    
    if (!response.ok) {
      console.error('ipinfo.io API error:', response.status)
      return new Response(
        JSON.stringify({ error: 'Failed to detect country', country: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const data = await response.json()
    const countryCode = data.country || null

    console.log('Detected country:', countryCode)

    return new Response(
      JSON.stringify({ country: countryCode }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error detecting country:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage, country: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
