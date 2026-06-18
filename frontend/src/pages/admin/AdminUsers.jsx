import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import DataTable from "../../components/admin/DataTable";

export default function AdminUsers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from("profiles")
        .select(
          "id, first_name, last_name, role, account_type, is_suspended, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (roleFilter !== "all") q = q.eq("account_type", roleFilter);
      if (statusFilter === "active") q = q.eq("is_suspended", false);
      if (statusFilter === "suspended") q = q.eq("is_suspended", true);
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(`first_name.ilike.${s},last_name.ilike.${s}`);
      }
      const { data, error } = await q;
      if (cancelled) return;
      if (error) console.error(error);
      setRows(data ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [search, roleFilter, statusFilter]);

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (r) => (
        <Link to={`/admin/users/${r.id}`} className="text-sage-dark underline">
          {`${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || "(no name)"}
        </Link>
      ),
    },
    { key: "account_type", header: "Type" },
    { key: "role", header: "Role" },
    {
      key: "is_suspended",
      header: "Status",
      render: (r) => (r.is_suspended ? "Suspended" : "Active"),
    },
    {
      key: "created_at",
      header: "Joined",
      sortable: true,
      render: (r) => new Date(r.created_at).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <h1 className="font-heading font-bold text-charcoal text-xl mb-4">Users</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Search name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-cream-dark rounded-md px-2 py-1 text-sm"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-cream-dark rounded-md px-2 py-1 text-sm"
        >
          <option value="all">All types</option>
          <option value="parent">Parent</option>
          <option value="nanny">Nanny</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-cream-dark rounded-md px-2 py-1 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {loading ? (
        <div className="text-sm text-taupe-dark">Loading…</div>
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          emptyMessage="No users match these filters"
        />
      )}
    </div>
  );
}
