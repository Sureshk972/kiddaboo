import { useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingLayout from "../components/layout/OnboardingLayout";
import Input from "../components/ui/Input";
import TagSelector from "../components/ui/TagSelector";
import Button from "../components/ui/Button";
import { useOnboarding } from "../context/OnboardingContext";
import { useAuth } from "../context/AuthContext";
import { PHILOSOPHY_TAGS } from "../data/mockData";

export default function CreateProfile() {
  const navigate = useNavigate();
  const { data, updateField } = useOnboarding();
  const { updateProfile } = useAuth();
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      updateField("photoUrl", url);
    }
  };

  const handleContinue = async () => {
    const newErrors = {};
    if (!data.firstName.trim()) newErrors.firstName = "First name is required";
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setSaving(true);

      // Save profile to Supabase
      const { error } = await updateProfile({
        first_name: data.firstName.trim(),
        last_name: data.lastName.trim(),
        bio: data.bio.trim(),
        philosophy_tags: data.philosophyTags,
      });

      setSaving(false);

      if (error) {
        setErrors({ save: "Could not save profile. Please try again." });
        return;
      }

      navigate("/children");
    }
  };

  return (
    <OnboardingLayout currentStep={2}>
      <div className="flex flex-col gap-6 pt-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-charcoal mb-2">
            Tell us about you
          </h1>
          <p className="text-taupe leading-relaxed">
            Other moms will see this when you request to join a playgroup.
          </p>
        </div>

        {/* Photo upload */}
        <div className="flex justify-center">
          <label className="cursor-pointer group">
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
            <div className="w-24 h-24 rounded-full border-2 border-dashed border-taupe/30 bg-cream-dark flex items-center justify-center overflow-hidden group-hover:border-sage transition-colors">
              {data.photoUrl ? (
                <img
                  src={data.photoUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-taupe/50">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              )}
            </div>
            <p className="text-xs text-taupe/60 text-center mt-2">Add photo</p>
          </label>
        </div>

        {/* Name fields */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First name"
            value={data.firstName}
            onChange={(val) => updateField("firstName", val)}
            placeholder="Jane"
            error={errors.firstName}
          />
          <Input
            label="Last name"
            value={data.lastName}
            onChange={(val) => updateField("lastName", val)}
            placeholder="Smith"
          />
        </div>

        {/* Bio */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-taupe">
            About you & your family
          </label>
          <textarea
            value={data.bio}
            onChange={(e) => updateField("bio", e.target.value)}
            placeholder="A little about your family, your values, and what you're looking for in a playgroup..."
            maxLength={200}
            rows={3}
            className="
              bg-white border border-cream-dark rounded-xl px-4 py-3.5 text-charcoal
              font-body text-base outline-none transition-all duration-150 resize-none
              placeholder:text-taupe/40
              focus:ring-2 focus:ring-sage-light focus:border-sage
            "
          />
          <span className="text-xs text-taupe/50 text-right">
            {data.bio.length}/200
          </span>
        </div>

        {/* Philosophy tags */}
        <TagSelector
          label="Parenting philosophy"
          options={PHILOSOPHY_TAGS}
          selected={data.philosophyTags}
          onChange={(tags) => updateField("philosophyTags", tags)}
          maxSelections={4}
        />

        {errors.save && (
          <p className="text-sm text-red-500">{errors.save}</p>
        )}

        <Button fullWidth onClick={handleContinue} disabled={saving}>
          {saving ? "Saving..." : "Continue"}
        </Button>
      </div>
    </OnboardingLayout>
  );
}
