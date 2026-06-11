import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function PaymentInfo() {
  useDocumentTitle("How payments work");
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
            How payments work
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-6">
        <p className="text-sm text-taupe-dark leading-relaxed mb-6">
          Kiddaboo uses Stripe for every payment. Your card details never
          touch our servers — they go straight from your device to Stripe.
          Here's exactly what happens, from the moment you request a session
          to the moment the nanny gets paid.
        </p>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">
            1. You request a session
          </h2>
          <p className="text-sm text-taupe-dark leading-relaxed">
            You pick a nanny's slot, enter your card, and tap{" "}
            <strong>Request</strong>. At this moment Stripe places an{" "}
            <strong>authorization hold</strong> on your card for the full
            amount. No money has actually moved — your bank just sets aside
            that amount so it's available if the nanny accepts. If your card
            requires 3D Secure (most non-US cards do), Stripe will step you
            through the bank challenge before the hold is placed.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">
            2. The nanny accepts (or declines)
          </h2>
          <p className="text-sm text-taupe-dark leading-relaxed">
            If the nanny accepts, your card is <strong>charged</strong> right
            then and the nanny's share is transferred to their Stripe
            balance. If the nanny declines or doesn't respond before the
            request expires, the authorization hold is released — typically
            within minutes, sometimes up to 7 days depending on your bank.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">
            What you pay
          </h2>
          <ul className="text-sm text-taupe-dark leading-relaxed list-disc pl-5 space-y-1">
            <li>
              <strong>Session rate</strong> — the nanny's hourly rate × hours
              booked.
            </li>
            <li>
              <strong>Kiddaboo service fee</strong> — a small flat percentage
              that keeps the platform running. Always shown to you on the
              booking screen before you tap Request.
            </li>
          </ul>
          <p className="text-sm text-taupe-dark leading-relaxed mt-3">
            Your total is the sum of the two. There are no hidden charges
            after the fact and no recurring subscription — you only pay when
            you book.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">
            Cancellations and refunds
          </h2>
          <ul className="text-sm text-taupe-dark leading-relaxed list-disc pl-5 space-y-1">
            <li>
              <strong>Cancel before nanny accepts:</strong> nothing was
              charged, so nothing to refund — the hold is released.
            </li>
            <li>
              <strong>Cancel after nanny accepts:</strong> Stripe refunds the
              full amount back to your original card and reverses the
              transfer from the nanny's balance. Refunds usually appear in
              5–10 business days, depending on your bank.
            </li>
            <li>
              <strong>Nanny cancels:</strong> full refund, same path.
            </li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">
            Using a different card next time
          </h2>
          <p className="text-sm text-taupe-dark leading-relaxed">
            Kiddaboo doesn't store cards on file — every booking screen lets
            you enter a fresh card (or use Apple Pay / Google Pay where
            supported). To switch payment methods, just enter the new card
            on your next booking.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">
            Security
          </h2>
          <p className="text-sm text-taupe-dark leading-relaxed">
            Card details are collected by Stripe Elements directly in your
            browser and sent over an encrypted connection to Stripe. Kiddaboo
            never sees or stores your card number, CVV, or expiry date —
            we only ever see a token Stripe gives us. Stripe is{" "}
            <a
              href="https://stripe.com/docs/security/stripe"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sage-dark underline"
            >
              PCI DSS Level 1 certified
            </a>
            , the highest tier of payment-card security.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">
            Receipts and statements
          </h2>
          <p className="text-sm text-taupe-dark leading-relaxed">
            On your bank statement, charges appear as{" "}
            <strong>KIDDABOO</strong>. If you need a receipt for a specific
            session, reach out at{" "}
            <a
              href="mailto:hello@kiddaboo.com"
              className="text-sage-dark underline"
            >
              hello@kiddaboo.com
            </a>{" "}
            and we'll send one.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">
            Disputes and chargebacks
          </h2>
          <p className="text-sm text-taupe-dark leading-relaxed">
            If something went wrong with a session, please reach out to us
            first — most issues are resolved within a day. Filing a
            chargeback directly with your bank is also your right; in that
            case Stripe handles the dispute process on Kiddaboo's behalf.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">
            Where to get help
          </h2>
          <p className="text-sm text-taupe-dark leading-relaxed">
            For anything about a booking, a refund, or a receipt, email{" "}
            <a
              href="mailto:hello@kiddaboo.com"
              className="text-sage-dark underline"
            >
              hello@kiddaboo.com
            </a>
            . For card-issuing questions (why a charge was declined, when a
            hold will release, fraud holds, etc.), your card issuer is the
            authoritative source.
          </p>
        </section>
      </div>
    </div>
  );
}
