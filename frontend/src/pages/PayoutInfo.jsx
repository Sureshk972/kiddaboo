import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function PayoutInfo() {
  useDocumentTitle("How you get paid");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cream page-transition">
      <div data-safe-top className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm border-b border-cream-dark">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="w-8 h-8 rounded-full bg-white border border-cream-dark flex items-center justify-center cursor-pointer hover:border-sage-light transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="#5C5C5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="font-heading font-bold text-charcoal text-base">
            How you get paid
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-6">
        <p className="text-sm text-taupe-dark leading-relaxed mb-6">
          Kiddaboo uses Stripe to handle every payment. Here's exactly what
          happens, from the moment a parent books you to the moment money lands
          in your bank account.
        </p>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">
            1. Parent books a session
          </h2>
          <p className="text-sm text-taupe-dark leading-relaxed">
            When a parent picks one of your slots, their card is{" "}
            <strong>authorized</strong> for the full amount — but no money
            actually moves yet. The booking shows up in your Inbox as a pending
            request.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">
            2. You accept the request
          </h2>
          <p className="text-sm text-taupe-dark leading-relaxed">
            The instant you tap <strong>Accept</strong>, Stripe captures the
            parent's card and transfers your share into your Stripe balance.
            You receive your <strong>full posted rate</strong> — Kiddaboo's
            15% service fee is added on top and paid by the parent, not
            deducted from your share. Funds are in your account at that
            moment — you don't have to wait for the session to happen.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">
            3. Stripe pays out to your bank
          </h2>
          <p className="text-sm text-taupe-dark leading-relaxed mb-3">
            Stripe moves the money from your Stripe balance to your linked bank
            account on a rolling schedule. Default cadence depends on your
            country:
          </p>
          <ul className="text-sm text-taupe-dark leading-relaxed list-disc pl-5 space-y-1">
            <li>
              <strong>US:</strong> rolling 2 business days
            </li>
            <li>
              <strong>UK / EU:</strong> rolling 7 days
            </li>
            <li>
              <strong>Other regions:</strong> Stripe's local default
            </li>
          </ul>
          <p className="text-sm text-taupe-dark leading-relaxed mt-3">
            Your <strong>first payout</strong> is typically held 7–14 days
            while Stripe verifies your account. After that it settles into the
            rolling schedule.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">
            What you see in Earnings
          </h2>
          <ul className="text-sm text-taupe-dark leading-relaxed list-disc pl-5 space-y-1">
            <li>
              <strong>Earned (completed sessions)</strong> — total from
              sessions that have ended, at your full posted rate.
            </li>
            <li>
              <strong>Upcoming</strong> — already in your Stripe balance from
              bookings you've accepted; waiting on Stripe's payout schedule.
            </li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">
            Cancellations and refunds
          </h2>
          <p className="text-sm text-taupe-dark leading-relaxed">
            If a session is cancelled, Stripe refunds the parent and reverses
            the transfer from your balance automatically. If your balance is
            negative because you've already been paid out, Stripe pulls the
            shortfall from your next payout — no action needed from you.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">
            Changing your bank account or tax info
          </h2>
          <p className="text-sm text-taupe-dark leading-relaxed">
            Go to <strong>Earnings → Manage Stripe account</strong>. Stripe
            opens its dashboard where you can update your bank account, debit
            card, tax info (SSN, business details), or personal information.
            Changes take effect on your next payout.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">
            Where to get help
          </h2>
          <p className="text-sm text-taupe-dark leading-relaxed">
            Payout questions specific to your bank are best answered by Stripe
            directly — sign in from the Manage Stripe account link and use
            their support. For anything about a Kiddaboo booking, the service
            fee, or your account on our side, reach out at{" "}
            <a
              href="mailto:hello@kiddaboo.com"
              className="text-sage-dark underline"
            >
              hello@kiddaboo.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
