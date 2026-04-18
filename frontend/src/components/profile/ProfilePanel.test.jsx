import { render, screen } from "@testing-library/react";
import ProfilePanel from "./ProfilePanel";

const organizerSample = {
  id: "p1",
  first_name: "Priya",
  last_name: "Sharma",
  photo_url: null,
  phone_verified_at: "2026-03-01T00:00:00Z",
  account_type: "organizer",
  zip_code: "11530",
  bio: "First-time mom.",
  philosophy_tags: ["Outdoor play"],
  children: [{ name: "Maya", age: 3 }],
  groups_joined_count: 2,
};

const parentSample = { ...organizerSample, account_type: "parent" };

test("renders name, verified label, role label", () => {
  render(<ProfilePanel profile={organizerSample} />);
  expect(screen.getByText("Priya Sharma")).toBeInTheDocument();
  expect(screen.getByText(/verified parent|verified family|verified organizer/i)).toBeInTheDocument();
  expect(screen.getByText("Organizer")).toBeInTheDocument();
});

test("does not render tenure, rating, or groups-in-common (v1 deferred)", () => {
  render(<ProfilePanel profile={organizerSample} />);
  expect(screen.queryByText(/on kiddaboo/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/⭐/)).not.toBeInTheDocument();
  expect(screen.queryByText(/in common/i)).not.toBeInTheDocument();
});

test("renders children card for parent profiles", () => {
  render(<ProfilePanel profile={parentSample} />);
  expect(screen.getByText(/Maya/)).toBeInTheDocument();
});

test("hides kids/groups stats and children card for organizer profiles", () => {
  render(<ProfilePanel profile={organizerSample} />);
  expect(screen.queryByText("Kids")).not.toBeInTheDocument();
  expect(screen.queryByText("Groups")).not.toBeInTheDocument();
  expect(screen.queryByText(/Maya/)).not.toBeInTheDocument();
});
