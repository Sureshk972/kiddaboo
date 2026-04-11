import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { useSubscription } from "../hooks/useSubscription";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function MyProfile() {
  useDocumentTitle("My Profile"); // #50
  const navigate = useNavigate();
  const { user, profile, signOut, isHost } = useAuth();
  const { isPremium, isHostPremium, subscription } = useSubscription();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const firstName = profile?.first_name || "Your";
  const lastName = profile?.last_name || "Name";
  const initials =
    (firstName[0] || "Y").toUpperCase() + (lastName[0] || "").toUpperCase();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch {
      navigate("/");
    }
  };

  return (
    <div className="bg-cream">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm border-b border-cream-dark">
        <div className="max-w-md mx-auto px-5 py-4">
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'ChunkFive', serif", color: '#5C6B52' }}>
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
          {user?.email && (
            <p className="text-xs text-taupe mt-1">{user.email}</p>
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

        {/* Settings list */}
        <div className="bg-white rounded-2xl border border-cream-dark overflow-hidden">
          {[
            isHost
              ? {
                  icon: "\u2b50",
                  label: isHostPremium ? "Host Premium Member" : "Upgrade to Host Premium",
                  sublabel: isHostPremium ? null : "Priority placement, view analytics & more",
                  path: "/host/premium",
                  highlight: true,
                }
              : {
                  icon: "\u2b50",
                  label: isPremium ? "Premium Member" : "Upgrade to Premium",
                  sublabel: isPremium ? null : "Unlimited join requests & more",
                  path: "/premium",
                  highlight: true,
                },
            ...(isHost
              ? [{
                  icon: "\ud83d\udd0d",
                  label: "Discover other playgroups",
                  sublabel: "Browse playgroups as a parent",
                  path: "/browse",
                }]
              : []),
            { icon: "\ud83d\udc64", label: "Edit Profile", path: "/edit-profile" },
            { icon: "\ud83d\udc76", label: "Manage Children", path: "/edit-profile#children" },
            { icon: "\ud83d\udd14", label: "Notifications", path: "/notifications" },
            { icon: "\ud83d\udcdc", label: "Terms of Service", path: "/terms" },
            { icon: "\ud83d\udee1\ufe0f", label: "Privacy Policy", path: "/privacy" },
            { icon: "\u2753", label: "Help & Support", comingSoon: true },
          ].map((item, i, arr) => (
            <button
              key={item.label}
              onClick={() => item.path && navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-4 text-left bg-transparent border-none transition-colors ${
                i < arr.length - 1 ? "border-b border-cream-dark" : ""
              } ${item.comingSoon ? "opacity-50 cursor-default" : "cursor-pointer hover:bg-cream-dark/50"}`}
            >
              <span className="text-base">{item.icon}</span>
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

        {/* Social */}
        <a
          href="https://www.instagram.com/kiddaboo1/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-taupe hover:text-sage transition-colors no-underline"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="18" cy="6" r="1.5" fill="currentColor" />
          </svg>
          Follow @kiddaboo1
        </a>

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

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <>
          <div
            className="fixed inset-0 bg-charcoal/40 z-40"
            onClick={() => !deleting && setShowDeleteConfirm(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <div className="bg-cream rounded-2xl p-6 max-w-sm w-full shadow-xl">
              <h3 className="font-heading font-bold text-charcoal text-lg mb-2">
                Delete your account?
              </h3>
              <p className="text-sm text-taupe leading-relaxed mb-1">
                This will permanently delete:
              </p>
              <ul className="text-sm text-taupe leading-relaxed list-disc pl-5 mb-4 space-y-0.5">
                <li>Your profile and children's info</li>
                <li>All playgroups you created</li>
                <li>Your memberships, messages, and reviews</li>
              </ul>
              <p className="text-sm text-red-600 font-medium mb-5">
                This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    setDeleting(true);
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      const res = await supabase.functions.invoke("delete-account", {
                        headers: {
                          Authorization: `Bearer ${session?.access_token}`,
                        },
                      });
                      if (res.error) throw res.error;
                      await signOut();
                      navigate("/");
                    } catch (err) {
                      console.error("Delete failed:", err);
                      alert("Failed to delete account. Please try again.");
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
