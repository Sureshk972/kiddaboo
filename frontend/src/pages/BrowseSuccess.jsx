import { useNavigate } from "react-router-dom";
import OnboardingLayout from "../components/layout/OnboardingLayout";
import Button from "../components/ui/Button";
import { useOnboarding } from "../context/OnboardingContext";
import { MOCK_PLAYGROUPS } from "../data/mockData";

export default function BrowseSuccess() {
  const navigate = useNavigate();
  const { data } = useOnboarding();

  const confettiColors = ["#A3B18A", "#C08B6E", "#DAE4D0", "#E8C4B0", "#7A8F6D"];

  return (
    <OnboardingLayout currentStep={4} showBack={false}>
      <div className="flex flex-col gap-8 pt-4">
        {/* Success message with confetti */}
        <div className="text-center relative">
          {/* Confetti dots */}
          <div className="absolute inset-0 flex justify-center pointer-events-none">
            {confettiColors.map((color, i) => (
              <div
                key={i}
                className="confetti-dot absolute w-3 h-3 rounded-full"
                style={{
                  backgroundColor: color,
                  left: `${20 + i * 15}%`,
                  top: "20px",
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>

          <div className="w-16 h-16 bg-sage-light rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 6L9 17L4 12"
                stroke="#7A8F6D"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-heading font-bold text-charcoal mb-2">
            You're all set{data.firstName ? `, ${data.firstName}` : ""}!
          </h1>
          <p className="text-taupe leading-relaxed">
            Start discovering playgroups curated for your family.
          </p>
        </div>

        {/* Map placeholder */}
        <div className="rounded-2xl overflow-hidden h-48 bg-cream-dark border border-cream-dark flex flex-col items-center justify-center gap-2">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-taupe/40">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          <p className="text-sm text-taupe/50">Map view coming soon</p>
        </div>

        {/* Playgroup previews */}
        <div>
          <h3 className="text-lg font-heading font-bold text-charcoal mb-3">
            Nearby Playgroups
          </h3>
          <div className="flex flex-col gap-3">
            {MOCK_PLAYGROUPS.map((group) => (
              <div
                key={group.id}
                onClick={() => navigate(`/playgroup/${group.id}`)}
                className="bg-white rounded-2xl p-4 border border-cream-dark flex items-center gap-4 hover:border-sage-light transition-colors cursor-pointer"
              >
                {/* Icon */}
                <div className="w-12 h-12 bg-sage-light rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">
                    {group.tags[0] === "Outdoorsy" ? "🌿" : group.tags[0] === "Faith-based" ? "🕊" : "🌱"}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-heading font-bold text-charcoal text-sm">
                    {group.name}
                  </h4>
                  <p className="text-xs text-taupe mt-0.5">
                    {group.location} &middot; {group.familyCount} families
                  </p>
                  <div className="flex gap-1.5 mt-1.5">
                    {group.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] bg-sage-light text-sage-dark px-2 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Chevron */}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-taupe/40 flex-shrink-0">
                  <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            ))}
          </div>
        </div>

        <Button fullWidth onClick={() => navigate("/browse")}>
          Start Browsing
        </Button>
      </div>
    </OnboardingLayout>
  );
}
