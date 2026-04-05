import { useNavigate } from "react-router-dom";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cream">
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
            <li><strong>Children's information:</strong> first names, age ranges (no exact birthdates)</li>
            <li><strong>Playgroup data:</strong> locations (zip code or address), schedules, photos, reviews</li>
            <li><strong>Messages:</strong> group chat messages within playgroups</li>
            <li><strong>Device information:</strong> push notification tokens, browser type</li>
            <li><strong>Location data:</strong> only when you use the "Near Me" feature (not stored permanently)</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">2. How We Use Your Information</h2>
          <ul className="text-sm text-taupe-dark leading-relaxed list-disc pl-5 space-y-1">
            <li>Create and manage your account</li>
            <li>Connect you with playgroups and other families</li>
            <li>Send notifications about playgroup activity (join requests, messages, sessions)</li>
            <li>Display playgroup locations on maps</li>
            <li>Process reports and maintain community safety</li>
            <li>Improve the App's features and user experience</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">3. Children's Privacy</h2>
          <p className="text-sm text-taupe-dark leading-relaxed">
            Kiddaboo takes children's privacy seriously. We only collect children's first names and age ranges — never full names, photos, exact birthdates, or other identifying information of children. Children's information is only visible to members of playgroups the parent has joined. Children cannot create accounts or use the App directly.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">4. Information Sharing</h2>
          <p className="text-sm text-taupe-dark leading-relaxed mb-2">
            We do not sell your personal information. We share information only in these circumstances:
          </p>
          <ul className="text-sm text-taupe-dark leading-relaxed list-disc pl-5 space-y-1">
            <li><strong>With other users:</strong> Your profile, reviews, and messages are visible to playgroup members</li>
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
          <p className="text-sm text-taupe-dark leading-relaxed">
            We retain your data for as long as your account is active. When you delete your account, we remove your personal information, profile, and children's data. Some information (such as messages sent in group chats) may remain visible to other members but will no longer be associated with your identity.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-2">8. Push Notifications</h2>
          <p className="text-sm text-taupe-dark leading-relaxed">
            We send push notifications for playgroup activity such as new messages, join requests, and session reminders. You can control which notifications you receive in your Notification Settings, or disable them entirely. We store your push subscription token securely and only use it for app notifications.
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
            If you have questions about this Privacy Policy or your data, please contact us at privacy@kiddaboo.app.
          </p>
        </section>
      </div>
    </div>
  );
}
