import { render, screen } from "@testing-library/react";
import VerifiedBadge from "./VerifiedBadge";

test("renders check icon when verified", () => {
  render(<VerifiedBadge verified />);
  expect(screen.getByLabelText(/verified/i)).toBeInTheDocument();
});

test("renders nothing when not verified", () => {
  const { container } = render(<VerifiedBadge verified={false} />);
  expect(container).toBeEmptyDOMElement();
});
