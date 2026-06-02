import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TabBar from "./TabBar";
import { vi } from "vitest";

vi.mock("../../context/AuthContext");
vi.mock("../../hooks/useAccountType");
import { useAuth } from "../../context/AuthContext";
import { useAccountType } from "../../hooks/useAccountType";

const setAuth = (accountType) => {
  useAuth.mockReturnValue({ signOut: vi.fn() });
  useAccountType.mockReturnValue({
    accountType,
    isParent: accountType === "parent",
    isNanny: accountType === "nanny",
    loading: false,
  });
};

test("parent sees Discover / Requests / Upcoming / Profile", () => {
  setAuth("parent");
  render(<MemoryRouter><TabBar /></MemoryRouter>);
  expect(screen.getByLabelText("Discover")).toBeInTheDocument();
  expect(screen.getByLabelText("Requests")).toBeInTheDocument();
  expect(screen.getByLabelText("Upcoming")).toBeInTheDocument();
  expect(screen.queryByLabelText("Inbox")).not.toBeInTheDocument();
});

test("nanny sees Inbox / Availability / Earnings / Profile", () => {
  setAuth("nanny");
  render(<MemoryRouter><TabBar /></MemoryRouter>);
  expect(screen.getByLabelText("Inbox")).toBeInTheDocument();
  expect(screen.getByLabelText("Availability")).toBeInTheDocument();
  expect(screen.getByLabelText("Earnings")).toBeInTheDocument();
  expect(screen.queryByLabelText("Discover")).not.toBeInTheDocument();
});
