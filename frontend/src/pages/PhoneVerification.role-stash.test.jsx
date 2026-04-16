import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import PhoneVerification from "./PhoneVerification";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ signUp: vi.fn(), signIn: vi.fn() }),
}));

beforeEach(() => sessionStorage.clear());

test("stashes role=organizer from query param on mount", () => {
  render(
    <MemoryRouter initialEntries={["/verify?role=organizer"]}>
      <PhoneVerification />
    </MemoryRouter>
  );
  expect(sessionStorage.getItem("kiddaboo.pendingAccountType")).toBe("organizer");
});

test("stashes role=parent from query param on mount", () => {
  render(
    <MemoryRouter initialEntries={["/verify?role=parent"]}>
      <PhoneVerification />
    </MemoryRouter>
  );
  expect(sessionStorage.getItem("kiddaboo.pendingAccountType")).toBe("parent");
});

test("does not stash an invalid role value", () => {
  render(
    <MemoryRouter initialEntries={["/verify?role=hacker"]}>
      <PhoneVerification />
    </MemoryRouter>
  );
  expect(sessionStorage.getItem("kiddaboo.pendingAccountType")).toBeNull();
});

test("does not overwrite an existing stash when role param is absent", () => {
  sessionStorage.setItem("kiddaboo.pendingAccountType", "parent");
  render(
    <MemoryRouter initialEntries={["/verify"]}>
      <PhoneVerification />
    </MemoryRouter>
  );
  expect(sessionStorage.getItem("kiddaboo.pendingAccountType")).toBe("parent");
});
