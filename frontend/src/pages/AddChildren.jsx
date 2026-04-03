import { useNavigate } from "react-router-dom";
import OnboardingLayout from "../components/layout/OnboardingLayout";
import Input from "../components/ui/Input";
import TagSelector from "../components/ui/TagSelector";
import Button from "../components/ui/Button";
import { useOnboarding } from "../context/OnboardingContext";
import { AGE_RANGES, PERSONALITY_TAGS } from "../data/mockData";

export default function AddChildren() {
  const navigate = useNavigate();
  const { data, addChild, removeChild, updateChild } = useOnboarding();

  const handleContinue = () => {
    const hasAtLeastOne = data.children.some((c) => c.name.trim());
    if (hasAtLeastOne) {
      navigate("/success");
    }
  };

  return (
    <OnboardingLayout currentStep={3}>
      <div className="flex flex-col gap-6 pt-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-charcoal mb-2">
            Your little ones
          </h1>
          <p className="text-taupe leading-relaxed">
            This helps us match you with age-appropriate playgroups.
          </p>
        </div>

        {/* Children cards */}
        <div className="flex flex-col gap-4">
          {data.children.map((child, index) => (
            <div
              key={child.id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-cream-dark"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-sage">
                  Child {index + 1}
                </span>
                {data.children.length > 1 && (
                  <button
                    onClick={() => removeChild(child.id)}
                    className="text-xs text-terracotta hover:text-terracotta/80 cursor-pointer bg-transparent border-none transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <Input
                  label="Name"
                  value={child.name}
                  onChange={(val) => updateChild(child.id, "name", val)}
                  placeholder="First name"
                />

                <TagSelector
                  label="Age range"
                  options={AGE_RANGES}
                  selected={child.ageRange ? [child.ageRange] : []}
                  onChange={(tags) =>
                    updateChild(child.id, "ageRange", tags[tags.length - 1] || "")
                  }
                  maxSelections={1}
                />

                <TagSelector
                  label="Personality"
                  options={PERSONALITY_TAGS}
                  selected={child.personalityTags}
                  onChange={(tags) =>
                    updateChild(child.id, "personalityTags", tags)
                  }
                  maxSelections={3}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Add another child */}
        <Button variant="secondary" fullWidth onClick={addChild}>
          + Add another child
        </Button>

        <Button
          fullWidth
          onClick={handleContinue}
          disabled={!data.children.some((c) => c.name.trim())}
        >
          Continue
        </Button>
      </div>
    </OnboardingLayout>
  );
}
