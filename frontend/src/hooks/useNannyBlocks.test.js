import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useNannyBlocks } from "./useNannyBlocks";

const mockData = [
  { id: "b1", day_of_week: 2, start_time: "09:00", end_time: "13:00", rate_cents: 8000, active: true },
];

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn(() => Promise.resolve({ data: mockData, error: null })),
    })),
  },
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "n1" } }),
}));

describe("useNannyBlocks", () => {
  it("returns the nanny's active blocks", async () => {
    const { result } = renderHook(() => useNannyBlocks());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.blocks).toHaveLength(1);
    expect(result.current.blocks[0].day_of_week).toBe(2);
  });
});
