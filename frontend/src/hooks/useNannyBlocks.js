import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function useNannyBlocks() {
  const { user } = useAuth();
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("nanny_availability_blocks")
      .select("*")
      .eq("nanny_id", user.id)
      .order("day_of_week", { ascending: true });
    if (!error) setBlocks(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const upsert = useCallback(async (block) => {
    const payload = { ...block, nanny_id: user.id, updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from("nanny_availability_blocks")
      .upsert(payload)
      .select()
      .single();
    if (!error) await refresh();
    return { data, error };
  }, [user, refresh]);

  const remove = useCallback(async (id) => {
    const { error } = await supabase
      .from("nanny_availability_blocks")
      .update({ active: false })
      .eq("id", id);
    if (!error) await refresh();
    return { error };
  }, [refresh]);

  return { blocks, loading, refresh, upsert, remove };
}
