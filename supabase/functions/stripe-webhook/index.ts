import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  // Create Supabase admin client
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return new Response(
        JSON.stringify({ error: "No signature provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify webhook signature
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    let event: Stripe.Event;

    if (webhookSecret) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : "Unknown error";
        console.error("Webhook signature verification failed:", errMessage);
        return new Response(
          JSON.stringify({ error: "Webhook signature verification failed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // For testing without webhook secret
      event = JSON.parse(body);
    }

    console.log("Received Stripe event:", event.type);

    // Handle checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const userId = session.metadata?.user_id;
      const diamondAmount = parseInt(session.metadata?.diamond_amount || "100", 10);

      if (!userId) {
        console.error("No user_id in session metadata");
        return new Response(
          JSON.stringify({ error: "No user_id in metadata" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Adding ${diamondAmount} diamonds to user ${userId}`);

      // Update user's diamond balance
      const { data: profile, error: fetchError } = await supabaseAdmin
        .from("profiles")
        .select("diamonds")
        .eq("id", userId)
        .single();

      if (fetchError) {
        console.error("Error fetching profile:", fetchError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch user profile" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const newBalance = (profile?.diamonds || 0) + diamondAmount;

      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ diamonds: newBalance })
        .eq("id", userId);

      if (updateError) {
        console.error("Error updating diamonds:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update diamond balance" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Record the transaction
      const { error: transactionError } = await supabaseAdmin
        .from("diamond_transactions")
        .insert({
          user_id: userId,
          amount: diamondAmount,
          type: "purchase",
          description: `Purchased ${diamondAmount} diamonds via Stripe`,
        });

      if (transactionError) {
        console.error("Error recording transaction:", transactionError);
        // Don't fail the webhook, diamonds were already added
      }

      console.log(`Successfully added ${diamondAmount} diamonds to user ${userId}. New balance: ${newBalance}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
