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
        <Route path="/" element={<RequireRole role={role}><div>parent-home-content</div></RequireRole>} />
        <Route path="/nanny/dashboard" element={<div>nanny-dashboard-content</div>} />
      </Routes>
    </MemoryRouter>
  );
}

test("renders children when role matches", () => {
  useAccountType.mockReturnValue({ accountType: "parent", isParent: true, isNanny: false, loading: false });
  renderAt("/", "parent");
  expect(screen.getByText("parent-home-content")).toBeInTheDocument();
});

test("redirects nanny away from parent routes", () => {
  useAccountType.mockReturnValue({ accountType: "nanny", isParent: false, isNanny: true, loading: false });
  renderAt("/", "parent");
  expect(screen.getByText("nanny-dashboard-content")).toBeInTheDocument();
});

test("shows loading state while accountType is resolving", () => {
  useAccountType.mockReturnValue({ accountType: null, isParent: false, isNanny: false, loading: true });
  renderAt("/", "parent");
  expect(screen.queryByText("parent-home-content")).not.toBeInTheDocument();
  expect(screen.queryByText("nanny-dashboard-content")).not.toBeInTheDocument();
});
