import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OrganizerLayout from "./OrganizerLayout";
import { vi } from "vitest";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ signOut: vi.fn(), accountType: "organizer" }),
}));

test("shows ORGANIZER mode label with terracotta tint and renders children", () => {
  render(
    <MemoryRouter>
      <OrganizerLayout><div>child</div></OrganizerLayout>
    </MemoryRouter>
  );
  const label = screen.getByText("Organizer");
  expect(label).toBeInTheDocument();
  expect(label.className).toMatch(/terracotta/);
  expect(screen.getByText("child")).toBeInTheDocument();
});
