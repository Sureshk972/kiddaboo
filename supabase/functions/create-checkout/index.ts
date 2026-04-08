// Kiddaboo Stripe Checkout Session Creator
// Creates a Stripe Checkout session for parent premium subscriptions

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") || "https://kiddaboo.com";

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Price lookup — we create products/prices on first use and cache the IDs
const PRICES: Record<string, { amount: number; interval: string; name: string; type: string }> = {
  monthly:      { amount: 799,  interval: "month", name: "Kiddaboo Premium Monthly",      type: "joiner" },
  annual:       { amount: 7999, interval: "year",  name: "Kiddaboo Premium Annual",       type: "joiner" },
  host_monthly: { amount: 499,  interval: "month", name: "Kiddaboo Host Premium Monthly", type: "host_premium" },
  host_annual:  { amount: 4999, interval: "year",  name: "Kiddaboo Host Premium Annual",  type: "host_premium" },
};

async function getOrCreatePrice(plan: string): Promise<string> {
  const config = PRICES[plan];
  if (!config) throw new Error("Invalid plan");

  // Search for existing price
  const prices = await stripe.prices.search({
    query: `metadata["kiddaboo_plan"]:"${plan}" active:"true"`,
  });

  if (prices.data.length > 0) {
    return prices.data[0].id;
  }

  // Create product and price
  const product = await stripe.products.create({
    name: config.name,
    metadata: { kiddaboo_plan: plan },
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: config.amount,
    currency: "usd",
    recurring: { interval: config.interval as "month" | "year" },
    metadata: { kiddaboo_plan: plan },
  });

  return price.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth failed:", authError?.message, "token length:", token.length);
      return new Response(
        JSON.stringify({ error: `Auth failed: ${authError?.message || "no user returned"}` }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { plan } = await req.json();
    if (!plan || !PRICES[plan]) {
      return new Response(
        JSON.stringify({ error: "Invalid plan. Use 'monthly', 'annual', 'host_monthly', or 'host_annual'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const planConfig = PRICES[plan];

    // For host plans, verify user is actually a host
    if (planConfig.type === "host_premium") {
      const { data: hostCheck } = await supabase
        .from("memberships")
        .select("id")
        .eq("user_id", user.id)
        .eq("role", "creator")
        .limit(1);

      if (!hostCheck || hostCheck.length === 0) {
        return new Response(
          JSON.stringify({ error: "You must be a host to subscribe to Host Premium" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if user already has a Stripe customer ID
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    let customerId = existingSub?.stripe_customer_id;

    if (!customerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    // Get or create the price
    const priceId = await getOrCreatePrice(plan);

    // Determine success/cancel URLs based on subscription type
    const successPath = planConfig.type === "host_premium" ? "/host/premium" : "/premium";
    const cancelPath = successPath;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${SITE_URL}${successPath}?success=true`,
      cancel_url: `${SITE_URL}${cancelPath}?cancelled=true`,
      metadata: {
        supabase_user_id: user.id,
        plan,
        subscription_type: planConfig.type,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan,
          subscription_type: planConfig.type,
        },
      },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Checkout error:", err.message, err.stack || err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to create checkout session" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
