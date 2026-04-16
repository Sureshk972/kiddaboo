import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import CreateProfile from "./CreateProfile";

const navigate = vi.fn();
vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useNavigate: () => navigate,
}));

const updateProfile = vi.fn().mockResolvedValue({ error: null });
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" }, updateProfile }),
}));

vi.mock("../context/OnboardingContext", () => ({
  useOnboarding: () => ({
    data: {
      photoUrl: "blob:existing",
      firstName: "Pat",
      lastName: "Parent",
      bio: "",
      philosophyTags: [],
      zipCode: "11530",
    },
    updateField: vi.fn(),
  }),
}));

beforeEach(() => {
  navigate.mockClear();
  updateProfile.mockClear();
  sessionStorage.clear();
});

test("routes parent to /children after save and writes account_type=parent", async () => {
  sessionStorage.setItem("kiddaboo.pendingAccountType", "parent");
  render(<MemoryRouter><CreateProfile /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: /continue/i }));
  await waitFor(() => expect(updateProfile).toHaveBeenCalled());
  expect(updateProfile.mock.calls[0][0].account_type).toBe("parent");
  expect(navigate).toHaveBeenCalledWith("/children");
  expect(sessionStorage.getItem("kiddaboo.pendingAccountType")).toBeNull();
});

test("routes organizer to /host/create after save and writes account_type=organizer", async () => {
  sessionStorage.setItem("kiddaboo.pendingAccountType", "organizer");
  render(<MemoryRouter><CreateProfile /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: /continue/i }));
  await waitFor(() => expect(updateProfile).toHaveBeenCalled());
  expect(updateProfile.mock.calls[0][0].account_type).toBe("organizer");
  expect(navigate).toHaveBeenCalledWith("/host/create");
  expect(sessionStorage.getItem("kiddaboo.pendingAccountType")).toBeNull();
});

test("bounces back to /choose-role if no stashed role", async () => {
  render(<MemoryRouter><CreateProfile /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: /continue/i }));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith("/choose-role"));
  expect(updateProfile).not.toHaveBeenCalled();
});
