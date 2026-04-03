import { useNavigate } from "react-router-dom";
import ProgressBar from "../ui/ProgressBar";

export default function OnboardingLayout({
  children,
  currentStep,
  totalSteps = 4,
  showBack = true,
  onBack,
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col overflow-y-auto">
      {/* Progress bar */}
      <div className="sticky top-0 z-10">
        <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
      </div>

      {/* Back button */}
      {showBack && (
        <div className="px-6 pt-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-taupe hover:text-charcoal transition-colors cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M12.5 15L7.5 10L12.5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>
      )}

      {/* Content */}
      <div className="max-w-md mx-auto w-full px-6 py-6 pb-12">
        {children}
      </div>
    </div>
  );
}
