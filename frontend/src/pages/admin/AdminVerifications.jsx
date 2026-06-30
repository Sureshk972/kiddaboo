import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import DataTable from "../../components/admin/DataTable";
import Drawer from "../../components/admin/Drawer";

const TABS = ["pending", "approved", "rejected", "all"];

export default function AdminVerifications() {
  const { user } = useAuth();
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [acting, setActing] = useState(false);

  async function fetchRows(forTab) {
    let q = supabase
      .from("verification_requests")
      .select(
        "id, status, submitted_at, reviewed_at, notes, user_id, profiles:profiles!verification_requests_user_id_fkey(id, first_name, last_name, photo_url, role, account_type, trust_score)"
      )
      .order("submitted_at", { ascending: false });
    if (forTab !== "all") q = q.eq("status", forTab);
    const { data, error } = await q;
    if (error) console.error(error);
    return data ?? [];
  }

  async function load() {
    setLoading(true);
    setRows(await fetchRows(tab));
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRows(tab).then((data) => {
      if (cancelled) return;
      setRows(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  async function decide(status) {
    if (!selected) return;
    setActing(true);
    const patch = {
      status,
      reviewed_at: new Date().toISOString(),
      reviewer_id: user.id,
      notes: status === "rejected" ? (rejectReason || null) : selected.notes,
    };
    const { error } = await supabase
      .from("verification_requests")
      .update(patch)
      .eq("id", selected.id);
    if (error) {
      alert(error.message);
      setActing(false);
      return;
    }
    if (status === "approved") {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_verified: true })
        .eq("id", selected.user_id);
      if (profileError) {
        alert(
          `Request marked approved but profile.is_verified update failed: ${profileError.message}. Set it manually.`
        );
      }
    }
    setActing(false);
    setSelected(null);
    setRejectReason("");
    load();
  }

  const columns = [
    {
      key: "name",
      header: "Applicant",
      render: (r) =>
        `${r.profiles?.first_name ?? ""} ${r.profiles?.last_name ?? ""}`.trim() ||
        "(unknown)",
    },
    { key: "status", header: "Status" },
    {
      key: "submitted_at",
      header: "Submitted",
      sortable: true,
      render: (r) => new Date(r.submitted_at).toLocaleString(),
    },
  ];

  return (
    <div>
      <h1 className="font-heading font-bold text-charcoal text-xl mb-4">Verifications</h1>

      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "px-3 py-1 rounded-md text-sm capitalize " +
              (tab === t
                ? "bg-sage-light text-charcoal font-medium"
                : "bg-white border border-cream-dark text-taupe-dark hover:bg-cream")
            }
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-taupe-dark">Loading…</div>
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          onRowClick={(r) => setSelected(r)}
          emptyMessage={`No ${tab} verifications`}
        />
      )}

      <Drawer
        open={!!selected}
        onClose={() => {
          setSelected(null);
          setRejectReason("");
        }}
        title="Verification request"
      >
        {selected && (
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide text-taupe-dark">Applicant</div>
              <div className="text-charcoal">
                {`${selected.profiles?.first_name ?? ""} ${
                  selected.profiles?.last_name ?? ""
                }`.trim()}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-taupe-dark">Role</div>
              <div className="text-charcoal">
                {selected.profiles?.account_type ?? selected.profiles?.role}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-taupe-dark">Trust score</div>
              <div className="text-charcoal">{selected.profiles?.trust_score ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-taupe-dark">Notes</div>
              <div className="text-charcoal whitespace-pre-wrap">
                {selected.notes || "(none)"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-taupe-dark">Status</div>
              <div className="text-charcoal">{selected.status}</div>
            </div>

            {selected.status === "pending" && (
              <>
                <div className="pt-3">
                  <label className="text-xs uppercase tracking-wide text-taupe-dark block mb-1">
                    Reject reason (optional)
                  </label>
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full border border-cream-dark rounded-md px-2 py-1 text-sm"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    disabled={acting}
                    onClick={() => decide("approved")}
                    className="bg-sage text-white text-sm rounded-md px-3 py-1 disabled:opacity-50"
                    data-track="admin_verification_approve"
                  >
                    {acting ? "Approving…" : "Approve"}
                  </button>
                  <button
                    disabled={acting}
                    onClick={() => decide("rejected")}
                    className="border border-cream-dark text-charcoal text-sm rounded-md px-3 py-1 disabled:opacity-50"
                    data-track="admin_verification_reject"
                  >
                    {acting ? "Rejecting…" : "Reject"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
