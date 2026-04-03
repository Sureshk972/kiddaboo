import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingLayout from "../../components/layout/OnboardingLayout";
import Button from "../../components/ui/Button";
import { useHost } from "../../context/HostContext";
import { useOnboarding } from "../../context/OnboardingContext";
import { useAuth } from "../../context/AuthContext";

const ACCESS_LABELS = {
  open: "Open",
  request: "Request to Join",
  invite: "Invite Only",
};

export default function HostSuccess() {
  const navigate = useNavigate();
  const { data: hostData, savePlaygroup, resetHost } = useHost();
  const { data: userData } = useOnboarding();
  const { user } = useAuth();
  const [saveStatus, setSaveStatus] = useState("saving"); // saving | saved | error
  const [errorMsg, setErrorMsg] = useState("");
  const hasSaved = useRef(false);

  // Save playgroup to Supabase when this page loads
  useEffect(() => {
    if (!user || hasSaved.current) return;
    hasSaved.current = true;

    const save = async () => {
      setSaveStatus("saving");
      const { error } = await savePlaygroup(user.id);
      if (error) {
        setSaveStatus("error");
        setErrorMsg(error.message || "Something went wrong");
      } else {
        setSaveStatus("saved");
      }
    };
    save();
  }, [user]);

  return (
    <OnboardingLayout currentStep={5} totalSteps={5} showBack={false}>
      <div className="flex flex-col gap-6 pt-4">
        {/* Success */}
        <div className="text-center">
          <div className="w-16 h-16 bg-sage-light rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                fill="#7A8F6D"
                stroke="#7A8F6D"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-heading font-bold text-charcoal mb-2">
            Your playgroup is live!
          </h1>
          <p className="text-taupe leading-relaxed">
            Families can now discover{" "}
            <span className="text-charcoal font-medium">
              {hostData.name || "your playgroup"}
            </span>{" "}
            and request to join.
          </p>
        </div>

        {/* Preview card */}
        <div className="bg-white rounded-2xl border border-cream-dark overflow-hidden">
          {/* Photo strip */}
          <div className="h-32 bg-sage-light/40 flex items-center justify-center">
            {hostData.photos.length > 0 ? (
              <img
                src={hostData.photos[0]}
                alt="Playgroup"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="mx-auto text-sage/50 mb-1"
                >
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" opacity="0.5" />
                  <path
                    d="M3 16L8 11L13 16"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <p className="text-xs text-sage/50">Add photos later</p>
              </div>
            )}
          </div>

          <div className="p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="font-heading font-bold text-charcoal">
                {hostData.name || "Untitled Playgroup"}
              </h3>
              <span className="text-[10px] bg-sage-light text-sage-dark px-2 py-0.5 rounded-full flex-shrink-0">
                {ACCESS_LABELS[hostData.accessType]}
              </span>
            </div>

            {hostData.location && (
              <p className="text-xs text-taupe mb-2 flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M7 1.5C4.5 1.5 2.5 3.5 2.5 6C2.5 9.5 7 12.5 7 12.5C7 12.5 11.5 9.5 11.5 6C11.5 3.5 9.5 1.5 7 1.5Z"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                  <circle cx="7" cy="6" r="1.5" stroke="currentColor" strokeWidth="1" />
                </svg>
                {hostData.location}
              </p>
            )}

            {hostData.vibeTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {hostData.vibeTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] bg-sage-light text-sage-dark px-2 py-0.5 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {hostData.description && (
              <p className="text-xs text-taupe-dark leading-relaxed line-clamp-2">
                {hostData.description}
              </p>
            )}

            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-cream-dark text-xs text-taupe">
              {hostData.ageRange && <span>Ages {hostData.ageRange}</span>}
              <span>{hostData.maxFamilies} families max</span>
              {hostData.frequency && <span>{hostData.frequency}</span>}
            </div>
          </div>
        </div>

        {/* Host info */}
        <div className="bg-cream-dark rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sage-light flex items-center justify-center flex-shrink-0">
            <span className="text-sage-dark font-heading font-bold text-sm">
              {(userData.firstName?.[0] || "Y").toUpperCase()}
              {(userData.lastName?.[0] || "").toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-charcoal">
              Hosted by {userData.firstName || "you"}
            </p>
            <p className="text-xs text-taupe">
              Your trust score will grow as families join and leave reviews.
            </p>
          </div>
        </div>

        {/* What's next */}
        <div>
          <h3 className="font-heading font-bold text-charcoal text-sm mb-3">
            What happens next
          </h3>
          <div className="flex flex-col gap-2">
            {[
              { icon: "📬", text: "You'll be notified when families request to join" },
              { icon: "👀", text: "Review each family's profile and answers" },
              { icon: "✅", text: "Approve, waitlist, or gracefully decline" },
              { icon: "📅", text: "Schedule your first session" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-white rounded-xl p-3 border border-cream-dark"
              >
                <span className="text-lg">{item.icon}</span>
                <p className="text-sm text-taupe-dark">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {saveStatus === "saving" && (
          <div className="flex items-center justify-center gap-2 py-3">
            <div className="w-5 h-5 border-2 border-sage border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-taupe">Saving your playgroup...</span>
          </div>
        )}

        {saveStatus === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
            <p className="text-sm text-red-600 mb-2">{errorMsg}</p>
            <button
              onClick={async () => {
                hasSaved.current = false;
                setSaveStatus("saving");
                const { error } = await savePlaygroup(user.id);
                if (error) {
                  setSaveStatus("error");
                  setErrorMsg(error.message || "Something went wrong");
                } else {
                  setSaveStatus("saved");
                }
              }}
              className="text-sm text-sage-dark underline underline-offset-2 bg-transparent border-none cursor-pointer"
            >
              Try again
            </button>
          </div>
        )}

        <Button
          fullWidth
          onClick={() => {
            resetHost();
            navigate("/host/dashboard");
          }}
          disabled={saveStatus === "saving"}
        >
          {saveStatus === "saving" ? "Saving..." : "Go to Dashboard"}
        </Button>
      </div>
    </OnboardingLayout>
  );
}
