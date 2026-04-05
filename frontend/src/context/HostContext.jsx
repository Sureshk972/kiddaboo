import { createContext, useContext, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { uploadPhoto } from "../lib/storage";

const HostContext = createContext(null);

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

  // Screening questions
  screeningQuestions: [""],

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

  const addScreeningQuestion = () => {
    setData((prev) => ({
      ...prev,
      screeningQuestions: [...prev.screeningQuestions, ""],
    }));
  };

  const updateScreeningQuestion = (index, value) => {
    setData((prev) => ({
      ...prev,
      screeningQuestions: prev.screeningQuestions.map((q, i) =>
        i === index ? value : q
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
    // Filter out empty screening questions
    const questions = data.screeningQuestions.filter((q) => q.trim() !== "");

    // Upload photos to Supabase Storage
    let photoUrls = [];
    if (photoFilesRef.current.length > 0) {
      for (const file of photoFilesRef.current) {
        const { url, error: uploadErr } = await uploadPhoto(file, "playgroups", userId);
        if (url) photoUrls.push(url);
        if (uploadErr) console.warn("Photo upload failed:", uploadErr);
      }
    }

    // Insert playgroup row
    const { data: playgroup, error } = await supabase
      .from("playgroups")
      .insert({
        creator_id: userId,
        name: data.name.trim(),
        description: data.description.trim(),
        location_name: data.location.trim(),
        age_range: data.ageRange,
        frequency: data.frequency,
        vibe_tags: data.vibeTags,
        max_families: data.maxFamilies,
        access_type: data.accessType,
        screening_questions: questions,
        environment: data.environment,
        photos: photoUrls,
      })
      .select()
      .single();

    if (error) return { data: null, error };

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
      screeningQuestions: questions.length > 0 ? questions : [""],
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
    const questions = data.screeningQuestions.filter((q) => q.trim() !== "");

    // Handle photos: keep existing remote URLs + upload new blob URLs
    const keptUrls = data.photos.filter((url) => !url.startsWith("blob:"));
    const newFiles = photoFilesRef.current;

    let newPhotoUrls = [];
    if (newFiles.length > 0) {
      for (const file of newFiles) {
        const { url, error: uploadErr } = await uploadPhoto(file, "playgroups", userId);
        if (url) newPhotoUrls.push(url);
        if (uploadErr) console.warn("Photo upload failed:", uploadErr);
      }
    }

    const allPhotos = [...keptUrls, ...newPhotoUrls];

    const { data: updated, error } = await supabase
      .from("playgroups")
      .update({
        name: data.name.trim(),
        description: data.description.trim(),
        location_name: data.location.trim(),
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

    return { data: updated, error };
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
