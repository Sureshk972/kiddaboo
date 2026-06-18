import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import DataTable from "../../components/admin/DataTable";

export default function AdminUserDetail() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: p }, { data: b }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).single(),
        supabase
          .from("bookings")
          .select("id, requested_at, status, rate_cents, platform_fee_cents")
          .or(`parent_id.eq.${id},nanny_id.eq.${id}`)
          .order("requested_at", { ascending: false })
          .limit(50),
      ]);
      if (cancelled) return;
      setProfile(p);
      setBookings(b ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function toggleSuspend() {
    if (!profile) return;
    setActing(true);
    const next = !profile.is_suspended;
    const { error } = await supabase
      .from("profiles")
      .update({ is_suspended: next })
      .eq("id", profile.id);
    if (error) {
      alert(error.message);
    } else {
      setProfile({ ...profile, is_suspended: next });
    }
    setActing(false);
  }

  if (loading) return <div className="text-sm text-taupe-dark">Loading…</div>;
  if (!profile) return <div className="text-sm text-taupe-dark">User not found.</div>;

  const bookingCols = [
    {
      key: "requested_at",
      header: "Requested",
      render: (r) => new Date(r.requested_at).toLocaleString(),
    },
    { key: "status", header: "Status" },
    {
      key: "rate_cents",
      header: "Rate",
      render: (r) => `$${(r.rate_cents / 100).toFixed(2)}`,
    },
    {
      key: "platform_fee_cents",
      header: "Fee",
      render: (r) => `$${(r.platform_fee_cents / 100).toFixed(2)}`,
    },
    {
      key: "id",
      header: "",
      render: (r) => (
        <Link to={`/admin/bookings/${r.id}`} className="text-sage-dark underline">
          View
        </Link>
      ),
    },
  ];

  return (
    <div>
      <Link to="/admin/users" className="text-sm text-taupe-dark underline">
        ← Users
      </Link>
      <div className="flex items-start justify-between mt-2 mb-4">
        <h1 className="font-heading font-bold text-charcoal text-xl">
          {`${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "(no name)"}
        </h1>
        <button
          disabled={acting}
          onClick={toggleSuspend}
          className="border border-cream-dark text-charcoal text-sm rounded-md px-3 py-1 disabled:opacity-50"
        >
          {acting ? "Saving…" : profile.is_suspended ? "Unsuspend" : "Suspend"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
        <div><span className="text-taupe-dark">Type:</span> {profile.account_type}</div>
        <div><span className="text-taupe-dark">Role:</span> {profile.role}</div>
        <div><span className="text-taupe-dark">Status:</span> {profile.is_suspended ? "Suspended" : "Active"}</div>
        <div><span className="text-taupe-dark">Verified:</span> {profile.is_verified ? "Yes" : "No"}</div>
        <div><span className="text-taupe-dark">Phone verified:</span> {profile.is_phone_verified ? "Yes" : "No"}</div>
        <div><span className="text-taupe-dark">Joined:</span> {new Date(profile.created_at).toLocaleDateString()}</div>
      </div>

      <h2 className="font-heading font-bold text-charcoal text-sm mb-2">Recent bookings</h2>
      <DataTable
        rows={bookings}
        columns={bookingCols}
        rowKey={(r) => r.id}
        emptyMessage="No bookings"
      />
    </div>
  );
}
