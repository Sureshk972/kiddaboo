# Stripe Connect Setup — Nanny Pivot

This document lists the secrets and dashboard configuration required for the Nanny booking marketplace's payment flow. Suresh must set these in the Stripe dashboard and the Supabase project secrets before the booking edge functions can run successfully.

## Required Supabase Edge Function secrets

Set in **Supabase project `pdgtryghvibhmmroqvdk` → Edge Functions → Secrets**:

| Secret | Source | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe dashboard → API keys | Already exists. Confirm test mode key is set for staging. |
| `STRIPE_CONNECT_CLIENT_ID` | Stripe dashboard → Connect → Settings → Client ID | New for this pivot. Used for Express account links. |
| `STRIPE_WEBHOOK_ACCOUNT_SECRET` | Stripe dashboard → Webhooks → endpoint for `account.updated` | Fill after deploying `stripe-account-webhook`. |
| `STRIPE_WEBHOOK_BOOKINGS_SECRET` | Stripe dashboard → Webhooks → endpoint for booking PI events | Fill after deploying `stripe-webhook-bookings`. |
| `PLATFORM_FEE_BPS` | Manual | Basis points (e.g., `1500` for 15%). Final value TBD by Suresh. |
| `APP_URL` | Manual | Public URL used in Stripe return links (e.g., `https://kiddaboo.com`). |

## Stripe dashboard configuration

1. **Enable Connect** — Stripe Dashboard → Connect → Get started → Choose **Express** as the account type.
2. **Webhook endpoint A — account events**
   - Endpoint URL: `https://<supabase-project>.functions.supabase.co/stripe-account-webhook`
   - Events: `account.updated`
   - Copy signing secret → `STRIPE_WEBHOOK_ACCOUNT_SECRET`.
3. **Webhook endpoint B — booking PI events**
   - Endpoint URL: `https://<supabase-project>.functions.supabase.co/stripe-webhook-bookings`
   - Events: `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.refunded`
   - Copy signing secret → `STRIPE_WEBHOOK_BOOKINGS_SECRET`.

## Frontend env vars

Set in `frontend/.env` and `frontend/.env.local`:

| Var | Notes |
|---|---|
| `VITE_STRIPE_PUBLISHABLE_KEY` | Test mode publishable key for staging; live key for prod. |

## Verification checklist

After configuring:

- [ ] `supabase functions invoke stripe-connect-link` returns a URL (run after Nanny exists in DB)
- [ ] Visiting that URL completes the Stripe Express onboarding flow in test mode
- [ ] `account.updated` webhook flips `profiles.stripe_connect_charges_enabled` to true
- [ ] Test card `4242 4242 4242 4242` authorizes a PaymentIntent with `capture_method: 'manual'`

## Test cards

- Success: `4242 4242 4242 4242`
- Auth fail at request: `4000 0000 0000 0002`
- Auth ok, capture fails: `4000 0000 0000 9995`
- 3DS required: `4000 0027 6000 3184`

Any future date for expiry, any CVC.
