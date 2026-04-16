import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchHostStatus(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchHostStatus(session.user.id);
      } else {
        setProfile(null);
        setIsHost(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, bio, photo_url, philosophy_tags, trust_score, is_verified, created_at, updated_at, notification_prefs, role, account_type")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Failed to fetch profile:", error);
    }
    if (data) {
      setProfile(data);
    }
    setLoading(false);
  };

  // Host = user has at least one membership with role "creator"
  const fetchHostStatus = async (userId) => {
    const { data, error } = await supabase
      .from("memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "creator")
      .limit(1);
    if (error) {
      console.error("Failed to fetch host status:", error);
      return;
    }
    setIsHost(data && data.length > 0);
  };

  const refreshHostStatus = () => {
    if (user) fetchHostStatus(user.id);
  };

  // Sign up with email (simpler than phone for now)
  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  };

  // Sign in with email
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  // Update profile
  const updateProfile = async (updates) => {
    if (!user) return { error: "Not logged in" };

    const { data, error } = await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", user.id)
      .select("id, first_name, last_name, bio, photo_url, philosophy_tags, trust_score, is_verified, created_at, updated_at, notification_prefs, role, account_type")
      .single();

    if (error) {
      console.error("updateProfile failed:", error);
    }
    if (data) {
      setProfile(data);
    }
    return { data, error };
  };

  const isAdmin = profile?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin,
        isHost,
        accountType: profile?.account_type ?? null,
        refreshHostStatus,
        signUp,
        signIn,
        signOut,
        updateProfile,
        fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
