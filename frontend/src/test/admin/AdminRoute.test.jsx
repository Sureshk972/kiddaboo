import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AdminRoute from "../../components/auth/AdminRoute";

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));
import { useAuth } from "../../context/AuthContext";

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<div>home</div>} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <div>admin-content</div>
            </AdminRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("AdminRoute", () => {
  it("renders children when profile.role === 'admin'", () => {
    useAuth.mockReturnValue({
      loading: false,
      user: { id: "u1" },
      profile: { role: "admin" },
    });
    renderAt("/admin");
    expect(screen.getByText("admin-content")).toBeInTheDocument();
  });

  it("redirects to / when role is not admin", () => {
    useAuth.mockReturnValue({
      loading: false,
      user: { id: "u1" },
      profile: { role: "parent" },
    });
    renderAt("/admin");
    expect(screen.getByText("home")).toBeInTheDocument();
    expect(screen.queryByText("admin-content")).not.toBeInTheDocument();
  });

  it("redirects to / when not signed in", () => {
    useAuth.mockReturnValue({ loading: false, user: null, profile: null });
    renderAt("/admin");
    expect(screen.getByText("home")).toBeInTheDocument();
  });

  it("renders nothing while auth is loading", () => {
    useAuth.mockReturnValue({ loading: true, user: null, profile: null });
    const { container } = renderAt("/admin");
    expect(container).toHaveTextContent("");
  });
});
