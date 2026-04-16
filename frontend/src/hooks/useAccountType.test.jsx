import { renderHook } from "@testing-library/react";
import { useAccountType } from "./useAccountType";
import { vi } from "vitest";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));
import { useAuth } from "../context/AuthContext";

test("returns parent/organizer booleans", () => {
  useAuth.mockReturnValue({ accountType: "organizer", loading: false });
  const { result } = renderHook(() => useAccountType());
  expect(result.current).toEqual({
    accountType: "organizer",
    isParent: false,
    isOrganizer: true,
    loading: false,
  });
});

test("returns null+false+false while loading", () => {
  useAuth.mockReturnValue({ accountType: null, loading: true });
  const { result } = renderHook(() => useAccountType());
  expect(result.current.isParent).toBe(false);
  expect(result.current.isOrganizer).toBe(false);
  expect(result.current.loading).toBe(true);
});
