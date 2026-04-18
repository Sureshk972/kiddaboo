import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ChooseRole from "./ChooseRole";
import { vi } from "vitest";

const navigate = vi.fn();
vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useNavigate: () => navigate,
}));

beforeEach(() => navigate.mockClear());

test("clicking Parent card routes to /verify?role=parent", () => {
  render(<MemoryRouter><ChooseRole /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: /I'm a Parent/i }));
  expect(navigate).toHaveBeenCalledWith("/verify?role=parent");
});

test("clicking Organizer card routes to /verify?role=organizer", () => {
  render(<MemoryRouter><ChooseRole /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: /I'm an Organizer/i }));
  expect(navigate).toHaveBeenCalledWith("/verify?role=organizer");
});

test("renders footer note about adding the other role later", () => {
  render(<MemoryRouter><ChooseRole /></MemoryRouter>);
  expect(screen.getByText(/add the other role later/i)).toBeInTheDocument();
});

test("offers a sign-in link for returning users", () => {
  render(<MemoryRouter><ChooseRole /></MemoryRouter>);
  const link = screen.getByRole("link", { name: /sign in/i });
  expect(link).toHaveAttribute("href", "/verify?mode=signin");
});
