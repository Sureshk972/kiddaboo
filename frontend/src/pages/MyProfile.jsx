import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import useParentSelfRating from "../hooks/useParentSelfRating";
import FeedbackSheet from "../components/FeedbackSheet";

export default function MyProfile() {
  useDocumentTitle("My Profile");
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  // #54: inline error replaces jarring alert()
  const [deleteError, setDeleteError] = useState("");

  const firstName = profile?.first_name || "Your";
  const lastName = profile?.last_name || "Name";
  const initials =
    (firstName[0] || "Y").toUpperCase() + (lastName[0] || "").toUpperCase();
  const selfRating = useParentSelfRating();
  const isParent = profile?.account_type !== "nanny";

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/welcome");
    } catch {
      navigate("/welcome");
    }
  };

  return (
    <div className="bg-cream">
      {/* Header */}
      <div data-safe-top className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm border-b border-cream-dark">
        <div className="max-w-md mx-auto px-5 py-4">
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Inter', sans-serif", color: '#8B3FE0' }}>
            My Profile
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-6 flex flex-col gap-6">
        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-cream-dark p-6 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-sage-light flex items-center justify-center mb-3 overflow-hidden">
            {profile?.photo_url ? (
              <img
                src={profile.photo_url}
                alt={`${firstName}'s photo`}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-heading font-bold text-sage-dark">
                {initials}
              </span>
            )}
          </div>
          <h2 className="text-lg font-heading font-bold text-charcoal">
            {firstName} {lastName}
          </h2>
          <div className="flex flex-wrap justify-center gap-1.5 mt-1.5">
            {profile?.is_phone_verified && (
              <span className="inline-flex items-center gap-1 text-[11px] text-sage-dark bg-sage-light px-2 py-0.5 rounded-full">
                <svg width="10" height="10" viewBox="0 0 20 20" fill="none">
                  <path d="M5 10l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Phone verified
              </span>
            )}
          </div>
          {user?.email && (
            <p className="text-xs text-taupe mt-1">{user.email}</p>
          )}
          {profile?.zip_code && (
            <p className="text-xs text-taupe mt-0.5">Zip: {profile.zip_code}</p>
          )}
          {profile?.bio && (
            <p className="text-sm text-taupe mt-2 leading-relaxed max-w-xs">
              {profile.bio}
            </p>
          )}
          {profile?.philosophy_tags?.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {profile.philosophy_tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] bg-sage-light text-sage-dark px-2 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {isParent && selfRating.avg != null && (
          <div className="bg-white border border-cream-dark p-5">
            <div className="text-[10px] font-medium tracking-[0.14em] uppercase text-taupe">
              Your standing with nannies
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className="text-charcoal"
                style={{ fontFamily: "Fraunces, serif", fontWeight: 500, fontSize: "28px", letterSpacing: "-0.5px" }}
              >
                {selfRating.avg.toFixed(1)}
              </span>
              <span className="text-sm text-taupe">/ 5</span>
              <span className="text-xs text-taupe ml-auto">
                {selfRating.count} rating{selfRating.count === 1 ? "" : "s"}
              </span>
            </div>
            <p className="text-xs text-taupe mt-3 leading-relaxed">
              Nannies rate parents privately after each session — they're the
              only ones who see this score. It signals how clear your requests
              are and how easy you are to coordinate with.
            </p>
          </div>
        )}

        {/* Settings list */}
        <div className="bg-white rounded-2xl border border-cream-dark overflow-hidden">
          {[
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M20 21C20 17.13 16.42 14 12 14C7.58 14 4 17.13 4 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              ),
              label: "Edit Profile",
              path: "/edit-profile",
            },
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              ),
              label: "Notifications",
              path: "/notifications",
            },
            ...(profile?.account_type === "nanny"
              ? [
                  {
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M3 10h18M7 15h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    ),
                    label: "How you get paid",
                    sublabel: "Payouts, timing, bank changes",
                    path: "/payout-info",
                  },
                ]
              : [
                  {
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M3 10h18M7 15h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    ),
                    label: "How payments work",
                    sublabel: "Charges, refunds, security",
                    path: "/payment-info",
                  },
                ]),
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M3 6h18M3 12h18M3 18h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              ),
              label: "Billing history",
              sublabel: profile?.account_type === "nanny"
                ? "Every session and what you earned"
                : "Every booking and what you paid",
              path: "/billing",
            },
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              ),
              label: "Terms of Service",
              path: "/terms",
            },
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              ),
              label: "Privacy Policy",
              path: "/privacy",
            },
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ),
              label: "Send feedback",
              sublabel: "Tell us what's working or what could be better",
              onClick: () => setShowFeedback(true),
            },
          ].map((item, i, arr) => (
            <button
              key={item.label}
              onClick={() => {
                if (item.onClick) item.onClick();
                else if (item.path) navigate(item.path);
              }}
              className={`w-full flex items-center gap-3 px-4 py-4 text-left bg-transparent border-none transition-colors ${
                i < arr.length - 1 ? "border-b border-cream-dark" : ""
              } ${item.comingSoon ? "opacity-50 cursor-default" : "cursor-pointer hover:bg-cream-dark/50"}`}
            >
              <span className="w-9 h-9 rounded-xl bg-sage flex items-center justify-center text-white flex-shrink-0">
                {item.icon}
              </span>
              <div className="flex-1 flex flex-col">
                <span className={`text-sm font-medium ${item.highlight ? "text-sage-dark" : "text-charcoal"}`}>
                  {item.label}
                </span>
                {item.sublabel && (
                  <span className="text-[11px] text-taupe mt-0.5">{item.sublabel}</span>
                )}
              </div>
              {item.comingSoon ? (
                <span className="text-[10px] text-taupe/50">Soon</span>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="text-taupe/30"
                >
                  <path
                    d="M6 4L10 8L6 12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="text-sm text-taupe hover:text-terracotta transition-colors cursor-pointer bg-transparent border-none underline underline-offset-4"
        >
          Sign out
        </button>

        {/* Delete account */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="text-xs text-taupe/40 hover:text-red-500 transition-colors cursor-pointer bg-transparent border-none underline underline-offset-4 mb-8"
        >
          Delete my account
        </button>
      </div>

      <FeedbackSheet
        open={showFeedback}
        onClose={() => setShowFeedback(false)}
      />

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <>
          <div
            className="fixed inset-0 bg-charcoal/40 z-40"
            onClick={() => !deleting && setShowDeleteConfirm(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <div className="bg-cream rounded-2xl p-6 max-w-sm w-full shadow-xl max-h-[85vh] overflow-y-auto">
              <h3 className="font-heading font-bold text-charcoal text-lg mb-2">
                Delete your account?
              </h3>
              <p className="text-sm text-taupe leading-relaxed mb-1">
                This will permanently delete:
              </p>
              <ul className="text-sm text-taupe leading-relaxed list-disc pl-5 mb-4 space-y-0.5">
                <li>Your profile and account info</li>
                <li>Your bookings and availability</li>
                <li>Your messages and reviews</li>
              </ul>
              <p className="text-sm text-red-600 font-medium mb-5">
                This action cannot be undone.
              </p>

              {deleteError && (
                <div className="bg-terracotta-light/30 border border-terracotta-light rounded-xl p-3 mb-4">
                  <p className="text-sm text-terracotta font-medium">{deleteError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    setDeleting(true);
                    setDeleteError("");
                    try {
                      await supabase.auth.refreshSession().catch(() => {});
                      const { data: { session } } = await supabase.auth.getSession();
                      const res = await supabase.functions.invoke("delete-account", {
                        headers: {
                          Authorization: `Bearer ${session?.access_token}`,
                        },
                      });
                      if (res.error) {
                        // Read the JSON body for our friendly server message
                        // (e.g. "You still have 2 active bookings…").
                        let msg = null;
                        try {
                          const body = await res.error.context?.text?.();
                          if (body) {
                            const parsed = JSON.parse(body);
                            msg = parsed.message || parsed.error;
                          }
                        } catch {
                          /* fall through */
                        }
                        throw new Error(msg || res.error.message || "delete failed");
                      }
                      await signOut();
                      navigate("/welcome");
                    } catch (err) {
                      console.error("Delete failed:", err);
                      setDeleteError(
                        err.message ||
                          "Something went wrong deleting your account. Please try again."
                      );
                      setDeleting(false);
                    }
                  }}
                  disabled={deleting}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl py-3 text-sm cursor-pointer border-none transition-colors disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Yes, delete everything"}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 bg-white border border-cream-dark text-charcoal font-medium rounded-xl py-3 text-sm cursor-pointer transition-colors hover:bg-cream-dark/50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
