import { useNavigate } from "react-router-dom";
import OnboardingLayout from "../../components/layout/OnboardingLayout";
import Input from "../../components/ui/Input";
import TagSelector from "../../components/ui/TagSelector";
import Button from "../../components/ui/Button";
import { useHost } from "../../context/HostContext";
import { VIBE_TAGS, AGE_RANGES } from "../../data/mockData";

const ACCESS_OPTIONS = [
  {
    value: "open",
    label: "Open",
    desc: "Anyone can join immediately",
    icon: "🟢",
  },
  {
    value: "request",
    label: "Request to Join",
    desc: "You review and approve each family",
    icon: "🟡",
  },
  {
    value: "invite",
    label: "Invite Only",
    desc: "Only families you invite can join",
    icon: "🔒",
  },
];

const FREQUENCY_OPTIONS = [
  "Weekly",
  "Biweekly",
  "Monthly",
  "Varies",
];

export default function CreatePlaygroup() {
  const navigate = useNavigate();
  const { data, updateField } = useHost();

  const canContinue = data.name.trim() && data.vibeTags.length > 0;

  return (
    <OnboardingLayout currentStep={1} totalSteps={5} onBack={() => navigate("/profile")}>
      <div className="flex flex-col gap-6 pt-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-charcoal mb-2">
            Create your playgroup
          </h1>
          <p className="text-taupe leading-relaxed">
            Tell families what your group is all about.
          </p>
        </div>

        {/* Name */}
        <Input
          label="Playgroup name"
          value={data.name}
          onChange={(val) => updateField("name", val)}
          placeholder="e.g., Little Explorers"
          maxLength={60}
        />

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-taupe">Description</label>
          <textarea
            value={data.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="What makes your playgroup special? What can families expect?"
            maxLength={500}
            rows={4}
            className="
              bg-white border border-cream-dark rounded-xl px-4 py-3.5 text-charcoal
              font-body text-sm outline-none transition-all duration-150 resize-none
              placeholder:text-taupe/40
              focus:ring-2 focus:ring-sage-light focus:border-sage
            "
          />
          <span className="text-[11px] text-taupe/50 text-right">
            {data.description.length}/500
          </span>
        </div>

        {/* Vibe tags */}
        <TagSelector
          label="Vibe"
          options={VIBE_TAGS}
          selected={data.vibeTags}
          onChange={(tags) => updateField("vibeTags", tags)}
          maxSelections={4}
        />

        {/* Location */}
        <Input
          label="Neighborhood / Location"
          value={data.location}
          onChange={(val) => updateField("location", val)}
          placeholder="e.g., Presidio, SF"
        />

        {/* Age range */}
        <TagSelector
          label="Age range"
          options={AGE_RANGES}
          selected={data.ageRange ? [data.ageRange] : []}
          onChange={(tags) => updateField("ageRange", tags[tags.length - 1] || "")}
          maxSelections={1}
        />

        {/* Max families */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-taupe">
            Max families
          </label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => updateField("maxFamilies", Math.max(2, data.maxFamilies - 1))}
              className="w-10 h-10 rounded-xl bg-cream-dark text-charcoal flex items-center justify-center text-xl font-medium cursor-pointer hover:bg-sage-light transition-colors"
            >
              -
            </button>
            <span className="text-2xl font-heading font-bold text-charcoal w-8 text-center">
              {data.maxFamilies}
            </span>
            <button
              type="button"
              onClick={() => updateField("maxFamilies", Math.min(15, data.maxFamilies + 1))}
              className="w-10 h-10 rounded-xl bg-cream-dark text-charcoal flex items-center justify-center text-xl font-medium cursor-pointer hover:bg-sage-light transition-colors"
            >
              +
            </button>
            <span className="text-xs text-taupe">families</span>
          </div>
        </div>

        {/* Frequency */}
        <TagSelector
          label="How often do you meet?"
          options={FREQUENCY_OPTIONS}
          selected={data.frequency ? [data.frequency] : []}
          onChange={(tags) => updateField("frequency", tags[tags.length - 1] || "")}
          maxSelections={1}
        />

        {/* Access type */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-taupe">
            Who can join?
          </label>
          <div className="flex flex-col gap-2">
            {ACCESS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateField("accessType", opt.value)}
                className={`
                  w-full text-left p-4 rounded-xl border transition-all duration-150 cursor-pointer
                  ${
                    data.accessType === opt.value
                      ? "border-sage bg-sage-light/30"
                      : "border-cream-dark bg-white hover:border-sage-light"
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{opt.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-charcoal">
                      {opt.label}
                    </p>
                    <p className="text-xs text-taupe">{opt.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <Button
          fullWidth
          onClick={() => navigate("/host/screening")}
          disabled={!canContinue}
        >
          Continue
        </Button>
      </div>
    </OnboardingLayout>
  );
}
