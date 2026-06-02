import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useOpenSlots } from "./useOpenSlots";

const mockSlots = [
  { id: "s1", nanny_id: "n1", starts_at: "2026-06-10T13:00:00Z", ends_at: "2026-06-10T17:00:00Z", rate_cents: 8000, nanny: { id: "n1", full_name: "Ana", avatar_url: null, service_area_lat: 40, service_area_lng: -74 } },
];

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn(() => Promise.resolve({ data: mockSlots, error: null })),
    })),
  },
}));

describe("useOpenSlots", () => {
  it("loads open slots in a time window", async () => {
    const { result } = renderHook(() => useOpenSlots({
      from: new Date("2026-06-10T00:00:00Z"),
      to: new Date("2026-06-11T00:00:00Z"),
    }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.slots).toHaveLength(1);
    expect(result.current.slots[0].nanny.full_name).toBe("Ana");
  });
});
