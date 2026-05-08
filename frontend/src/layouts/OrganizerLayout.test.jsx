import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OrganizerLayout from "./OrganizerLayout";
import { vi } from "vitest";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ signOut: vi.fn(), accountType: "organizer" }),
}));

test("shows ORGANIZER mode label with brand violet tint and renders children", () => {
  render(
    <MemoryRouter>
      <OrganizerLayout><div>child</div></OrganizerLayout>
    </MemoryRouter>
  );
  const label = screen.getByText("Organizer");
  expect(label).toBeInTheDocument();
  // The redesign moved this label from terracotta to brand violet (#8B3FE0)
  // applied via inline style.
  expect(label.style.color.replace(/\s/g, "").toLowerCase()).toBe("rgb(139,63,224)");
  expect(screen.getByText("child")).toBeInTheDocument();
});
