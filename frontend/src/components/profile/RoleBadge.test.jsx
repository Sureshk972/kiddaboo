import { render, screen } from "@testing-library/react";
import RoleBadge from "./RoleBadge";

test("renders Organizer pill with terracotta", () => {
  render(<RoleBadge role="organizer" />);
  const badge = screen.getByText("Organizer");
  expect(badge.className).toMatch(/terracotta/);
});

test("renders Parent small text in sage", () => {
  render(<RoleBadge role="parent" />);
  expect(screen.getByText("Parent")).toBeInTheDocument();
});

test("renders nothing for unknown role", () => {
  const { container } = render(<RoleBadge role={null} />);
  expect(container).toBeEmptyDOMElement();
});
