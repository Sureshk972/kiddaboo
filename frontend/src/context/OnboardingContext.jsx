import { createContext, useContext, useState } from "react";

const OnboardingContext = createContext(null);

const initialState = {
  phone: "",
  firstName: "",
  lastName: "",
  bio: "",
  photoUrl: null,
  philosophyTags: [],
  children: [{ id: crypto.randomUUID(), name: "", ageRange: "", personalityTags: [] }],
};

export function OnboardingProvider({ children }) {
  const [data, setData] = useState(initialState);

  const updateField = (key, value) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const addChild = () => {
    setData((prev) => ({
      ...prev,
      children: [
        ...prev.children,
        { id: crypto.randomUUID(), name: "", ageRange: "", personalityTags: [] },
      ],
    }));
  };

  const removeChild = (id) => {
    setData((prev) => {
      const filtered = prev.children.filter((c) => c.id !== id);
      // Always keep at least one child form
      if (filtered.length === 0) {
        return {
          ...prev,
          children: [{ id: crypto.randomUUID(), name: "", ageRange: "", personalityTags: [] }],
        };
      }
      return { ...prev, children: filtered };
    });
  };

  const updateChild = (id, key, value) => {
    setData((prev) => ({
      ...prev,
      children: prev.children.map((c) =>
        c.id === id ? { ...c, [key]: value } : c
      ),
    }));
  };

  return (
    <OnboardingContext.Provider
      value={{ data, updateField, addChild, removeChild, updateChild }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}
