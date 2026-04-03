import { useNavigate } from "react-router-dom";
import OnboardingLayout from "../../components/layout/OnboardingLayout";
import Button from "../../components/ui/Button";
import { useHost } from "../../context/HostContext";

export default function ScreeningQuestions() {
  const navigate = useNavigate();
  const {
    data,
    addScreeningQuestion,
    updateScreeningQuestion,
    removeScreeningQuestion,
  } = useHost();

  const isRequestOrInvite =
    data.accessType === "request" || data.accessType === "invite";

  return (
    <OnboardingLayout currentStep={2} totalSteps={5}>
      <div className="flex flex-col gap-6 pt-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-charcoal mb-2">
            Screening questions
          </h1>
          <p className="text-taupe leading-relaxed">
            {isRequestOrInvite
              ? "Ask families a few questions when they request to join. This helps you find the right fit."
              : "Your group is open, so these are optional. But you can still ask families to introduce themselves."}
          </p>
        </div>

        {/* Questions */}
        <div className="flex flex-col gap-3">
          {data.screeningQuestions.map((q, i) => (
            <div key={i} className="relative">
              <div className="flex items-start gap-2">
                <span className="text-xs text-taupe/50 font-medium mt-3.5 w-5 flex-shrink-0">
                  {i + 1}.
                </span>
                <textarea
                  value={q}
                  onChange={(e) => updateScreeningQuestion(i, e.target.value)}
                  placeholder="e.g., What's your parenting philosophy?"
                  rows={2}
                  maxLength={200}
                  className="
                    flex-1 bg-white border border-cream-dark rounded-xl px-4 py-3
                    text-charcoal font-body text-sm outline-none transition-all duration-150
                    resize-none placeholder:text-taupe/40
                    focus:ring-2 focus:ring-sage-light focus:border-sage
                  "
                />
                {data.screeningQuestions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeScreeningQuestion(i)}
                    className="mt-3 text-terracotta hover:text-terracotta/70 cursor-pointer bg-transparent border-none transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M4 4L12 12M12 4L4 12"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add question button */}
        {data.screeningQuestions.length < 5 && (
          <Button variant="secondary" fullWidth onClick={addScreeningQuestion}>
            + Add a question
          </Button>
        )}

        {/* Suggestion chips */}
        <div>
          <p className="text-xs text-taupe/60 mb-2">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {[
              "What's your parenting style?",
              "How does your child handle new social settings?",
              "Do your kids have any allergies?",
              "What are you hoping to get from a playgroup?",
            ].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  const emptyIndex = data.screeningQuestions.findIndex(
                    (q) => !q.trim()
                  );
                  if (emptyIndex >= 0) {
                    updateScreeningQuestion(emptyIndex, suggestion);
                  } else if (data.screeningQuestions.length < 5) {
                    addScreeningQuestion();
                    // Need a small delay so the state updates
                    setTimeout(() => {
                      updateScreeningQuestion(
                        data.screeningQuestions.length,
                        suggestion
                      );
                    }, 0);
                  }
                }}
                className="text-[11px] bg-cream-dark text-taupe px-3 py-1.5 rounded-full cursor-pointer hover:bg-sage-light hover:text-sage-dark transition-colors border-none"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <Button fullWidth onClick={() => navigate("/host/environment")}>
          Continue
        </Button>
      </div>
    </OnboardingLayout>
  );
}
