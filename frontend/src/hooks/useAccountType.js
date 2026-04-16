import { useAuth } from "../context/AuthContext";

/**
 * Thin accessor over AuthContext.accountType. Prefer this over reading
 * profile.account_type directly so we have one seam to swap if the
 * source of truth ever moves (e.g., into a JWT claim).
 */
export function useAccountType() {
  const { accountType, loading } = useAuth();
  return {
    accountType,
    isParent: accountType === "parent",
    isOrganizer: accountType === "organizer",
    loading,
  };
}
