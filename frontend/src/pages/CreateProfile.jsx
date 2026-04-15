import { useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingLayout from "../components/layout/OnboardingLayout";
import Input from "../components/ui/Input";
import TagSelector from "../components/ui/TagSelector";
import Button from "../components/ui/Button";
import { useOnboarding } from "../context/OnboardingContext";
import { useAuth } from "../context/AuthContext";
import { uploadProfilePhoto } from "../lib/storage";
import { PHILOSOPHY_TAGS } from "../data/mockData";

export default function CreateProfile() {
  const navigate = useNavigate();
  const { data, updateField } = useOnboarding();
  const { user, updateProfile } = useAuth();
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const url = URL.createObjectURL(file);
      updateField("photoUrl", url);
    }
  };

  const handleContinue = async () => {
    const newErrors = {};
    if (!photoFile && !data.photoUrl) newErrors.photo = "Profile photo is required";
    if (!data.firstName.trim()) newErrors.firstName = "First name is required";
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      // Fail closed: if ChooseRole wasn't visited (no stashed role),
      // send the user back to pick one. The ChooseRole page is the
      // only authorized entry into signup, so we should never get
      // here without it — but guard anyway.
      const pendingAccountType = sessionStorage.getItem("kiddaboo.pendingAccountType");
      if (pendingAccountType !== "parent" && pendingAccountType !== "organizer") {
        navigate("/choose-role");
        return;
      }

      setSaving(true);

      // Upload profile photo if selected
      // #56: block navigation on upload failure instead of silently
      // continuing with a blank avatar — hosts use the photo to decide
      // whether to approve join requests.
      let photoUrl = null;
      if (photoFile && user) {
        const { url, error: uploadErr } = await uploadProfilePhoto(photoFile, user.id);
        if (uploadErr) {
          console.warn("Photo upload failed:", uploadErr);
          setSaving(false);
          setErrors({ photo: "We couldn't upload your photo. Please try again, or pick a smaller image." });
          return;
        }
        photoUrl = url;
      }

      // Save profile to Supabase
      const profileData = {
        first_name: data.firstName.trim(),
        last_name: data.lastName.trim(),
        bio: data.bio.trim(),
        philosophy_tags: data.philosophyTags,
        zip_code: data.zipCode.trim() || null,
        account_type: pendingAccountType,
      };
      if (photoUrl) profileData.photo_url = photoUrl;

      const { error } = await updateProfile(profileData);

      setSaving(false);

      if (error) {
        console.error("CreateProfile save error:", error);
        setErrors({ save: "Could not save profile. Please try again." });
        return;
      }

      sessionStorage.removeItem("kiddaboo.pendingAccountType");
      navigate(
        pendingAccountType === "organizer" ? "/host/create" : "/children"
      );
    }
  };

  return (
    <OnboardingLayout currentStep={2}>
      <div className="flex flex-col gap-6 pt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ fontFamily: "'ChunkFive', serif", color: '#5C6B52' }}>
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
            <div className={`w-24 h-24 rounded-full border-2 border-dashed bg-cream-dark flex items-center justify-center overflow-hidden group-hover:border-sage transition-colors ${
              errors.photo ? "border-red-400" : "border-taupe/30"
            }`}>
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
            <p className={`text-xs text-center mt-2 ${errors.photo ? "text-red-500 font-medium" : "text-taupe/60"}`}>
              {errors.photo || "Add photo (required)"}
            </p>
            {/* #58: trust microcopy — parents worry about photo visibility */}
            <p className="text-[11px] text-taupe/50 text-center mt-1">
              Only shown to hosts and members of groups you join. Never public.
            </p>
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

        {/* Zip code */}
        <Input
          label="Zip code"
          value={data.zipCode}
          onChange={(val) => updateField("zipCode", val.replace(/[^0-9-]/g, "").slice(0, 10))}
          placeholder="60640"
          error={errors.zipCode}
        />
        <p className="text-[11px] text-taupe/50 -mt-4">
          Helps us show you playgroups nearby. Never shared publicly.
        </p>

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
