import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function PrivacyPolicy() {
  useDocumentTitle("Privacy Policy"); // #50
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cream page-transition">
      {/* Header */}
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
            Privacy Policy
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-6">
        <p className="text-xs text-taupe mb-6">Last updated: April 5, 2026</p>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">1. Information We Collect</h2>
          <p className="text-sm text-taupe-dark leading-relaxed mb-2">
            We collect the following information to provide and improve Kiddaboo:
          </p>
          <ul className="text-sm text-taupe-dark leading-relaxed list-disc pl-5 space-y-1">
            <li><strong>Account information:</strong> name, phone number, email address, profile photo</li>
            <li><strong>Booking notes:</strong> free-form notes you provide when requesting a Nanny (e.g. child details, preferences)</li>
            <li><strong>Nanny profile data:</strong> service area, availability, bio, photos, ratings</li>
            <li><strong>Booking data:</strong> booking requests, confirmations, cancellations, payment records</li>
            <li><strong>Device information:</strong> push notification tokens, browser type</li>
            <li><strong>Location data:</strong> only when you use the "Near Me" feature (not stored permanently)</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">2. How We Use Your Information</h2>
          <ul className="text-sm text-taupe-dark leading-relaxed list-disc pl-5 space-y-1">
            <li>Create and manage your account</li>
            <li>Connect parents with available Nannies</li>
            <li>Send notifications about booking activity (requests, acceptances, cancellations, ratings)</li>
            <li>Display Nanny locations and service areas on maps</li>
            <li>Process payments and payouts via Stripe</li>
            <li>Process reports and maintain community safety</li>
            <li>Improve the App's features and user experience</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">3. Children's Privacy</h2>
          <p className="text-sm text-taupe-dark leading-relaxed">
            Kiddaboo takes children's privacy seriously. We do not store child profiles. Any details about your children (name, age, allergies, preferences) are provided only in the free-form note field when making a booking request, and are shared solely with the Nanny you are booking. Children cannot create accounts or use the App directly.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">4. Information Sharing</h2>
          <p className="text-sm text-taupe-dark leading-relaxed mb-2">
            We do not sell your personal information. We share information only in these circumstances:
          </p>
          <ul className="text-sm text-taupe-dark leading-relaxed list-disc pl-5 space-y-1">
            <li><strong>With other users:</strong> Your public profile and ratings are visible to other users. Booking notes are shared only with the Nanny you book.</li>
            <li><strong>Payment processors:</strong> We use Stripe for payment processing. Stripe's privacy policy governs their handling of your payment data.</li>
            <li><strong>Service providers:</strong> We use Supabase for data storage and authentication</li>
            <li><strong>Legal requirements:</strong> We may disclose information if required by law or to protect safety</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">5. Data Storage & Security</h2>
          <p className="text-sm text-taupe-dark leading-relaxed">
            Your data is stored securely using Supabase with row-level security policies. We use encryption in transit (HTTPS) and implement access controls to protect your information. While we strive to protect your data, no method of transmission over the internet is 100% secure.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">6. Your Rights</h2>
          <p className="text-sm text-taupe-dark leading-relaxed mb-2">
            You have the right to:
          </p>
          <ul className="text-sm text-taupe-dark leading-relaxed list-disc pl-5 space-y-1">
            <li><strong>Access</strong> your personal data through your profile</li>
            <li><strong>Update</strong> your information at any time via Edit Profile</li>
            <li><strong>Delete</strong> your account and associated data</li>
            <li><strong>Control</strong> notification preferences</li>
            <li><strong>Block</strong> other users from contacting you</li>
            <li><strong>Report</strong> inappropriate content or behavior</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">7. Data Retention</h2>
          {/* TODO: legal review */}
          <p className="text-sm text-taupe-dark leading-relaxed">
            We retain your data for as long as your account is active. When you delete your account, we remove your personal information and profile. Booking records may be retained for a limited period as required for financial and legal compliance.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">8. Push Notifications</h2>
          <p className="text-sm text-taupe-dark leading-relaxed">
            We send push notifications for booking activity such as new booking requests, acceptances, cancellations, and rating prompts. You can control which notifications you receive in your Notification Settings, or disable them entirely. We store your push subscription token securely and only use it for app notifications.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">9. Cookies & Local Storage</h2>
          <p className="text-sm text-taupe-dark leading-relaxed">
            Kiddaboo uses browser local storage for authentication tokens and session data. We do not use third-party tracking cookies or analytics services.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">10. Changes to This Policy</h2>
          <p className="text-sm text-taupe-dark leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of significant changes through the App. Continued use after updates constitutes acceptance of the revised policy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">11. Contact Us</h2>
          <p className="text-sm text-taupe-dark leading-relaxed">
            If you have questions about this Privacy Policy or your data, please contact us at <a href="mailto:support@kiddaboo.com" className="underline text-sage-dark hover:text-sage">support@kiddaboo.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
