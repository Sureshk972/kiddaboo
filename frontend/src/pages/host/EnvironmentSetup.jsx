import { useNavigate } from "react-router-dom";
import OnboardingLayout from "../../components/layout/OnboardingLayout";
import Button from "../../components/ui/Button";
import { useHost } from "../../context/HostContext";

const SETTINGS = ["Indoor", "Outdoor", "Indoor + Outdoor"];
const RATIOS = ["1:1", "1:2", "1:3", "1:4"];

function Toggle({ label, description, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-cream-dark cursor-pointer hover:border-sage-light transition-colors text-left"
    >
      <div>
        <p className="text-sm font-medium text-charcoal">{label}</p>
        {description && (
          <p className="text-xs text-taupe mt-0.5">{description}</p>
        )}
      </div>
      <div
        className={`
          w-11 h-6 rounded-full relative transition-colors duration-200
          ${checked ? "bg-sage" : "bg-cream-dark"}
        `}
      >
        <div
          className={`
            absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200
            ${checked ? "translate-x-5" : "translate-x-0.5"}
          `}
        />
      </div>
    </button>
  );
}

export default function EnvironmentSetup() {
  const navigate = useNavigate();
  const { data, updateEnvironment } = useHost();
  const env = data.environment;

  return (
    <OnboardingLayout currentStep={3} totalSteps={5}>
      <div className="flex flex-col gap-6 pt-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-charcoal mb-2">
            Your environment
          </h1>
          <p className="text-taupe leading-relaxed">
            Parents care deeply about where their kids play. Be upfront and
            build trust.
          </p>
        </div>

        {/* Setting */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-taupe">Setting</label>
          <div className="flex gap-2">
            {SETTINGS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => updateEnvironment("setting", s)}
                className={`
                  flex-1 py-3 px-3 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer
                  ${
                    env.setting === s
                      ? "bg-sage-light text-sage-dark border border-sage"
                      : "bg-cream-dark text-taupe border border-transparent hover:border-sage-light"
                  }
                `}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-col gap-2">
          <Toggle
            label="Childproofed"
            description="Space is safe for toddlers and young children"
            checked={env.childproofed}
            onChange={(v) => updateEnvironment("childproofed", v)}
          />
          <Toggle
            label="Organic snacks"
            description="Only organic, wholesome snacks provided"
            checked={env.organicSnacks}
            onChange={(v) => updateEnvironment("organicSnacks", v)}
          />
          <Toggle
            label="Screen-free"
            description="No TVs, tablets, or screens during sessions"
            checked={env.screenFree}
            onChange={(v) => updateEnvironment("screenFree", v)}
          />
          <Toggle
            label="First aid kit"
            description="First aid supplies readily available"
            checked={env.firstAidKit}
            onChange={(v) => updateEnvironment("firstAidKit", v)}
          />
        </div>

        {/* Pets */}
        <div className="flex flex-col gap-2">
          <Toggle
            label="Pets at home"
            description="Any pets present during playgroup sessions"
            checked={env.pets.has}
            onChange={(v) =>
              updateEnvironment("pets", { ...env.pets, has: v })
            }
          />
          {env.pets.has && (
            <div className="ml-4">
              <input
                value={env.pets.type}
                onChange={(e) =>
                  updateEnvironment("pets", {
                    ...env.pets,
                    type: e.target.value,
                  })
                }
                placeholder="e.g., Cat (kept separate during sessions)"
                className="
                  w-full bg-white border border-cream-dark rounded-xl px-4 py-3
                  text-charcoal font-body text-sm outline-none transition-all duration-150
                  placeholder:text-taupe/40
                  focus:ring-2 focus:ring-sage-light focus:border-sage
                "
              />
            </div>
          )}
        </div>

        {/* Supervision ratio */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-taupe">
            Adult-to-child supervision ratio
          </label>
          <div className="flex gap-2">
            {RATIOS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => updateEnvironment("supervisionRatio", r)}
                className={`
                  flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer
                  ${
                    env.supervisionRatio === r
                      ? "bg-sage-light text-sage-dark border border-sage"
                      : "bg-cream-dark text-taupe border border-transparent hover:border-sage-light"
                  }
                `}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <Button fullWidth onClick={() => navigate("/host/photos")}>
          Continue
        </Button>
      </div>
    </OnboardingLayout>
  );
}
