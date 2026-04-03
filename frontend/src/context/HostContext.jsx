import { createContext, useContext, useState } from "react";

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

  const addPhoto = (url) => {
    setData((prev) => ({
      ...prev,
      photos: [...prev.photos, url],
    }));
  };

  const removePhoto = (index) => {
    setData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  return (
    <HostContext.Provider
      value={{
        data,
        updateField,
        updateEnvironment,
        addScreeningQuestion,
        updateScreeningQuestion,
        removeScreeningQuestion,
        addPhoto,
        removePhoto,
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
