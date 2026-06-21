import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import DataTable from "../../components/admin/DataTable";

const TABS = [
  { key: "visible", label: "Visible" },
  { key: "hidden", label: "Hidden" },
];

function starString(rating) {
  const r = Math.max(0, Math.min(5, rating | 0));
  return "★".repeat(r) + "☆".repeat(5 - r);
}

function truncate(s, n) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

export default function AdminFeedback() {
  const { user } = useAuth();
  const [tab, setTab] = useState("visible");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);

  async function fetchRows(forTab) {
    const isHidden = forTab === "hidden";
    const { data, error } = await supabase
      .from("feedback")
      .select("id, rating, comment, created_at, user_id, is_hidden, hidden_at, hidden_by")
      .eq("is_hidden", isHidden)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("AdminFeedback load:", error);
      return [];
    }
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

  async function hide(row) {
    setActingId(row.id);
    const { error } = await supabase
      .from("feedback")
      .update({
        is_hidden: true,
        hidden_at: new Date().toISOString(),
        hidden_by: user?.id ?? null,
      })
      .eq("id", row.id);
    setActingId(null);
    if (error) {
      alert(error.message);
      return;
    }
    load();
  }

  async function unhide(row) {
    setActingId(row.id);
    const { error } = await supabase
      .from("feedback")
      .update({
        is_hidden: false,
        hidden_at: null,
        hidden_by: null,
      })
      .eq("id", row.id);
    setActingId(null);
    if (error) {
      alert(error.message);
      return;
    }
    load();
  }

  const columns = [
    {
      key: "created_at",
      header: "Submitted",
      sortable: true,
      render: (r) => new Date(r.created_at).toLocaleString(),
    },
    {
      key: "rating",
      header: "Rating",
      sortable: true,
      render: (r) => (
        <span className="text-sage-dark tracking-wider" title={`${r.rating} of 5`}>
          {starString(r.rating)}
        </span>
      ),
    },
    {
      key: "comment",
      header: "Comment",
      render: (r) => (
        <span className="text-charcoal">
          {r.comment ? truncate(r.comment, 80) : <span className="text-taupe">—</span>}
        </span>
      ),
    },
    {
      key: "user_id",
      header: "User",
      render: (r) => (
        <Link
          to={`/admin/users/${r.user_id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-sage hover:text-sage-dark underline underline-offset-2 text-xs"
        >
          {r.user_id.slice(0, 8)}…
        </Link>
      ),
    },
    {
      key: "action",
      header: "",
      render: (r) =>
        tab === "visible" ? (
          <button
            disabled={actingId === r.id}
            onClick={(e) => {
              e.stopPropagation();
              hide(r);
            }}
            className="border border-cream-dark text-charcoal text-xs rounded-md px-3 py-1 bg-white hover:bg-cream disabled:opacity-50 cursor-pointer"
          >
            {actingId === r.id ? "Hiding…" : "Hide"}
          </button>
        ) : (
          <button
            disabled={actingId === r.id}
            onClick={(e) => {
              e.stopPropagation();
              unhide(r);
            }}
            className="bg-sage text-white text-xs rounded-md px-3 py-1 hover:bg-sage-dark disabled:opacity-50 cursor-pointer border-none"
          >
            {actingId === r.id ? "Unhiding…" : "Unhide"}
          </button>
        ),
    },
  ];

  return (
    <div>
      <h1 className="font-heading font-bold text-charcoal text-xl mb-4">Feedback</h1>

      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              "px-3 py-1 rounded-md text-sm " +
              (tab === t.key
                ? "bg-sage-light text-charcoal font-medium"
                : "bg-white border border-cream-dark text-taupe-dark hover:bg-cream")
            }
          >
            {t.label}
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
          emptyMessage={tab === "visible" ? "No visible feedback" : "No hidden feedback"}
        />
      )}
    </div>
  );
}
