// Kiddaboo Stripe Webhook Handler
// Handles subscription lifecycle events from Stripe

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { withSentry, captureException } from "../_shared/sentry.ts";
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

serve(withSentry("stripe-webhook", async (req) => {
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

  console.log("Stripe event:", event.type, event.id);

  // Whitelist of plan values that pass the DB CHECK constraint on
  // subscriptions.plan. An unknown plan (e.g. an event from before the
  // current pricing scheme, or a manually-created Stripe subscription)
  // must be skipped here — letting it through would trip the CHECK and
  // throw, returning 500 and triggering Stripe retries that can't ever
  // succeed.
  const KNOWN_PLANS = new Set(["monthly", "annual", "host_monthly", "host_annual"]);

  // Skip non-retriable bad-data cases with 200 so Stripe stops retrying.
  // Reserve 500 for transient DB/network failures Stripe should retry.
  const skip = (reason: string) => {
    console.warn(`stripe-webhook skipping ${event.type} ${event.id}: ${reason}`);
    return new Response(JSON.stringify({ received: true, skipped: reason }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const plan = session.metadata?.plan;
        const subscriptionType = session.metadata?.subscription_type || "joiner";

        if (!userId) return skip("missing supabase_user_id metadata");
        if (!plan) return skip("missing plan metadata");
        if (!KNOWN_PLANS.has(plan)) return skip(`unknown plan: ${plan}`);
        if (!session.subscription) return skip("session has no subscription (one-time payment?)");

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        const priceCentsMap: Record<string, number> = {
          monthly: 500, annual: 5000,
        };

        const { error: dbErr } = await supabase.from("subscriptions").upsert(
          {
            user_id: userId,
            type: subscriptionType,
            plan,
            status: "active",
            price_cents: priceCentsMap[plan] || 500,
            started_at: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscription.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,type" }
        );
        if (dbErr) throw dbErr;

        console.log(`Subscription activated for user ${userId}, plan: ${plan}, type: ${subscriptionType}`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string | null;

        if (!subscriptionId) return skip("invoice has no subscription");

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = subscription.metadata?.supabase_user_id;
        const subscriptionType = subscription.metadata?.subscription_type || "joiner";

        if (!userId) return skip("subscription missing supabase_user_id metadata");

        const { error: dbErr } = await supabase
          .from("subscriptions")
          .update({
            status: "active",
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("type", subscriptionType);
        if (dbErr) throw dbErr;

        console.log(`Subscription renewed for user ${userId}, type: ${subscriptionType}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string | null;

        if (!subscriptionId) return skip("invoice has no subscription");

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = subscription.metadata?.supabase_user_id;
        const subscriptionType = subscription.metadata?.subscription_type || "joiner";

        if (!userId) return skip("subscription missing supabase_user_id metadata");

        const { error: dbErr } = await supabase
          .from("subscriptions")
          .update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("type", subscriptionType);
        if (dbErr) throw dbErr;

        console.log(`Payment failed for user ${userId}, type: ${subscriptionType}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        const subscriptionType = subscription.metadata?.subscription_type || "joiner";

        if (!userId) return skip("subscription missing supabase_user_id metadata");

        const { error: dbErr } = await supabase
          .from("subscriptions")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("type", subscriptionType);
        if (dbErr) throw dbErr;

        console.log(`Subscription cancelled for user ${userId}, type: ${subscriptionType}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        const subscriptionType = subscription.metadata?.subscription_type || "joiner";

        if (!userId) return skip("subscription missing supabase_user_id metadata");

        const status = subscription.cancel_at_period_end ? "cancelled" : "active";

        const { error: dbErr } = await supabase
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
        if (dbErr) throw dbErr;

        console.log(`Subscription updated for user ${userId}, type: ${subscriptionType}, status: ${status}`);
        break;
      }

      default:
        // Stripe sends many event types we don't care about (e.g.
        // payment_intent.*, customer.*). Acknowledge them so Stripe
        // stops retrying.
        console.log(`stripe-webhook: ignoring ${event.type}`);
    }
  } catch (err) {
    // Transient DB/network failure — return 500 so Stripe retries.
    // Bad-data cases were already filtered above with skip()+200.
    console.error("Error processing webhook:", event.type, event.id, err);
    await captureException(err, "stripe-webhook");
    return new Response(`Webhook handler error: ${err.message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}));
