import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ParentLayout from "./ParentLayout";
import { vi } from "vitest";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ signOut: vi.fn(), accountType: "parent" }),
}));

test("shows PARENT mode label and renders children", () => {
  render(
    <MemoryRouter>
      <ParentLayout><div>child</div></ParentLayout>
    </MemoryRouter>
  );
  expect(screen.getByText("Parent")).toBeInTheDocument();
  expect(screen.getByText("child")).toBeInTheDocument();
});
