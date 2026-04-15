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
  // Mock covers both fetchProfile (profiles select → eq → single) and
  // fetchHostStatus (memberships select → eq → eq → limit). Each .eq()
  // returns the same chain so either call shape resolves cleanly.
  const eqChain = {
    single: () => Promise.resolve({ data: { id: "u1", first_name: "A", account_type: "organizer" }, error: null }),
    limit: () => Promise.resolve({ data: [], error: null }),
  };
  eqChain.eq = () => eqChain;
  supabase.from.mockReturnValue({
    select: () => ({ eq: () => eqChain }),
  });

  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );

  await waitFor(() => expect(screen.getByText("type=organizer")).toBeInTheDocument());
});
