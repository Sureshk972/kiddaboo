import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function MyProfile() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const firstName = profile?.first_name || "Your";
  const lastName = profile?.last_name || "Name";
  const initials =
    (firstName[0] || "Y").toUpperCase() + (lastName[0] || "").toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="bg-cream">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm border-b border-cream-dark">
        <div className="max-w-md mx-auto px-5 py-4">
          <h1 className="text-xl font-heading font-bold text-charcoal">
            Profile
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-6 flex flex-col gap-6">
        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-cream-dark p-6 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-sage-light flex items-center justify-center mb-3">
            <span className="text-2xl font-heading font-bold text-sage-dark">
              {initials}
            </span>
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
            { icon: "\ud83d\udc64", label: "Edit Profile" },
            { icon: "\ud83d\udc76", label: "Manage Children" },
            { icon: "\ud83d\udd14", label: "Notifications" },
            { icon: "\ud83d\udee1\ufe0f", label: "Privacy & Safety" },
            { icon: "\u2753", label: "Help & Support" },
          ].map((item, i, arr) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-4 py-4 text-left cursor-pointer bg-transparent border-none hover:bg-cream-dark/50 transition-colors ${
                i < arr.length - 1 ? "border-b border-cream-dark" : ""
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="text-sm text-charcoal font-medium flex-1">
                {item.label}
              </span>
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
      </div>
    </div>
  );
}
