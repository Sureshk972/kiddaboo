import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function TermsOfService() {
  useDocumentTitle("Terms of Service"); // #50
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cream page-transition">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm border-b border-cream-dark">
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
            Terms of Service
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-6">
        <p className="text-xs text-taupe mb-6">Last updated: April 5, 2026</p>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">1. Acceptance of Terms</h2>
          <p className="text-sm text-taupe-dark leading-relaxed">
            By accessing or using the Kiddaboo application ("App"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the App. Kiddaboo is intended for parents and caregivers to discover and organize playgroups for children.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">2. Eligibility</h2>
          <p className="text-sm text-taupe-dark leading-relaxed">
            You must be at least 18 years old to create an account on Kiddaboo. By using the App, you represent that you are a parent, legal guardian, or authorized caregiver of any children associated with your account.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">3. Account Responsibilities</h2>
          <p className="text-sm text-taupe-dark leading-relaxed">
            You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate, current, and complete information during registration and to update such information as needed.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">4. Playgroup Participation</h2>
          <p className="text-sm text-taupe-dark leading-relaxed">
            Kiddaboo facilitates connections between families for playgroup activities. We do not supervise, endorse, or guarantee the safety of any playgroup, host, or participant. Parents and caregivers are solely responsible for the supervision and safety of their children during all playgroup activities.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">5. User Conduct</h2>
          <p className="text-sm text-taupe-dark leading-relaxed mb-2">
            You agree not to:
          </p>
          <ul className="text-sm text-taupe-dark leading-relaxed list-disc pl-5 space-y-1">
            <li>Post false, misleading, or fraudulent information</li>
            <li>Harass, bully, or threaten other users</li>
            <li>Use the App for any unlawful purpose</li>
            <li>Create fake profiles or misrepresent your identity</li>
            <li>Share inappropriate, offensive, or harmful content</li>
            <li>Attempt to access other users' accounts</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">6. Content</h2>
          <p className="text-sm text-taupe-dark leading-relaxed">
            You retain ownership of content you post on Kiddaboo (photos, reviews, messages). By posting, you grant Kiddaboo a non-exclusive, royalty-free license to use, display, and distribute your content within the App. We may remove content that violates these terms.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">7. Reporting & Moderation</h2>
          <p className="text-sm text-taupe-dark leading-relaxed">
            Kiddaboo provides tools to report and block users. We review reports and may take action including warnings, content removal, or account suspension. We are not obligated to act on every report but will make reasonable efforts to maintain a safe community.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">8. Limitation of Liability</h2>
          <p className="text-sm text-taupe-dark leading-relaxed">
            Kiddaboo is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the App, interactions with other users, or participation in playgroup activities. You use the App at your own risk.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">9. Account Termination</h2>
          <p className="text-sm text-taupe-dark leading-relaxed">
            You may delete your account at any time through the App settings. We reserve the right to suspend or terminate accounts that violate these terms. Upon deletion, your personal data will be removed in accordance with our Privacy Policy.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">10. Changes to Terms</h2>
          <p className="text-sm text-taupe-dark leading-relaxed">
            We may update these Terms from time to time. Continued use of the App after changes constitutes acceptance of the updated terms. We will notify users of significant changes through the App.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">11. Contact</h2>
          <p className="text-sm text-taupe-dark leading-relaxed">
            If you have questions about these Terms, please contact us at support@kiddaboo.app.
          </p>
        </section>
      </div>
    </div>
  );
}
