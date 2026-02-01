import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !data.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = data.user;
    console.log(`[verify-payment] Checking payments for user ${user.id} (${user.email})`);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find checkout sessions for this user that haven't been processed
    const sessions = await stripe.checkout.sessions.list({
      limit: 10,
    });

    let diamondsAdded = 0;
    const processedSessions: string[] = [];

    for (const session of sessions.data) {
      // Check if this session belongs to this user and is paid
      if (
        session.metadata?.user_id === user.id &&
        session.payment_status === "paid" &&
        session.status === "complete"
      ) {
        const sessionId = session.id;
        const diamondAmount = parseInt(session.metadata?.diamond_amount || "100", 10);

        // Check if this session was already processed (by checking transactions)
        const { data: existingTx } = await supabaseAdmin
          .from("diamond_transactions")
          .select("id")
          .eq("user_id", user.id)
          .eq("description", `Stripe session: ${sessionId}`)
          .maybeSingle();

        if (existingTx) {
          console.log(`[verify-payment] Session ${sessionId} already processed`);
          continue;
        }

        console.log(`[verify-payment] Processing session ${sessionId}, adding ${diamondAmount} diamonds`);

        // Get current balance
        const { data: profile, error: fetchError } = await supabaseAdmin
          .from("profiles")
          .select("diamonds")
          .eq("id", user.id)
          .single();

        if (fetchError) {
          console.error("[verify-payment] Error fetching profile:", fetchError);
          continue;
        }

        const newBalance = (profile?.diamonds || 0) + diamondAmount;

        // Update balance
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({ diamonds: newBalance })
          .eq("id", user.id);

        if (updateError) {
          console.error("[verify-payment] Error updating diamonds:", updateError);
          continue;
        }

        // Record transaction with session ID to prevent duplicates
        await supabaseAdmin
          .from("diamond_transactions")
          .insert({
            user_id: user.id,
            amount: diamondAmount,
            type: "purchase",
            description: `Stripe session: ${sessionId}`,
          });

        diamondsAdded += diamondAmount;
        processedSessions.push(sessionId);
        console.log(`[verify-payment] Successfully added ${diamondAmount} diamonds. New balance: ${newBalance}`);
      }
    }

    // Get final balance
    const { data: finalProfile } = await supabaseAdmin
      .from("profiles")
      .select("diamonds")
      .eq("id", user.id)
      .single();

    return new Response(
      JSON.stringify({ 
        success: true,
        diamonds_added: diamondsAdded,
        current_balance: finalProfile?.diamonds || 0,
        sessions_processed: processedSessions.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    console.error("[verify-payment] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
