import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi, describe, test, expect, beforeEach } from "vitest";
import OnboardingOnly from "./OnboardingOnly";

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../../context/AuthContext";

function renderWithRoute(initialEntries) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/children" element={
          <OnboardingOnly>
            <div>AddChildren content</div>
          </OnboardingOnly>
        } />
        <Route path="/my-profile" element={<div>My Profile page</div>} />
        <Route path="/" element={<div>Welcome page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("OnboardingOnly", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  test("redirects to /my-profile when user has first_name and onboarding flag not set", () => {
    useAuth.mockReturnValue({
      user: { id: "u1" },
      profile: { first_name: "Jane" },
      loading: false,
    });
    renderWithRoute([{ pathname: "/children" }]);
    expect(screen.getByText("My Profile page")).toBeInTheDocument();
  });

  test("lets through when user has first_name but onboardingActive flag is set", () => {
    sessionStorage.setItem("kiddaboo.onboardingActive", "1");
    useAuth.mockReturnValue({
      user: { id: "u1" },
      profile: { first_name: "Jane" },
      loading: false,
    });
    renderWithRoute([{ pathname: "/children" }]);
    expect(screen.getByText("AddChildren content")).toBeInTheDocument();
  });

  test("lets through when user has no first_name (first-time user)", () => {
    useAuth.mockReturnValue({
      user: { id: "u1" },
      profile: { first_name: null },
      loading: false,
    });
    renderWithRoute([{ pathname: "/children" }]);
    expect(screen.getByText("AddChildren content")).toBeInTheDocument();
  });

  test("redirects to / when not authenticated", () => {
    useAuth.mockReturnValue({
      user: null,
      profile: null,
      loading: false,
    });
    renderWithRoute([{ pathname: "/children" }]);
    expect(screen.getByText("Welcome page")).toBeInTheDocument();
  });
});
