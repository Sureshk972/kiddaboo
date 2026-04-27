// Kiddaboo Stripe Webhook Handler
// Handles subscription lifecycle events from Stripe

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log("Stripe event:", event.type);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const plan = session.metadata?.plan;
        const subscriptionType = session.metadata?.subscription_type || "joiner";

        if (!userId || !plan) break;

        // Get subscription details from Stripe
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        // Determine price from plan
        const priceCentsMap: Record<string, number> = {
          monthly: 799, annual: 7999,
          host_monthly: 799, host_annual: 7999,
        };

        await supabase.from("subscriptions").upsert(
          {
            user_id: userId,
            type: subscriptionType,
            plan,
            status: "active",
            price_cents: priceCentsMap[plan] || 799,
            started_at: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscription.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,type" }
        );

        console.log(`Subscription activated for user ${userId}, plan: ${plan}, type: ${subscriptionType}`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = subscription.metadata?.supabase_user_id;
        const subscriptionType = subscription.metadata?.subscription_type || "joiner";

        if (!userId) break;

        await supabase
          .from("subscriptions")
          .update({
            status: "active",
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("type", subscriptionType);

        console.log(`Subscription renewed for user ${userId}, type: ${subscriptionType}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = subscription.metadata?.supabase_user_id;
        const subscriptionType = subscription.metadata?.subscription_type || "joiner";

        if (!userId) break;

        await supabase
          .from("subscriptions")
          .update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("type", subscriptionType);

        console.log(`Payment failed for user ${userId}, type: ${subscriptionType}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        const subscriptionType = subscription.metadata?.subscription_type || "joiner";

        if (!userId) break;

        await supabase
          .from("subscriptions")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("type", subscriptionType);

        console.log(`Subscription cancelled for user ${userId}, type: ${subscriptionType}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        const subscriptionType = subscription.metadata?.subscription_type || "joiner";

        if (!userId) break;

        const status = subscription.cancel_at_period_end ? "cancelled" : "active";

        await supabase
          .from("subscriptions")
          .update({
            status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancelled_at: subscription.cancel_at_period_end
              ? new Date().toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("type", subscriptionType);

        console.log(`Subscription updated for user ${userId}, type: ${subscriptionType}, status: ${status}`);
        break;
      }
    }
  } catch (err) {
    console.error("Error processing webhook:", err);
    return new Response(`Webhook handler error: ${err.message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
