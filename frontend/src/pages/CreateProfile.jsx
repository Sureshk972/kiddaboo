import { useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingLayout from "../components/layout/OnboardingLayout";
import Input from "../components/ui/Input";
import TagSelector from "../components/ui/TagSelector";
import Button from "../components/ui/Button";
import { useOnboarding } from "../context/OnboardingContext";
import { useAuth } from "../context/AuthContext";
import { uploadProfilePhoto } from "../lib/storage";
import PhotoCropModal from "../components/ui/PhotoCropModal";
import { PHILOSOPHY_TAGS } from "../data/mockData";

export default function CreateProfile() {
  const navigate = useNavigate();
  const { data, updateField } = useOnboarding();
  const { user, updateProfile } = useAuth();
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [rawPhoto, setRawPhoto] = useState(null);
  // Drives the spinner overlay on the avatar while the file is being
  // uploaded to Supabase Storage. Supabase's upload() doesn't emit
  // progress events, so this is a binary indicator — but at least the
  // user sees that *something* is happening on a slow connection
  // instead of a frozen "Saving..." button.
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Read role once on mount — determines which voice the copy uses.
  // Missing value falls back to parent framing; handleContinue has a
  // fail-closed guard that bounces the user back to /choose-role on save.
  const [pendingAccountType] = useState(() =>
    sessionStorage.getItem("kiddaboo.pendingAccountType")
  );
  const isNanny = pendingAccountType === "nanny";

  const handlePhotoChange = (e) => {
    const raw = e.target.files?.[0];
    // Reset value so re-picking the same file re-opens the cropper.
    e.target.value = "";
    if (!raw) return;
    setRawPhoto(raw);
  };

  const handleCropConfirm = (cropped) => {
    setPhotoFile(cropped);
    updateField("photoUrl", URL.createObjectURL(cropped));
    setRawPhoto(null);
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
      if (pendingAccountType !== "parent" && pendingAccountType !== "nanny") {
        navigate("/choose-role");
        return;
      }

      setSaving(true);

      // Upload profile photo if selected
      // Block navigation on upload failure instead of silently
      // continuing with a blank avatar.
      let photoUrl = null;
      if (photoFile && user) {
        setUploadingPhoto(true);
        const { url, error: uploadErr } = await uploadProfilePhoto(photoFile, user.id);
        setUploadingPhoto(false);
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

      // Don't clear pendingAccountType yet — PhoneVerify reads it to
      // decide where to go next (/success vs /nanny/dashboard). The flag
      // gets cleared at the end of the flow.
      navigate("/verify-phone");
    }
  };

  return (
    <OnboardingLayout currentStep={2}>
      <div className="flex flex-col gap-6 pt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ fontFamily: "'Inter', sans-serif", color: '#8B3FE0' }}>
            Tell us about you
          </h1>
          <p className="text-taupe leading-relaxed">
            {isNanny
              ? "Parents will see this when browsing Nannies."
              : "Nannies will see this when you send a booking request."}
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
            <div className={`relative w-24 h-24 rounded-full border-2 border-dashed bg-cream-dark flex items-center justify-center overflow-hidden group-hover:border-sage transition-colors ${
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
              {uploadingPhoto && (
                <div className="absolute inset-0 bg-charcoal/40 flex items-center justify-center">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="animate-spin text-white">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
                    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </div>
              )}
            </div>
            <p className={`text-xs text-center mt-2 ${errors.photo ? "text-red-500 font-medium" : "text-taupe/60"}`}>
              {errors.photo || "Add photo (required)"}
            </p>
            {/* trust microcopy */}
            <p className="text-[11px] text-taupe/50 text-center mt-1">
              {isNanny
                ? "Shown to parents searching for a Nanny. Helps build trust."
                : "Shown to Nannies when you make a booking request."}
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
            autoComplete="given-name"
          />
          <Input
            label="Last name"
            value={data.lastName}
            onChange={(val) => updateField("lastName", val)}
            placeholder="Smith"
            autoComplete="family-name"
          />
        </div>

        {/* Zip code — parents use it to find nearby Nannies.
            Nannies set their service area separately in availability. */}
        {!isNanny && (
          <>
            <Input
              label="Zip code"
              value={data.zipCode}
              onChange={(val) => updateField("zipCode", val.replace(/[^0-9-]/g, "").slice(0, 10))}
              placeholder="60640"
              error={errors.zipCode}
              autoComplete="postal-code"
              inputMode="numeric"
            />
            <p className="text-[11px] text-taupe/50 -mt-4">
              Helps us show you Nannies nearby. Never shared publicly.
            </p>
          </>
        )}

        {/* Bio */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label className="text-sm font-medium text-taupe">
              {isNanny ? "About you" : "About you & your family"}
            </label>
            <span className="text-[11px] text-taupe/60">200 char max</span>
          </div>
          <textarea
            value={data.bio}
            onChange={(e) => updateField("bio", e.target.value)}
            placeholder={
              isNanny
                ? "Your experience with kids, certifications, availability preferences, and anything else parents should know..."
                : "A little about your family and what you're looking for in a Nanny..."
            }
            maxLength={200}
            rows={3}
            className="
              bg-white border border-cream-dark rounded-xl px-4 py-3.5 text-charcoal
              font-body text-base outline-none transition-all duration-150 resize-none
              placeholder:text-taupe/40
              focus:ring-2 focus:ring-sage-light focus:border-sage
            "
          />
          <span className={`text-xs text-right ${data.bio.length >= 180 ? "text-terracotta" : "text-taupe/50"}`}>
            {data.bio.length}/200
          </span>
        </div>

        {/* Philosophy tags — parent only. Nannies don't need these. */}
        {!isNanny && (
          <TagSelector
            label="Parenting philosophy"
            options={PHILOSOPHY_TAGS}
            selected={data.philosophyTags}
            onChange={(tags) => updateField("philosophyTags", tags)}
            maxSelections={4}
          />
        )}

        {errors.save && (
          <p className="text-sm text-red-500">{errors.save}</p>
        )}

        <Button fullWidth onClick={handleContinue} disabled={saving}>
          {saving ? "Saving..." : "Continue"}
        </Button>
      </div>

      <PhotoCropModal
        file={rawPhoto}
        onCancel={() => setRawPhoto(null)}
        onConfirm={handleCropConfirm}
      />
    </OnboardingLayout>
  );
}
