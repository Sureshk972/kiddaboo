import { createContext, useContext, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { uploadPhoto, deletePhoto } from "../lib/storage";
import { geocodeAddress } from "../lib/geocode";

const HostContext = createContext(null);

// #42 / #43: screening questions carry a stable `id` so React's reconciler
// can track them across insert/remove without reusing DOM from the wrong
// row, and so we no longer need the old setTimeout-on-addScreeningQuestion
// trick (which was a stale-closure race) to fill a suggestion — we just
// pass the initial value straight into `addScreeningQuestion(value)`.
// The id is ephemeral: we serialize to `string[]` on save and rebuild
// ids on load, so the DB column shape stays unchanged.
const newQuestion = (value = "") => ({
  id:
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  value,
});

const initialState = {
  // Playgroup basics
  name: "",
  description: "",
  vibeTags: [],
  accessType: "request",
  ageRange: "",
  maxFamilies: 6,
  frequency: "",
  location: "",

  // Screening questions — {id, value}[] internally (see #42/#43 note above)
  screeningQuestions: [newQuestion()],

  // Environment
  environment: {
    setting: "",
    pets: { has: false, type: "" },
    childproofed: false,
    organicSnacks: false,
    screenFree: false,
    firstAidKit: false,
    supervisionRatio: "1:2",
  },

  // Photos
  photos: [],
};

export function HostProvider({ children }) {
  const [data, setData] = useState(initialState);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPlaygroupId, setEditingPlaygroupId] = useState(null);
  const photoFilesRef = useRef([]); // Store actual File objects for upload
  const existingPhotoUrls = useRef([]); // Track original remote URLs in edit mode

  const updateField = (key, value) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const updateEnvironment = (key, value) => {
    setData((prev) => ({
      ...prev,
      environment: { ...prev.environment, [key]: value },
    }));
  };

  // #43: accepts an optional initial value so callers filling in a
  // suggestion chip don't have to do `add() → setTimeout(update)`, which
  // was a stale-closure race that could update the wrong row when the
  // batched setState hadn't flushed yet.
  const addScreeningQuestion = (value = "") => {
    setData((prev) => ({
      ...prev,
      screeningQuestions: [...prev.screeningQuestions, newQuestion(value)],
    }));
  };

  const updateScreeningQuestion = (index, value) => {
    setData((prev) => ({
      ...prev,
      screeningQuestions: prev.screeningQuestions.map((q, i) =>
        i === index ? { ...q, value } : q
      ),
    }));
  };

  const removeScreeningQuestion = (index) => {
    setData((prev) => ({
      ...prev,
      screeningQuestions: prev.screeningQuestions.filter((_, i) => i !== index),
    }));
  };

  const addPhoto = (url, file) => {
    setData((prev) => ({
      ...prev,
      photos: [...prev.photos, url],
    }));
    if (file) {
      photoFilesRef.current = [...photoFilesRef.current, file];
    }
  };

  const removePhoto = (index) => {
    setData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
    photoFilesRef.current = photoFilesRef.current.filter((_, i) => i !== index);
  };

  // Save playgroup to Supabase
  const savePlaygroup = async (userId) => {
    // #27: backstop the UI flow's name validation. HostSuccess.jsx
    // auto-saves on mount, and any navigation path that lands on that
    // route with an empty name (direct nav, browser back/forward, state
    // restore race) would previously insert a `name = ''` row that
    // later got deactivated, leaving an abandoned draft in the table.
    // Now the insert short-circuits before it hits the DB, and the
    // caller surfaces the error the same way it already surfaces
    // ALREADY_HOSTING. Migration 019 adds a DB-level CHECK to backstop
    // this backstop.
    if (!data.name || !data.name.trim()) {
      return {
        data: null,
        error: {
          message: "Playgroup name is required.",
          code: "NAME_REQUIRED",
        },
      };
    }

    // Enforce one playgroup per host: bail out if this user already owns one
    const { data: existing, error: existingErr } = await supabase
      .from("playgroups")
      .select("id")
      .eq("creator_id", userId)
      .eq("is_active", true)
      .limit(1);

    if (existingErr) {
      return { data: null, error: existingErr };
    }
    if (existing && existing.length > 0) {
      return {
        data: null,
        error: {
          message:
            "You already have an active playgroup. Each host can manage one playgroup at a time.",
          code: "ALREADY_HOSTING",
        },
      };
    }

    // Serialize internal {id,value}[] → DB string[], dropping empties.
    const questions = data.screeningQuestions
      .map((q) => q.value)
      .filter((v) => v.trim() !== "");

    // Geocode the location to get lat/lng
    const geo = await geocodeAddress(data.location);

    // #46: insert the playgroup row BEFORE uploading any photos. The
    // previous order uploaded files first, so any insert failure
    // (ALREADY_HOSTING race, geocode-driven validation, network) left
    // orphaned files in Storage with no row pointing at them. With the
    // row-first order, a failed insert means zero uploads — no orphans.
    // Photos are attached in a follow-up update once the row exists.
    const { data: playgroup, error } = await supabase
      .from("playgroups")
      .insert({
        creator_id: userId,
        name: data.name.trim(),
        description: data.description.trim(),
        location_name: data.location.trim(),
        latitude: geo?.lat || null,
        longitude: geo?.lng || null,
        age_range: data.ageRange,
        frequency: data.frequency,
        vibe_tags: data.vibeTags,
        max_families: data.maxFamilies,
        access_type: data.accessType,
        screening_questions: questions,
        environment: data.environment,
        photos: [],
      })
      .select()
      .single();

    if (error) {
      // Partial unique index `one_active_playgroup_per_host` (migration
      // 017) is the authoritative enforcement of the one-playgroup-per-
      // host rule. The pre-check above catches the common case quickly,
      // but a race between the SELECT and the INSERT could still slip
      // through without this. Translate the Postgres 23505 into the
      // same friendly ALREADY_HOSTING error shape the caller expects.
      if (error.code === "23505") {
        return {
          data: null,
          error: {
            message:
              "You already have an active playgroup. Each host can manage one playgroup at a time.",
            code: "ALREADY_HOSTING",
          },
        };
      }
      return { data: null, error };
    }

    // #46 (cont.): now that the row exists, upload the photos. Per-file
    // failures continue to warn-and-skip — the existing behavior — but
    // now a failed upload just means fewer photos on an otherwise valid
    // playgroup instead of an orphaned Storage file.
    let photoUrls = [];
    if (photoFilesRef.current.length > 0) {
      for (const file of photoFilesRef.current) {
        const { url, error: uploadErr } = await uploadPhoto(file, "playgroups", userId);
        if (url) photoUrls.push(url);
        if (uploadErr) console.warn("Photo upload failed:", uploadErr);
      }
    }

    // Attach the uploaded photos to the row. A failure here does NOT
    // fail the overall save — the playgroup is already live and the
    // host can add photos later from the edit flow.
    if (photoUrls.length > 0) {
      const { error: photosErr } = await supabase
        .from("playgroups")
        .update({ photos: photoUrls })
        .eq("id", playgroup.id);
      if (photosErr) {
        console.warn("Attaching photos to new playgroup failed:", photosErr);
      } else {
        playgroup.photos = photoUrls;
      }
    }

    // Also create a membership record for the host (role = creator)
    const { error: memberError } = await supabase.from("memberships").insert({
      user_id: userId,
      playgroup_id: playgroup.id,
      role: "creator",
    });

    if (memberError) {
      console.warn("Playgroup created but membership failed:", memberError);
    }

    return { data: playgroup, error: null };
  };

  // Load existing playgroup data for editing
  const loadPlaygroup = (pg) => {
    const questions = pg.screening_questions || [];
    setData({
      name: pg.name || "",
      description: pg.description || "",
      vibeTags: pg.vibe_tags || [],
      accessType: pg.access_type || "request",
      ageRange: pg.age_range || "",
      maxFamilies: pg.max_families || 6,
      frequency: pg.frequency || "",
      location: pg.location_name || "",
      // Rehydrate DB string[] into internal {id,value}[] (see #42/#43).
      screeningQuestions:
        questions.length > 0
          ? questions.map((v) => newQuestion(v))
          : [newQuestion()],
      environment: pg.environment || initialState.environment,
      photos: pg.photos || [],
    });
    existingPhotoUrls.current = [...(pg.photos || [])];
    photoFilesRef.current = [];
    setIsEditing(true);
    setEditingPlaygroupId(pg.id);
  };

  // Update existing playgroup in Supabase
  const updatePlaygroup = async (userId) => {
    // #27: same name backstop as savePlaygroup. EditPlaygroup.jsx
    // already validates the name in its submit handler, but keeping
    // the guard here too means any future caller of updatePlaygroup
    // can't accidentally clear the name.
    if (!data.name || !data.name.trim()) {
      return {
        data: null,
        error: {
          message: "Playgroup name is required.",
          code: "NAME_REQUIRED",
        },
      };
    }

    // Same serialization as savePlaygroup (see note there).
    const questions = data.screeningQuestions
      .map((q) => q.value)
      .filter((v) => v.trim() !== "");

    // Handle photos: keep existing remote URLs + upload new blob URLs
    const keptUrls = data.photos.filter((url) => !url.startsWith("blob:"));
    const newFiles = photoFilesRef.current;

    // #47: diff the original remote photo list against the kept list so
    // we know which URLs the host removed in-session. We delete those
    // from Storage after the row update succeeds (not before — a failed
    // update shouldn't orphan the host's data in the other direction).
    const removedUrls = existingPhotoUrls.current.filter(
      (url) => !keptUrls.includes(url)
    );

    let newPhotoUrls = [];
    if (newFiles.length > 0) {
      for (const file of newFiles) {
        const { url, error: uploadErr } = await uploadPhoto(file, "playgroups", userId);
        if (url) newPhotoUrls.push(url);
        if (uploadErr) console.warn("Photo upload failed:", uploadErr);
      }
    }

    const allPhotos = [...keptUrls, ...newPhotoUrls];

    // Geocode the location to get lat/lng
    const geo = await geocodeAddress(data.location);

    const { data: updated, error } = await supabase
      .from("playgroups")
      .update({
        name: data.name.trim(),
        description: data.description.trim(),
        location_name: data.location.trim(),
        latitude: geo?.lat || null,
        longitude: geo?.lng || null,
        age_range: data.ageRange,
        frequency: data.frequency,
        vibe_tags: data.vibeTags,
        max_families: data.maxFamilies,
        access_type: data.accessType,
        screening_questions: questions,
        environment: data.environment,
        photos: allPhotos,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingPlaygroupId)
      .select()
      .single();

    if (error) {
      return { data: updated, error };
    }

    // #47: the row is now the authoritative "new" list. Delete any
    // remote photos the host removed. Per-file deletion failures just
    // warn — worst case one or two orphans remain, but the row is
    // consistent. This runs AFTER the update so a failed update never
    // destroys storage.
    if (removedUrls.length > 0) {
      for (const url of removedUrls) {
        const { error: delErr } = await deletePhoto(url);
        if (delErr) console.warn("Failed to delete removed playgroup photo:", delErr);
      }
      // Track the fresh remote list so a second save in the same session
      // doesn't try to delete the same URLs again.
      existingPhotoUrls.current = [...keptUrls];
    }

    return { data: updated, error: null };
  };

  // Reset form after successful save
  const resetHost = () => {
    setData(initialState);
    photoFilesRef.current = [];
    existingPhotoUrls.current = [];
    setIsEditing(false);
    setEditingPlaygroupId(null);
  };

  return (
    <HostContext.Provider
      value={{
        data,
        isEditing,
        editingPlaygroupId,
        updateField,
        updateEnvironment,
        addScreeningQuestion,
        updateScreeningQuestion,
        removeScreeningQuestion,
        addPhoto,
        removePhoto,
        savePlaygroup,
        updatePlaygroup,
        loadPlaygroup,
        resetHost,
      }}
    >
      {children}
    </HostContext.Provider>
  );
}

export function useHost() {
  const context = useContext(HostContext);
  if (!context) {
    throw new Error("useHost must be used within HostProvider");
  }
  return context;
}
