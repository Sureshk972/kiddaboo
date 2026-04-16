import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RequireRole from "./RequireRole";
import { vi } from "vitest";

vi.mock("../../hooks/useAccountType", () => ({ useAccountType: vi.fn() }));
import { useAccountType } from "../../hooks/useAccountType";

function renderAt(initial, role) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/browse" element={<RequireRole role={role}><div>browse-content</div></RequireRole>} />
        <Route path="/host/dashboard" element={<div>dashboard-content</div>} />
      </Routes>
    </MemoryRouter>
  );
}

test("renders children when role matches", () => {
  useAccountType.mockReturnValue({ accountType: "parent", isParent: true, isOrganizer: false, loading: false });
  renderAt("/browse", "parent");
  expect(screen.getByText("browse-content")).toBeInTheDocument();
});

test("redirects organizers away from parent routes", () => {
  useAccountType.mockReturnValue({ accountType: "organizer", isParent: false, isOrganizer: true, loading: false });
  renderAt("/browse", "parent");
  expect(screen.getByText("dashboard-content")).toBeInTheDocument();
});

test("shows loading state while accountType is resolving", () => {
  useAccountType.mockReturnValue({ accountType: null, isParent: false, isOrganizer: false, loading: true });
  renderAt("/browse", "parent");
  expect(screen.queryByText("browse-content")).not.toBeInTheDocument();
  expect(screen.queryByText("dashboard-content")).not.toBeInTheDocument();
});
