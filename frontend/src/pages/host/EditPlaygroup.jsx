import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useHost } from "../../context/HostContext";
import { supabase } from "../../lib/supabase";
import Input from "../../components/ui/Input";
import TagSelector from "../../components/ui/TagSelector";
import Button from "../../components/ui/Button";
import { VIBE_TAGS, AGE_RANGES } from "../../data/mockData";

const SETTINGS = ["Indoor", "Outdoor", "Indoor + Outdoor"];
const RATIOS = ["1:1", "1:2", "1:3", "1:4"];
const FREQUENCIES = ["Weekly", "Biweekly", "Monthly", "Varies"];
const SUGGESTIONS = [
  "What's your parenting style?",
  "How does your child handle new social settings?",
  "Do your kids have any allergies?",
  "What are you hoping to get from a playgroup?",
];

export default function EditPlaygroup() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    data,
    updateField,
    updateEnvironment,
    addScreeningQuestion,
    updateScreeningQuestion,
    removeScreeningQuestion,
    addPhoto,
    removePhoto,
    loadPlaygroup,
    updatePlaygroup,
    resetHost,
  } = useHost();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const photoInputRef = useRef(null);

  // Fetch playgroup on mount
  useEffect(() => {
    if (!id || !user) return;

    const fetchPlaygroup = async () => {
      const { data: pg, error: pgError } = await supabase
        .from("playgroups")
        .select("*")
        .eq("id", id)
        .eq("creator_id", user.id)
        .single();

      if (pgError || !pg) {
        setError("Playgroup not found or you don't have permission to edit it.");
        setLoading(false);
        return;
      }

      loadPlaygroup(pg);
      setLoading(false);
    };

    fetchPlaygroup();

    return () => resetHost();
  }, [id, user]);

  const handleSave = async () => {
    // #48: match the create flow's minimum validation — name + at least
    // one vibe tag. Previously a host could clear all vibe tags in edit
    // and save a row that the Browse listing couldn't meaningfully
    // render or filter.
    if (!data.name.trim()) {
      setError("Playgroup name is required");
      return;
    }
    if (!data.vibeTags || data.vibeTags.length === 0) {
      setError("Pick at least one vibe tag");
      return;
    }

    setSaving(true);
    setError(null);

    const result = await updatePlaygroup(user.id);

    if (result.error) {
      setError("Failed to save changes. Please try again.");
      setSaving(false);
      return;
    }

    setSaving(false);
    navigate("/host/dashboard");
  };

  const handlePhotoAdd = (e) => {
    const files = Array.from(e.target.files || []);
    const remaining = 6 - data.photos.length;
    files.slice(0, remaining).forEach((file) => {
      addPhoto(URL.createObjectURL(file), file);
    });
    e.target.value = "";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !data.name) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
        <h2 className="font-heading font-bold text-charcoal text-xl mb-2">
          {error}
        </h2>
        <Button variant="secondary" onClick={() => navigate(-1)} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream pb-28">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm border-b border-cream-dark">
        <div className="max-w-md mx-auto px-5 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-white border border-cream-dark flex items-center justify-center cursor-pointer hover:border-sage-light transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="#2F2F2F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="font-heading font-bold text-charcoal text-base">
            Edit Playgroup
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-5 flex flex-col gap-6">
        {/* ─── Basic Info ─── */}
        <Section title="Basic Info">
          <Input
            label="Playgroup name"
            value={data.name}
            onChange={(e) => updateField("name", e.target.value)}
            maxLength={60}
            placeholder="e.g., Little Explorers"
          />

          <div>
            <label className="text-sm font-medium text-taupe-dark block mb-1.5">
              Description
            </label>
            <textarea
              value={data.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="What makes your playgroup special?"
              maxLength={500}
              rows={3}
              className="w-full bg-white border border-cream-dark rounded-xl px-4 py-3.5 text-charcoal font-body text-sm outline-none resize-none placeholder:text-taupe/40 focus:ring-2 focus:ring-sage-light focus:border-sage transition-all duration-150"
            />
            <span className="text-[11px] text-taupe/50 block text-right mt-1">
              {data.description.length}/500
            </span>
          </div>

          <Input
            label="Location"
            value={data.location}
            onChange={(e) => updateField("location", e.target.value)}
            placeholder="e.g., Lincoln Park, Chicago"
          />

          <TagSelector
            label="Vibe"
            options={VIBE_TAGS}
            selected={data.vibeTags}
            onChange={(tags) => updateField("vibeTags", tags)}
            maxSelections={4}
          />

          <TagSelector
            label="Age range"
            options={AGE_RANGES}
            selected={data.ageRange ? [data.ageRange] : []}
            onChange={(tags) => updateField("ageRange", tags[tags.length - 1] || "")}
            maxSelections={1}
          />

          <div>
            <label className="text-sm font-medium text-taupe-dark block mb-1.5">
              Max families
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => updateField("maxFamilies", Math.max(2, data.maxFamilies - 1))}
                className="w-10 h-10 rounded-xl bg-white border border-cream-dark flex items-center justify-center cursor-pointer hover:border-sage-light text-charcoal text-lg font-bold"
              >
                -
              </button>
              <span className="text-2xl font-heading font-bold text-charcoal w-8 text-center">
                {data.maxFamilies}
              </span>
              <button
                onClick={() => updateField("maxFamilies", Math.min(15, data.maxFamilies + 1))}
                className="w-10 h-10 rounded-xl bg-white border border-cream-dark flex items-center justify-center cursor-pointer hover:border-sage-light text-charcoal text-lg font-bold"
              >
                +
              </button>
              <span className="text-sm text-taupe">families</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-taupe-dark block mb-1.5">
              How often do you meet?
            </label>
            <div className="flex flex-wrap gap-2">
              {FREQUENCIES.map((freq) => (
                <button
                  key={freq}
                  onClick={() => updateField("frequency", freq)}
                  className={`px-4 py-2 rounded-xl text-sm border cursor-pointer transition-all ${
                    data.frequency === freq
                      ? "bg-sage text-white border-sage"
                      : "bg-white text-taupe border-cream-dark hover:border-sage-light"
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>

          {/* Access type */}
          <div>
            <label className="text-sm font-medium text-taupe-dark block mb-2">
              Who can join?
            </label>
            <div className="flex flex-col gap-2">
              {[
                { value: "open", label: "Open", desc: "Anyone can join immediately", icon: "🟢" },
                { value: "request", label: "Request to Join", desc: "You review and approve each family", icon: "🟡" },
                { value: "invite", label: "Invite Only", desc: "Only families you invite can join", icon: "🔒" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateField("accessType", opt.value)}
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all text-left ${
                    data.accessType === opt.value
                      ? "bg-sage-light/30 border-sage-light"
                      : "bg-white border-cream-dark hover:border-sage-light"
                  }`}
                >
                  <span className="text-lg">{opt.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-charcoal">{opt.label}</p>
                    <p className="text-xs text-taupe">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* ─── Screening Questions ─── */}
        <Section title="Screening Questions">
          <p className="text-xs text-taupe mb-3">
            Questions families answer when requesting to join.
          </p>
          <div className="flex flex-col gap-3">
            {data.screeningQuestions.map((q, i) => (
              <div key={q.id} className="flex items-start gap-2">
                <span className="text-sm text-taupe font-medium mt-3">{i + 1}.</span>
                <div className="flex-1">
                  <textarea
                    value={q.value}
                    onChange={(e) => updateScreeningQuestion(i, e.target.value)}
                    placeholder="e.g., What's your parenting philosophy?"
                    maxLength={200}
                    rows={2}
                    className="w-full bg-white border border-cream-dark rounded-xl px-4 py-3 text-charcoal font-body text-sm outline-none resize-none placeholder:text-taupe/40 focus:ring-2 focus:ring-sage-light focus:border-sage transition-all duration-150"
                  />
                </div>
                {data.screeningQuestions.length > 1 && (
                  <button
                    onClick={() => removeScreeningQuestion(i)}
                    className="mt-3 text-taupe/40 hover:text-terracotta bg-transparent border-none cursor-pointer"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          {data.screeningQuestions.length < 5 && (
            <button
              onClick={addScreeningQuestion}
              className="w-full py-3 rounded-xl border border-cream-dark border-dashed text-sm text-taupe hover:border-sage-light bg-white cursor-pointer transition-colors mt-2"
            >
              + Add a question
            </button>
          )}

          <div className="mt-3">
            <p className="text-[11px] text-taupe/50 mb-2">Suggested questions:</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.filter(
                (s) => !data.screeningQuestions.some((q) => q.value === s)
              ).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    const emptyIdx = data.screeningQuestions.findIndex(
                      (q) => !q.value.trim()
                    );
                    if (emptyIdx >= 0) updateScreeningQuestion(emptyIdx, s);
                    // #43: push suggestion straight in as initial value.
                    else if (data.screeningQuestions.length < 5) addScreeningQuestion(s);
                  }}
                  className="text-[11px] text-taupe bg-cream-dark/50 px-2.5 py-1 rounded-full cursor-pointer border-none hover:bg-sage-light transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* ─── Environment ─── */}
        <Section title="Environment">
          {/* Setting */}
          <div>
            <label className="text-sm font-medium text-taupe-dark block mb-2">Setting</label>
            <div className="flex gap-2">
              {SETTINGS.map((s) => (
                <button
                  key={s}
                  onClick={() => updateEnvironment("setting", s)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-medium border cursor-pointer transition-all ${
                    data.environment.setting === s
                      ? "bg-sage text-white border-sage"
                      : "bg-white text-taupe border-cream-dark hover:border-sage-light"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          {[
            { key: "childproofed", label: "Childproofed" },
            { key: "organicSnacks", label: "Organic snacks" },
            { key: "screenFree", label: "Screen-free" },
            { key: "firstAidKit", label: "First aid kit" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between py-1">
              <span className="text-sm text-taupe-dark">{label}</span>
              <button
                onClick={() => updateEnvironment(key, !data.environment[key])}
                className={`w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer border-none ${
                  data.environment[key] ? "bg-sage" : "bg-cream-dark"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                    data.environment[key] ? "translate-x-[22px]" : "translate-x-[2px]"
                  }`}
                />
              </button>
            </div>
          ))}

          {/* Pets */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-taupe-dark">Pets in the home</span>
            <button
              onClick={() =>
                updateEnvironment("pets", {
                  ...data.environment.pets,
                  has: !data.environment.pets.has,
                })
              }
              className={`w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer border-none ${
                data.environment.pets.has ? "bg-sage" : "bg-cream-dark"
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                  data.environment.pets.has ? "translate-x-[22px]" : "translate-x-[2px]"
                }`}
              />
            </button>
          </div>
          {data.environment.pets.has && (
            <Input
              label="What kind?"
              value={data.environment.pets.type}
              onChange={(e) =>
                updateEnvironment("pets", {
                  ...data.environment.pets,
                  type: e.target.value,
                })
              }
              placeholder="e.g., Friendly golden retriever"
            />
          )}

          {/* Supervision ratio */}
          <div>
            <label className="text-sm font-medium text-taupe-dark block mb-2">
              Supervision ratio
            </label>
            <div className="flex gap-2">
              {RATIOS.map((r) => (
                <button
                  key={r}
                  onClick={() => updateEnvironment("supervisionRatio", r)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border cursor-pointer transition-all ${
                    data.environment.supervisionRatio === r
                      ? "bg-sage text-white border-sage"
                      : "bg-white text-taupe border-cream-dark hover:border-sage-light"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* ─── Photos ─── */}
        <Section title="Photos">
          <div className="grid grid-cols-3 gap-2">
            {data.photos.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 w-6 h-6 bg-charcoal/60 rounded-full flex items-center justify-center cursor-pointer border-none"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6L18 18" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}

            {data.photos.length < 6 && (
              <button
                onClick={() => photoInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-cream-dark flex flex-col items-center justify-center cursor-pointer bg-white hover:border-sage-light transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5V19M5 12H19" stroke="#B8B0A0" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span className="text-[10px] text-taupe mt-1">Add</span>
              </button>
            )}
          </div>

          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoAdd}
            className="hidden"
          />
        </Section>

        {/* Error message */}
        {error && (
          <p className="text-sm text-terracotta text-center">{error}</p>
        )}
      </div>

      {/* Sticky save button */}
      <div className="fixed bottom-0 left-0 right-0 bg-cream/90 backdrop-blur-md border-t border-cream-dark px-6 py-4 z-30">
        <div className="max-w-md mx-auto">
          <Button fullWidth onClick={handleSave} loading={saving}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

// Collapsible section wrapper
function Section({ title, children }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-white rounded-2xl border border-cream-dark overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer bg-transparent border-none"
      >
        <h3 className="font-heading font-bold text-charcoal text-base">{title}</h3>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          className={`text-taupe transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5 flex flex-col gap-4">
          {children}
        </div>
      )}
    </div>
  );
}
