import { renderHook } from "@testing-library/react";
import { useAccountType } from "./useAccountType";
import { vi } from "vitest";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));
import { useAuth } from "../context/AuthContext";

test("returns parent/nanny booleans", () => {
  useAuth.mockReturnValue({ accountType: "nanny", loading: false });
  const { result } = renderHook(() => useAccountType());
  expect(result.current).toEqual({
    accountType: "nanny",
    isParent: false,
    isNanny: true,
    loading: false,
  });
});

test("returns null+false+false while loading", () => {
  useAuth.mockReturnValue({ accountType: null, loading: true });
  const { result } = renderHook(() => useAccountType());
  expect(result.current.isParent).toBe(false);
  expect(result.current.isNanny).toBe(false);
  expect(result.current.loading).toBe(true);
});
