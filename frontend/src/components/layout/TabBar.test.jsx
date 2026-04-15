import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TabBar from "./TabBar";
import { vi } from "vitest";

vi.mock("../../context/AuthContext");
import { useAuth } from "../../context/AuthContext";

const setAuth = (accountType) =>
  useAuth.mockReturnValue({
    signOut: vi.fn(),
    isHost: accountType === "organizer",
    accountType,
  });

test("parent sees Browse / My Groups / Messages / Profile", () => {
  setAuth("parent");
  render(<MemoryRouter><TabBar /></MemoryRouter>);
  expect(screen.getByLabelText("Browse")).toBeInTheDocument();
  expect(screen.getByLabelText("My Groups")).toBeInTheDocument();
  expect(screen.queryByLabelText("My Group")).not.toBeInTheDocument();
});

test("organizer sees My Group / Members / Messages / Profile", () => {
  setAuth("organizer");
  render(<MemoryRouter><TabBar /></MemoryRouter>);
  expect(screen.getByLabelText("My Group")).toBeInTheDocument();
  expect(screen.getByLabelText("Members")).toBeInTheDocument();
  expect(screen.queryByLabelText("Browse")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Dashboard")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Insights")).not.toBeInTheDocument();
});
