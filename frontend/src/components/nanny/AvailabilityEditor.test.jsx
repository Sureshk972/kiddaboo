import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../../test/testUtils";
import AvailabilityEditor from "./AvailabilityEditor";

vi.mock("../../hooks/useNannyBlocks", () => ({
  useNannyBlocks: () => ({
    blocks: [{ id: "b1", day_of_week: 2, start_time: "09:00", end_time: "13:00", rate_cents: 8000, active: true }],
    loading: false,
    upsert: vi.fn(async () => ({ data: {}, error: null })),
    remove: vi.fn(async () => ({ error: null })),
  }),
}));

describe("AvailabilityEditor", () => {
  it("renders existing blocks grouped by day", () => {
    renderWithProviders(<AvailabilityEditor />);
    expect(screen.getByText(/Tuesday/i)).toBeInTheDocument();
    expect(screen.getByText(/9:00 AM–1:00 PM/)).toBeInTheDocument();
    expect(screen.getByText(/\$80/)).toBeInTheDocument();
  });

  it("opens add-block form when Add is clicked", () => {
    renderWithProviders(<AvailabilityEditor />);
    fireEvent.click(screen.getByRole("button", { name: /add block/i }));
    expect(screen.getByLabelText(/day of week/i)).toBeInTheDocument();
  });
});
