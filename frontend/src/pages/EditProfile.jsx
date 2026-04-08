import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../components/ui/Input";
import TagSelector from "../components/ui/TagSelector";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { uploadProfilePhoto } from "../lib/storage";
import { PHILOSOPHY_TAGS, AGE_RANGES, PERSONALITY_TAGS } from "../data/mockData";

export default function EditProfile() {
  const navigate = useNavigate();
  const { user, profile, updateProfile } = useAuth();

  // Profile fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [philosophyTags, setPhilosophyTags] = useState([]);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);

  // Children
  const [children, setChildren] = useState([
    { id: crypto.randomUUID(), name: "", ageRange: "", personalityTags: [], isExisting: false },
  ]);
  const [loadingChildren, setLoadingChildren] = useState(true);

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
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // Fetch children
  useEffect(() => {
    if (!user) {
      setLoadingChildren(false);
      return;
    }
    const fetchChildren = async () => {
      const { data } = await supabase
        .from("children")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (data && data.length > 0) {
        setChildren(
          data.map((c) => ({
            id: c.id,
            name: c.name || "",
            ageRange: c.age_range || "",
            personalityTags: c.personality_tags || [],
            isExisting: true,
          }))
        );
      } else {
        setChildren([
          { id: crypto.randomUUID(), name: "", ageRange: "", personalityTags: [], isExisting: false },
        ]);
      }
      setLoadingChildren(false);
    };
    fetchChildren();
  }, [user]);

  const addChild = () => {
    setChildren((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: "", ageRange: "", personalityTags: [], isExisting: false },
    ]);
  };

  const removeChild = (id) => {
    setChildren((prev) => prev.filter((c) => c.id !== id));
  };

  const updateChild = (id, key, value) => {
    setChildren((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [key]: value } : c))
    );
  };

  const handleSave = async () => {
    if (!firstName.trim()) {
      setError("First name is required");
      return;
    }

    setSaving(true);
    setError("");
    setSaved(false);

    try {
      // 1. Upload photo if changed
      let photoUrl = null;
      if (photoFile && user) {
        const { url, error: uploadErr } = await uploadProfilePhoto(photoFile, user.id);
        if (!uploadErr) {
          photoUrl = url;
        }
        // Photo upload failure is non-critical — continue saving other fields
      }

      // 2. Update profile
      const profileData = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        bio: bio.trim(),
        philosophy_tags: philosophyTags,
      };
      if (photoUrl) profileData.photo_url = photoUrl;

      const { error: profileError } = await updateProfile(profileData);

      if (profileError) {
        setError("Could not save profile. Please try again.");
        setSaving(false);
        return;
      }

      // 3. Replace children
      const { error: deleteError } = await supabase.from("children").delete().eq("user_id", user.id);
      if (deleteError) {
        setError("Profile saved but children could not be updated.");
        setSaving(false);
        return;
      }

      const validChildren = children.filter((c) => c.name.trim());
      if (validChildren.length > 0) {
        const rows = validChildren.map((c) => ({
          user_id: user.id,
          name: c.name.trim(),
          age_range: c.ageRange || null,
          personality_tags: c.personalityTags,
        }));

        const { error: childError } = await supabase.from("children").insert(rows);
        if (childError) {
          setError("Profile saved but children could not be updated.");
          setSaving(false);
          return;
        }
      }

      setSaving(false);
      setSaved(true);
      setTimeout(() => navigate("/my-profile"), 800);
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  if (loadingChildren) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm border-b border-cream-dark">
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
          <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "'ChunkFive', serif", color: '#5C6B52' }}>
            Edit Profile
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-6 flex flex-col gap-6">
        {/* Profile photo */}
        <div className="flex justify-center">
          <label className="cursor-pointer group">
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
            <div className="w-24 h-24 rounded-full border-2 border-dashed border-taupe/30 bg-cream-dark flex items-center justify-center overflow-hidden group-hover:border-sage transition-colors">
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

        {/* Divider */}
        <div className="h-px bg-cream-dark" />

        {/* Children section */}
        <div>
          <h2 className="text-lg font-bold tracking-tight mb-1" style={{ fontFamily: "'ChunkFive', serif", color: '#5C6B52' }}>
            Your little ones
          </h2>
          <p className="text-sm text-taupe mb-4">
            Update your children's info for better playgroup matching.
          </p>

          <div className="flex flex-col gap-4">
            {children.map((child, index) => (
              <div
                key={child.id}
                className="bg-white rounded-2xl p-5 border border-cream-dark"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-sage">
                    Child {index + 1}
                  </span>
                  {children.length > 1 && (
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

          <button
            onClick={addChild}
            className="w-full mt-3 py-3 rounded-xl border border-dashed border-sage-light text-sm text-sage font-medium cursor-pointer bg-transparent hover:bg-sage-light/20 transition-colors"
          >
            + Add another child
          </button>
        </div>

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
    </div>
  );
}
