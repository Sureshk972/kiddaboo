import { useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingLayout from "../components/layout/OnboardingLayout";
import Input from "../components/ui/Input";
import TagSelector from "../components/ui/TagSelector";
import Button from "../components/ui/Button";
import { useOnboarding } from "../context/OnboardingContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { AGE_RANGES, PERSONALITY_TAGS } from "../data/mockData";

export default function AddChildren() {
  const navigate = useNavigate();
  const { data, addChild, removeChild, updateChild } = useOnboarding();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleContinue = async () => {
    const validChildren = data.children.filter((c) => c.name.trim());
    if (validChildren.length === 0) return;

    if (!user) {
      navigate("/success");
      return;
    }

    setSaving(true);
    setError("");

    // Snapshot existing rows first. We only delete them AFTER the
    // insert lands — otherwise a transient insert failure would wipe
    // every existing child record with no way to recover.
    const { data: existing } = await supabase
      .from("children")
      .select("id")
      .eq("user_id", user.id);

    const rows = validChildren.map((c) => ({
      user_id: user.id,
      name: c.name.trim(),
      age_range: c.ageRange || null,
      personality_tags: c.personalityTags,
    }));

    const { error: insertError } = await supabase.from("children").insert(rows);

    if (insertError) {
      setSaving(false);
      setError("Could not save. Please try again.");
      return;
    }

    // Insert succeeded — now safe to remove the old rows.
    const oldIds = (existing || []).map((r) => r.id);
    if (oldIds.length > 0) {
      await supabase.from("children").delete().in("id", oldIds);
    }

    setSaving(false);
    navigate("/success");
  };

  return (
    <OnboardingLayout currentStep={3}>
      <div className="flex flex-col gap-6 pt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ fontFamily: "'ChunkFive', serif", color: '#5C6B52' }}>
            Your little ones
          </h1>
          <p className="text-taupe leading-relaxed">
            This helps us match you with age-appropriate playgroups.
          </p>
        </div>

        {/* #58: trust reassurance — parents are anxious about putting kid info online */}
        <div className="bg-sage-light/30 border border-sage-light rounded-xl px-4 py-3 flex items-start gap-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 flex-shrink-0 text-sage-dark">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p className="text-[11px] text-sage-dark leading-relaxed">
            We only collect first names and age ranges — never full names, birthdates, or photos of children. This info is only visible to members of groups you join.
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

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <Button
          fullWidth
          onClick={handleContinue}
          disabled={!data.children.some((c) => c.name.trim()) || saving}
        >
          {saving ? "Saving..." : "Continue"}
        </Button>
      </div>
    </OnboardingLayout>
  );
}
