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

test("offers Parent and Nanny options (not Host/Organizer)", () => {
  render(<MemoryRouter><ChooseRole /></MemoryRouter>);
  expect(screen.getByText(/I'm a Parent/i)).toBeInTheDocument();
  expect(screen.getByText(/I'm a Nanny/i)).toBeInTheDocument();
  expect(screen.queryByText(/Organizer/i)).not.toBeInTheDocument();
});

test("clicking Parent card routes to /verify?role=parent", () => {
  render(<MemoryRouter><ChooseRole /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: /I'm a Parent/i }));
  expect(navigate).toHaveBeenCalledWith("/verify?role=parent");
});

test("clicking Nanny card routes to /verify?role=nanny", () => {
  render(<MemoryRouter><ChooseRole /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: /I'm a Nanny/i }));
  expect(navigate).toHaveBeenCalledWith("/verify?role=nanny");
});

test("offers a sign-in link for returning users", () => {
  render(<MemoryRouter><ChooseRole /></MemoryRouter>);
  const link = screen.getByRole("link", { name: /sign in/i });
  expect(link).toHaveAttribute("href", "/verify?mode=signin");
});
