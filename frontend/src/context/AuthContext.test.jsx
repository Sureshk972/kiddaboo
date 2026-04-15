import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";
import { vi } from "vitest";

vi.mock("../lib/supabase");

function Probe() {
  const { accountType, loading } = useAuth();
  return <div>type={loading ? "…" : accountType ?? "null"}</div>;
}

test("AuthContext exposes accountType from the profiles row", async () => {
  supabase.auth.getSession.mockResolvedValue({
    data: { session: { user: { id: "u1" } } },
  });
  supabase.auth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
  supabase.from.mockReturnValue({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: { id: "u1", first_name: "A", account_type: "organizer" }, error: null }),
        limit: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  });

  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );

  await waitFor(() => expect(screen.getByText("type=organizer")).toBeInTheDocument());
});
