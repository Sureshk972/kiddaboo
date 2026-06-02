import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../components/ui/Input";
import TagSelector from "../components/ui/TagSelector";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { uploadProfilePhoto } from "../lib/storage";
import PhotoCropModal from "../components/ui/PhotoCropModal";
import { PHILOSOPHY_TAGS } from "../data/mockData";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function EditProfile() {
  useDocumentTitle("Edit Profile");
  const navigate = useNavigate();
  const { user, profile, updateProfile } = useAuth();

  // Profile fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [philosophyTags, setPhilosophyTags] = useState([]);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [rawPhoto, setRawPhoto] = useState(null);
  // Tracks an explicit "Remove photo" tap so handleSave clears
  // photo_url even though no new file was uploaded.
  const [photoCleared, setPhotoCleared] = useState(false);

  // Save state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // Populate from profile
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setBio(profile.bio || "");
      setPhilosophyTags(profile.philosophy_tags || []);
      if (profile.photo_url) setPhotoPreview(profile.photo_url);
    }
  }, [profile]);

  const handlePhotoChange = (e) => {
    const raw = e.target.files?.[0];
    e.target.value = "";
    if (!raw) return;
    setRawPhoto(raw);
  };

  const handleCropConfirm = (cropped) => {
    setPhotoFile(cropped);
    setPhotoPreview(URL.createObjectURL(cropped));
    setPhotoCleared(false);
    setRawPhoto(null);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoCleared(true);
  };

  const handleSave = async () => {
    if (!firstName.trim()) {
      setError("First name is required");
      return;
    }

    const trimmedBio = bio.trim();
    if (trimmedBio) {
      if (trimmedBio.length < 10) {
        setError("Tell hosts a little more about your family — at least 10 characters.");
        return;
      }
      if (/^(.)\1+$/i.test(trimmedBio.replace(/\s/g, ""))) {
        setError("Please write a real bio — repeated characters won't help hosts get to know you.");
        return;
      }
    }

    setSaving(true);
    setError("");
    setSaved(false);

    try {
      // 1. Upload photo if changed
      let photoUrl = null;
      let photoUploadFailed = false;
      if (photoFile && user) {
        const { url, error: uploadErr } = await uploadProfilePhoto(photoFile, user.id);
        if (!uploadErr && url) {
          photoUrl = url;
        } else {
          // Track so we can surface a non-fatal warning after the save
          // completes (see #30).
          photoUploadFailed = true;
        }
      }

      // 2. Update profile
      const profileData = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        bio: bio.trim(),
        philosophy_tags: philosophyTags,
      };
      if (photoUrl) {
        profileData.photo_url = photoUrl;
      } else if (photoCleared) {
        profileData.photo_url = null;
      }

      const { error: profileError } = await updateProfile(profileData);

      if (profileError) {
        setError("Could not save profile. Please try again.");
        setSaving(false);
        return;
      }

      setSaving(false);
      if (photoUploadFailed) {
        setError(
          "Profile saved — but your new photo couldn't be uploaded. Please try again."
        );
        // Don't redirect; let the user retry the photo.
        return;
      }
      setSaved(true);
      setTimeout(() => navigate("/my-profile"), 800);
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream pb-8">
      {/* Header */}
      <div data-safe-top className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm border-b border-cream-dark">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="w-9 h-9 rounded-full bg-white border border-cream-dark flex items-center justify-center cursor-pointer hover:border-sage-light transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path
                d="M12.5 15L7.5 10L12.5 5"
                stroke="#2F2F2F"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Inter', sans-serif", color: '#8B3FE0' }}>
            Edit Profile
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-6 flex flex-col gap-6">
        {/* Profile photo */}
        <div className="flex flex-col items-center">
          <label className="cursor-pointer group">
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
            <div className="w-24 h-24 rounded-full border-2 border-dashed border-taupe/30 bg-cream-dark flex items-center justify-center overflow-hidden group-hover:border-sage transition-colors relative">
              {photoPreview ? (
                <img
                  src={photoPreview}
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
            <p className="text-xs text-taupe/60 text-center mt-2">
              {photoPreview ? "Change photo" : "Add photo"}
            </p>
          </label>
          {photoPreview && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="mt-1 text-xs text-taupe/60 hover:text-terracotta underline underline-offset-2 bg-transparent border-none cursor-pointer"
            >
              Remove photo
            </button>
          )}
        </div>

        {/* Name fields */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First name"
            value={firstName}
            onChange={setFirstName}
            placeholder="Jane"
          />
          <Input
            label="Last name"
            value={lastName}
            onChange={setLastName}
            placeholder="Smith"
          />
        </div>

        {/* Bio */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-taupe">
            About you & your family
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A little about your family, your values, and what you're looking for..."
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
            {bio.length}/200
          </span>
        </div>

        {/* Philosophy tags */}
        <TagSelector
          label="Parenting philosophy"
          options={PHILOSOPHY_TAGS}
          selected={philosophyTags}
          onChange={setPhilosophyTags}
          maxSelections={4}
        />

        {/* Error / Success */}
        {error && <p className="text-sm text-red-500">{error}</p>}
        {saved && (
          <p className="text-sm text-sage-dark font-medium">Saved! Redirecting...</p>
        )}

        {/* Save button */}
        <Button fullWidth onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <PhotoCropModal
        file={rawPhoto}
        onCancel={() => setRawPhoto(null)}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
}
