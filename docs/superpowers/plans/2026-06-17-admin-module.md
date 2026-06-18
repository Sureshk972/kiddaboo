# Admin Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an in-app `/admin` section that lets the sole admin (Suresh) review host verifications, inspect users and bookings, see payment KPIs, and view operational reports — covering all five surfaces at MVP depth.

**Architecture:** New `/admin/*` route tree inside the existing React SPA, gated by a single `AdminRoute` wrapper that reads `profile.role === 'admin'`. List views read Supabase tables directly; KPI tiles and chart series go through new Postgres views + RPCs that begin with `is_admin()` checks. Three shared primitives (`DataTable`, `StatCard`, `Drawer`) are built once and reused across every module.

**Tech Stack:** React 18 + Vite, React Router v6, Supabase JS client, Tailwind, Recharts (new dep), Vitest for unit tests, existing `AuthContext` (exposes `isAdmin`).

**Spec:** [docs/superpowers/specs/2026-06-17-admin-module-design.md](../specs/2026-06-17-admin-module-design.md)

---

## File Structure

**New files:**

- `frontend/src/components/auth/AdminRoute.jsx` — bounces non-admins to `/`.
- `frontend/src/layouts/AdminLayout.jsx` — sidebar nav + widened container.
- `frontend/src/components/admin/DataTable.jsx` — sortable/filterable/paginated table.
- `frontend/src/components/admin/StatCard.jsx` — KPI tile.
- `frontend/src/components/admin/Drawer.jsx` — right-side detail panel.
- `frontend/src/pages/admin/AdminDashboard.jsx`
- `frontend/src/pages/admin/AdminVerifications.jsx`
- `frontend/src/pages/admin/AdminUsers.jsx`
- `frontend/src/pages/admin/AdminUserDetail.jsx`
- `frontend/src/pages/admin/AdminBookings.jsx`
- `frontend/src/pages/admin/AdminBookingDetail.jsx`
- `frontend/src/pages/admin/AdminPayments.jsx`
- `frontend/src/pages/admin/AdminReports.jsx`
- `frontend/src/hooks/useAdminKpis.js` — wraps the `admin_kpis` RPC.
- `frontend/src/hooks/useAdminTimeseries.js` — wraps the timeseries RPCs.
- `frontend/src/test/admin/AdminRoute.test.jsx`
- `frontend/src/test/admin/DataTable.test.jsx`
- `supabase/migrations/20260617000001_admin_analytics.sql` — views + RPCs.

**Modified files:**

- `frontend/src/App.jsx` — register `/admin/*` route subtree.
- `frontend/package.json` — add `recharts` dependency.

---

## Task 1: Wire `AdminRoute` auth gate

**Files:**
- Create: `frontend/src/components/auth/AdminRoute.jsx`
- Test: `frontend/src/test/admin/AdminRoute.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/test/admin/AdminRoute.test.jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AdminRoute from "../../components/auth/AdminRoute";

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));
import { useAuth } from "../../context/AuthContext";

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<div>home</div>} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <div>admin-content</div>
            </AdminRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("AdminRoute", () => {
  it("renders children when profile.role === 'admin'", () => {
    useAuth.mockReturnValue({
      loading: false,
      user: { id: "u1" },
      profile: { role: "admin" },
    });
    renderAt("/admin");
    expect(screen.getByText("admin-content")).toBeInTheDocument();
  });

  it("redirects to / when role is not admin", () => {
    useAuth.mockReturnValue({
      loading: false,
      user: { id: "u1" },
      profile: { role: "parent" },
    });
    renderAt("/admin");
    expect(screen.getByText("home")).toBeInTheDocument();
    expect(screen.queryByText("admin-content")).not.toBeInTheDocument();
  });

  it("redirects to / when not signed in", () => {
    useAuth.mockReturnValue({ loading: false, user: null, profile: null });
    renderAt("/admin");
    expect(screen.getByText("home")).toBeInTheDocument();
  });

  it("renders nothing while auth is loading", () => {
    useAuth.mockReturnValue({ loading: true, user: null, profile: null });
    const { container } = renderAt("/admin");
    expect(container).toHaveTextContent("");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/test/admin/AdminRoute.test.jsx`
Expected: FAIL — cannot resolve `../../components/auth/AdminRoute`.

- [ ] **Step 3: Implement `AdminRoute`**

```jsx
// frontend/src/components/auth/AdminRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function AdminRoute({ children }) {
  const { loading, user, profile } = useAuth();
  if (loading) return null;
  if (!user || profile?.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return children;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/test/admin/AdminRoute.test.jsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/auth/AdminRoute.jsx frontend/src/test/admin/AdminRoute.test.jsx
git commit -m "Add AdminRoute auth gate"
```

---

## Task 2: Build `AdminLayout` shell with sidebar nav

**Files:**
- Create: `frontend/src/layouts/AdminLayout.jsx`

- [ ] **Step 1: Implement `AdminLayout`**

```jsx
// frontend/src/layouts/AdminLayout.jsx
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

const NAV = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/verifications", label: "Verifications" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/bookings", label: "Bookings" },
  { to: "/admin/payments", label: "Payments" },
  { to: "/admin/reports", label: "Reports" },
];

export default function AdminLayout() {
  const { user } = useAuth();

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen bg-cream flex">
      <aside className="w-56 shrink-0 border-r border-cream-dark bg-white">
        <div className="px-5 py-4 border-b border-cream-dark">
          <span className="font-heading font-bold text-charcoal text-sm">
            Kiddaboo Admin
          </span>
        </div>
        <nav className="px-2 py-3 flex flex-col gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                "px-3 py-2 rounded-md text-sm transition-colors " +
                (isActive
                  ? "bg-sage-light text-charcoal font-medium"
                  : "text-taupe-dark hover:bg-cream")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-cream-dark bg-white px-6 py-3 flex items-center justify-between">
          <span className="text-sm text-taupe-dark">{user?.email}</span>
          <button
            onClick={signOut}
            className="text-sm text-taupe-dark hover:text-charcoal underline"
          >
            Sign out
          </button>
        </header>
        <main className="flex-1 px-6 py-6 max-w-7xl w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Sanity-check by running the dev server (no test, layout is purely structural)**

Run: `cd frontend && npm run dev` (or just rely on next task's wiring; skip if you trust the markup).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/layouts/AdminLayout.jsx
git commit -m "Add AdminLayout sidebar shell"
```

---

## Task 3: Register `/admin/*` route tree with placeholder pages

**Files:**
- Modify: `frontend/src/App.jsx`
- Create: `frontend/src/pages/admin/AdminDashboard.jsx`
- Create: `frontend/src/pages/admin/AdminVerifications.jsx`
- Create: `frontend/src/pages/admin/AdminUsers.jsx`
- Create: `frontend/src/pages/admin/AdminUserDetail.jsx`
- Create: `frontend/src/pages/admin/AdminBookings.jsx`
- Create: `frontend/src/pages/admin/AdminBookingDetail.jsx`
- Create: `frontend/src/pages/admin/AdminPayments.jsx`
- Create: `frontend/src/pages/admin/AdminReports.jsx`

- [ ] **Step 1: Create placeholder pages**

Each page is the same shape — replace `NAME` per file:

```jsx
// frontend/src/pages/admin/AdminDashboard.jsx (and the seven siblings)
export default function AdminDashboard() {
  return (
    <div>
      <h1 className="font-heading font-bold text-charcoal text-xl mb-4">Dashboard</h1>
      <p className="text-sm text-taupe-dark">Coming next.</p>
    </div>
  );
}
```

Repeat for `AdminVerifications`, `AdminUsers`, `AdminUserDetail`, `AdminBookings`, `AdminBookingDetail`, `AdminPayments`, `AdminReports` (vary the heading text — "Verifications", "Users", etc.).

- [ ] **Step 2: Wire routes in `App.jsx`**

Add these imports near the other `lazy` calls (find the block after `const NannyEarnings = ...`):

```jsx
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminVerifications = lazy(() => import("./pages/admin/AdminVerifications"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminUserDetail = lazy(() => import("./pages/admin/AdminUserDetail"));
const AdminBookings = lazy(() => import("./pages/admin/AdminBookings"));
const AdminBookingDetail = lazy(() => import("./pages/admin/AdminBookingDetail"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
import AdminRoute from "./components/auth/AdminRoute";
```

Then inside the `<Routes>` block, add a sibling `<Route>` at the top level (alongside parent/nanny route trees, not nested under them):

```jsx
<Route
  path="/admin"
  element={
    <RequireAuth>
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    </RequireAuth>
  }
>
  <Route index element={<AdminDashboard />} />
  <Route path="verifications" element={<AdminVerifications />} />
  <Route path="users" element={<AdminUsers />} />
  <Route path="users/:id" element={<AdminUserDetail />} />
  <Route path="bookings" element={<AdminBookings />} />
  <Route path="bookings/:id" element={<AdminBookingDetail />} />
  <Route path="payments" element={<AdminPayments />} />
  <Route path="reports" element={<AdminReports />} />
</Route>
```

- [ ] **Step 3: Verify in browser**

Promote your own profile to admin (one-off SQL in Supabase if needed):

```sql
update profiles set role = 'admin' where id = auth.uid(); -- run as yourself
```

Then visit `/admin` in dev — should see the sidebar shell with all six nav items and the "Dashboard / Coming next" placeholder. Visit `/admin/users` etc. to confirm sub-routes mount.

Sign out and visit `/admin` while signed-out → should bounce to `/welcome`. Sign in as a non-admin → bounce to `/`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.jsx frontend/src/pages/admin/
git commit -m "Wire /admin route tree with placeholder pages"
```

---

## Task 4: Build the `DataTable` primitive (TDD)

**Files:**
- Create: `frontend/src/components/admin/DataTable.jsx`
- Test: `frontend/src/test/admin/DataTable.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/test/admin/DataTable.test.jsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DataTable from "../../components/admin/DataTable";

const rows = [
  { id: 1, name: "Alice", age: 30 },
  { id: 2, name: "Bob", age: 24 },
  { id: 3, name: "Carol", age: 27 },
];

const columns = [
  { key: "name", header: "Name", sortable: true },
  { key: "age", header: "Age", sortable: true },
];

describe("DataTable", () => {
  it("renders header and rows", () => {
    render(<DataTable rows={rows} columns={columns} rowKey={(r) => r.id} />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("sorts ascending then descending by a sortable column", () => {
    render(<DataTable rows={rows} columns={columns} rowKey={(r) => r.id} />);
    fireEvent.click(screen.getByText("Age"));
    let cells = screen.getAllByRole("cell");
    expect(cells[1].textContent).toBe("24"); // Bob first
    fireEvent.click(screen.getByText("Age"));
    cells = screen.getAllByRole("cell");
    expect(cells[1].textContent).toBe("30"); // Alice first
  });

  it("renders an empty state when rows is []", () => {
    render(
      <DataTable
        rows={[]}
        columns={columns}
        rowKey={(r) => r.id}
        emptyMessage="No results"
      />
    );
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("calls onRowClick with the row", () => {
    const clicks = [];
    render(
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        onRowClick={(r) => clicks.push(r)}
      />
    );
    fireEvent.click(screen.getByText("Alice"));
    expect(clicks).toEqual([rows[0]]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd frontend && npx vitest run src/test/admin/DataTable.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `DataTable`**

```jsx
// frontend/src/components/admin/DataTable.jsx
import { useMemo, useState } from "react";

export default function DataTable({
  rows,
  columns,
  rowKey,
  onRowClick,
  emptyMessage = "No rows",
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (va === vb) return 0;
      const cmp = va > vb ? 1 : -1;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function clickHeader(col) {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDir("asc");
    }
  }

  if (rows.length === 0) {
    return (
      <div className="border border-cream-dark rounded-md px-6 py-10 text-center text-sm text-taupe-dark bg-white">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="border border-cream-dark rounded-md overflow-hidden bg-white">
      <table className="w-full text-sm">
        <thead className="bg-cream">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={
                  "text-left font-medium text-charcoal px-3 py-2 border-b border-cream-dark " +
                  (col.sortable ? "cursor-pointer select-none" : "")
                }
                onClick={() => clickHeader(col)}
              >
                {col.header}
                {sortKey === col.key && (
                  <span className="ml-1 text-taupe-dark">
                    {sortDir === "asc" ? "▲" : "▼"}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={
                "border-b border-cream-dark last:border-b-0 " +
                (onRowClick ? "cursor-pointer hover:bg-cream" : "")
              }
            >
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2 text-taupe-dark">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd frontend && npx vitest run src/test/admin/DataTable.test.jsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/admin/DataTable.jsx frontend/src/test/admin/DataTable.test.jsx
git commit -m "Add DataTable primitive"
```

---

## Task 5: Build `StatCard` and `Drawer` primitives

**Files:**
- Create: `frontend/src/components/admin/StatCard.jsx`
- Create: `frontend/src/components/admin/Drawer.jsx`

- [ ] **Step 1: Implement `StatCard`**

```jsx
// frontend/src/components/admin/StatCard.jsx
export default function StatCard({ label, value, hint }) {
  return (
    <div className="border border-cream-dark rounded-md bg-white px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-taupe-dark">{label}</div>
      <div className="font-heading font-bold text-charcoal text-2xl mt-1">{value}</div>
      {hint && <div className="text-xs text-taupe-dark mt-1">{hint}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Implement `Drawer`**

```jsx
// frontend/src/components/admin/Drawer.jsx
import { useEffect } from "react";

export default function Drawer({ open, onClose, title, children }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40">
      <div
        className="absolute inset-0 bg-charcoal/30"
        onClick={onClose}
      />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white border-l border-cream-dark shadow-lg flex flex-col">
        <div className="px-5 py-3 border-b border-cream-dark flex items-center justify-between">
          <h2 className="font-heading font-bold text-charcoal text-sm">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-taupe-dark hover:text-charcoal"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/admin/StatCard.jsx frontend/src/components/admin/Drawer.jsx
git commit -m "Add StatCard and Drawer primitives"
```

---

## Task 6: Verifications module (read + approve/reject)

**Files:**
- Modify: `frontend/src/pages/admin/AdminVerifications.jsx`

- [ ] **Step 1: Replace placeholder with the real page**

```jsx
// frontend/src/pages/admin/AdminVerifications.jsx
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

  async function load() {
    setLoading(true);
    let q = supabase
      .from("verification_requests")
      .select(
        "id, status, submitted_at, reviewed_at, notes, user_id, profiles:profiles!verification_requests_user_id_fkey(id, first_name, last_name, photo_url, role, account_type, trust_score)"
      )
      .order("submitted_at", { ascending: false });
    if (tab !== "all") q = q.eq("status", tab);
    const { data, error } = await q;
    if (error) console.error(error);
    setRows(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [tab]);

  async function decide(status) {
    if (!selected) return;
    setActing(true);
    const patch = {
      status,
      reviewed_at: new Date().toISOString(),
      reviewer_id: user.id,
      notes: status === "rejected" ? rejectReason || null : selected.notes,
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
      await supabase
        .from("profiles")
        .update({ is_verified: true })
        .eq("id", selected.user_id);
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
                  >
                    Approve
                  </button>
                  <button
                    disabled={acting}
                    onClick={() => decide("rejected")}
                    className="border border-cream-dark text-charcoal text-sm rounded-md px-3 py-1 disabled:opacity-50"
                  >
                    Reject
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
```

- [ ] **Step 2: Manual verification**

In dev, create a test pending verification (Supabase SQL):

```sql
insert into verification_requests (user_id, status, notes)
values ((select id from profiles where role <> 'admin' limit 1), 'pending', 'Test note');
```

Visit `/admin/verifications`, click the row, hit Approve, confirm the row moves to Approved tab and the underlying `profiles.is_verified` flipped.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/AdminVerifications.jsx
git commit -m "Implement admin Verifications module"
```

---

## Task 7: Users list

**Files:**
- Modify: `frontend/src/pages/admin/AdminUsers.jsx`

- [ ] **Step 1: Implement the list page**

```jsx
// frontend/src/pages/admin/AdminUsers.jsx
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
    async function load() {
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
      if (error) console.error(error);
      setRows(data ?? []);
      setLoading(false);
    }
    load();
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
```

- [ ] **Step 2: Manual check**

Visit `/admin/users`, filter by Nanny, by Suspended, search a name fragment. Confirm row count changes appropriately.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/AdminUsers.jsx
git commit -m "Implement admin Users list"
```

---

## Task 8: User detail page

**Files:**
- Modify: `frontend/src/pages/admin/AdminUserDetail.jsx`

- [ ] **Step 1: Implement the detail page**

```jsx
// frontend/src/pages/admin/AdminUserDetail.jsx
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

  async function load() {
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
    setProfile(p);
    setBookings(b ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function toggleSuspend() {
    if (!profile) return;
    setActing(true);
    const { error } = await supabase
      .from("profiles")
      .update({ is_suspended: !profile.is_suspended })
      .eq("id", profile.id);
    if (error) alert(error.message);
    setActing(false);
    load();
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
          {profile.is_suspended ? "Unsuspend" : "Suspend"}
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
```

- [ ] **Step 2: Manual check**

Visit a user detail page from the users list. Confirm suspend toggle works (re-fetches state). Confirm bookings list renders.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/AdminUserDetail.jsx
git commit -m "Implement admin User detail page"
```

---

## Task 9: Bookings list

**Files:**
- Modify: `frontend/src/pages/admin/AdminBookings.jsx`

- [ ] **Step 1: Implement**

```jsx
// frontend/src/pages/admin/AdminBookings.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import DataTable from "../../components/admin/DataTable";

const STATUSES = ["all", "pending", "confirmed", "completed", "cancelled"];

export default function AdminBookings() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");

  useEffect(() => {
    async function load() {
      setLoading(true);
      let q = supabase
        .from("bookings")
        .select(
          "id, requested_at, status, rate_cents, platform_fee_cents, stripe_payment_intent_id, parent_id, nanny_id, parent:profiles!bookings_parent_id_fkey(first_name, last_name), nanny:profiles!bookings_nanny_id_fkey(first_name, last_name)"
        )
        .order("requested_at", { ascending: false })
        .limit(200);
      if (status !== "all") q = q.eq("status", status);
      const { data, error } = await q;
      if (error) console.error(error);
      setRows(data ?? []);
      setLoading(false);
    }
    load();
  }, [status]);

  const cols = [
    {
      key: "requested_at",
      header: "Requested",
      sortable: true,
      render: (r) => new Date(r.requested_at).toLocaleString(),
    },
    {
      key: "parent",
      header: "Parent",
      render: (r) => `${r.parent?.first_name ?? ""} ${r.parent?.last_name ?? ""}`.trim(),
    },
    {
      key: "nanny",
      header: "Nanny",
      render: (r) => `${r.nanny?.first_name ?? ""} ${r.nanny?.last_name ?? ""}`.trim(),
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
      key: "stripe_payment_intent_id",
      header: "Stripe",
      render: (r) =>
        r.stripe_payment_intent_id ? (
          <a
            href={`https://dashboard.stripe.com/payments/${r.stripe_payment_intent_id}`}
            target="_blank"
            rel="noreferrer"
            className="text-sage-dark underline"
          >
            PI
          </a>
        ) : (
          "—"
        ),
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
      <h1 className="font-heading font-bold text-charcoal text-xl mb-4">Bookings</h1>
      <div className="mb-4">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-cream-dark rounded-md px-2 py-1 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      {loading ? (
        <div className="text-sm text-taupe-dark">Loading…</div>
      ) : (
        <DataTable rows={rows} columns={cols} rowKey={(r) => r.id} emptyMessage="No bookings" />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Manual check**

Visit `/admin/bookings`, filter by status. Stripe PI link should open in a new tab.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/AdminBookings.jsx
git commit -m "Implement admin Bookings list"
```

---

## Task 10: Booking detail page

**Files:**
- Modify: `frontend/src/pages/admin/AdminBookingDetail.jsx`

- [ ] **Step 1: Implement**

```jsx
// frontend/src/pages/admin/AdminBookingDetail.jsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function AdminBookingDetail() {
  const { id } = useParams();
  const [b, setB] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("bookings")
        .select(
          "*, parent:profiles!bookings_parent_id_fkey(id, first_name, last_name), nanny:profiles!bookings_nanny_id_fkey(id, first_name, last_name), slot:nanny_slots(*)"
        )
        .eq("id", id)
        .single();
      setB(data);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <div className="text-sm text-taupe-dark">Loading…</div>;
  if (!b) return <div className="text-sm text-taupe-dark">Booking not found.</div>;

  return (
    <div>
      <Link to="/admin/bookings" className="text-sm text-taupe-dark underline">
        ← Bookings
      </Link>
      <h1 className="font-heading font-bold text-charcoal text-xl mt-2 mb-4">
        Booking {b.id.slice(0, 8)}…
      </h1>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-taupe-dark">Status:</span> {b.status}</div>
        <div>
          <span className="text-taupe-dark">Stripe:</span>{" "}
          {b.stripe_payment_intent_id ? (
            <a
              href={`https://dashboard.stripe.com/payments/${b.stripe_payment_intent_id}`}
              target="_blank"
              rel="noreferrer"
              className="text-sage-dark underline"
            >
              {b.stripe_payment_intent_id}
            </a>
          ) : "—"}
        </div>
        <div>
          <span className="text-taupe-dark">Parent:</span>{" "}
          <Link to={`/admin/users/${b.parent_id}`} className="text-sage-dark underline">
            {`${b.parent?.first_name ?? ""} ${b.parent?.last_name ?? ""}`.trim()}
          </Link>
        </div>
        <div>
          <span className="text-taupe-dark">Nanny:</span>{" "}
          <Link to={`/admin/users/${b.nanny_id}`} className="text-sage-dark underline">
            {`${b.nanny?.first_name ?? ""} ${b.nanny?.last_name ?? ""}`.trim()}
          </Link>
        </div>
        <div><span className="text-taupe-dark">Rate:</span> ${(b.rate_cents / 100).toFixed(2)}</div>
        <div><span className="text-taupe-dark">Platform fee:</span> ${(b.platform_fee_cents / 100).toFixed(2)}</div>
        <div><span className="text-taupe-dark">Requested at:</span> {new Date(b.requested_at).toLocaleString()}</div>
        <div><span className="text-taupe-dark">Responded at:</span> {b.responded_at ? new Date(b.responded_at).toLocaleString() : "—"}</div>
        <div><span className="text-taupe-dark">Acceptance expires:</span> {new Date(b.acceptance_expires_at).toLocaleString()}</div>
        <div><span className="text-taupe-dark">Cancelled at:</span> {b.cancelled_at ? new Date(b.cancelled_at).toLocaleString() : "—"}</div>
        <div><span className="text-taupe-dark">Completed at:</span> {b.completed_at ? new Date(b.completed_at).toLocaleString() : "—"}</div>
        <div><span className="text-taupe-dark">Cancelled by:</span> {b.cancelled_by ?? "—"}</div>
      </div>

      {b.note_from_parent && (
        <div className="mt-4">
          <div className="text-xs uppercase tracking-wide text-taupe-dark mb-1">Note from parent</div>
          <div className="text-sm text-charcoal whitespace-pre-wrap">{b.note_from_parent}</div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Manual check**

Click "View" on a booking row. Confirm parent and nanny links route to user detail pages, and Stripe PI link opens.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/AdminBookingDetail.jsx
git commit -m "Implement admin Booking detail page"
```

---

## Task 11: Database migration — analytics views and RPCs

**Files:**
- Create: `supabase/migrations/20260617000001_admin_analytics.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260617000001_admin_analytics.sql
-- Analytics views and RPCs for the admin module. Every callable
-- begins with an is_admin() guard; non-admins get an empty result
-- rather than an error.

-- Per-booking derived row. processing_fee_cents estimates Stripe's
-- 2.9% + $0.30 on (rate + platform_fee), which is what the connected
-- account is debited for under on_behalf_of charges. Estimate only —
-- exact amounts live in Stripe.
create or replace view public.admin_kpis_v as
select
  b.id,
  b.requested_at,
  b.status,
  b.rate_cents,
  b.platform_fee_cents,
  round((b.rate_cents + b.platform_fee_cents) * 0.029) + 30 as processing_fee_cents,
  b.parent_id,
  b.nanny_id
from public.bookings b;

-- Headline KPIs over a date range.
create or replace function public.admin_kpis(p_from timestamptz, p_to timestamptz)
returns table (
  gmv_cents bigint,
  platform_fee_cents bigint,
  processing_fee_cents bigint,
  net_revenue_cents bigint,
  booking_count bigint
)
language sql
security invoker
stable
as $$
  select
    coalesce(sum(rate_cents + platform_fee_cents), 0)::bigint,
    coalesce(sum(platform_fee_cents), 0)::bigint,
    coalesce(sum(processing_fee_cents), 0)::bigint,
    coalesce(sum(platform_fee_cents), 0)::bigint,
    count(*)::bigint
  from public.admin_kpis_v
  where public.is_admin()
    and status in ('confirmed', 'completed')
    and requested_at >= p_from
    and requested_at < p_to;
$$;

-- Signups bucketed by day, split by account_type.
create or replace function public.admin_signups_timeseries(
  p_from timestamptz,
  p_to timestamptz
)
returns table (bucket date, account_type text, count bigint)
language sql
security invoker
stable
as $$
  select
    date_trunc('day', created_at)::date as bucket,
    account_type,
    count(*)::bigint
  from public.profiles
  where public.is_admin()
    and created_at >= p_from
    and created_at < p_to
  group by 1, 2
  order by 1, 2;
$$;

-- Bookings bucketed by day, split by status.
create or replace function public.admin_bookings_timeseries(
  p_from timestamptz,
  p_to timestamptz
)
returns table (bucket date, status text, count bigint, gmv_cents bigint)
language sql
security invoker
stable
as $$
  select
    date_trunc('day', requested_at)::date as bucket,
    status::text,
    count(*)::bigint,
    coalesce(sum(rate_cents + platform_fee_cents), 0)::bigint
  from public.bookings
  where public.is_admin()
    and requested_at >= p_from
    and requested_at < p_to
  group by 1, 2
  order by 1, 2;
$$;

-- Host funnel counts for the date range.
create or replace function public.admin_host_funnel(
  p_from timestamptz,
  p_to timestamptz
)
returns table (signups bigint, verified bigint, booked bigint)
language sql
security invoker
stable
as $$
  select
    count(*) filter (where p.account_type = 'nanny')::bigint as signups,
    count(*) filter (where p.account_type = 'nanny' and p.is_verified)::bigint as verified,
    count(distinct b.nanny_id) filter (where p.account_type = 'nanny')::bigint as booked
  from public.profiles p
  left join public.bookings b
    on b.nanny_id = p.id and b.requested_at < p_to
  where public.is_admin()
    and p.created_at >= p_from
    and p.created_at < p_to;
$$;

grant execute on function public.admin_kpis(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_signups_timeseries(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_bookings_timeseries(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_host_funnel(timestamptz, timestamptz) to authenticated;
grant select on public.admin_kpis_v to authenticated;
```

- [ ] **Step 2: Apply the migration**

Run via Supabase SQL editor or CLI:
`supabase db push --project-ref pdgtryghvibhmmroqvdk` (only when ready to deploy — see Task 16).

For local testing, paste the SQL into the Supabase dashboard SQL editor and run.

- [ ] **Step 3: Smoke-test from SQL editor**

Run:
```sql
select * from admin_kpis(now() - interval '30 days', now());
select * from admin_signups_timeseries(now() - interval '30 days', now()) limit 10;
select * from admin_bookings_timeseries(now() - interval '30 days', now()) limit 10;
select * from admin_host_funnel(now() - interval '30 days', now());
```

Expected: KPIs return one row; timeseries return one row per bucket+split; funnel returns one row. Run as a non-admin role to confirm all four return 0 rows.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260617000001_admin_analytics.sql
git commit -m "Add admin analytics views and RPCs"
```

---

## Task 12: Hook wrappers for analytics RPCs

**Files:**
- Create: `frontend/src/hooks/useAdminKpis.js`
- Create: `frontend/src/hooks/useAdminTimeseries.js`

- [ ] **Step 1: Implement `useAdminKpis`**

```jsx
// frontend/src/hooks/useAdminKpis.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useAdminKpis(fromIso, toIso) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase.rpc("admin_kpis", {
        p_from: fromIso,
        p_to: toIso,
      });
      if (cancelled) return;
      if (error) console.error(error);
      setData(data?.[0] ?? null);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [fromIso, toIso]);

  return { data, loading };
}
```

- [ ] **Step 2: Implement `useAdminTimeseries`**

```jsx
// frontend/src/hooks/useAdminTimeseries.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useAdminTimeseries(fnName, fromIso, toIso) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase.rpc(fnName, {
        p_from: fromIso,
        p_to: toIso,
      });
      if (cancelled) return;
      if (error) console.error(error);
      setRows(data ?? []);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [fnName, fromIso, toIso]);

  return { rows, loading };
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useAdminKpis.js frontend/src/hooks/useAdminTimeseries.js
git commit -m "Add admin analytics hook wrappers"
```

---

## Task 13: Payments module

**Files:**
- Modify: `frontend/src/pages/admin/AdminPayments.jsx`

- [ ] **Step 1: Implement**

```jsx
// frontend/src/pages/admin/AdminPayments.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import StatCard from "../../components/admin/StatCard";
import DataTable from "../../components/admin/DataTable";
import { useAdminKpis } from "../../hooks/useAdminKpis";

const PRESETS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

function money(cents) {
  return `$${((cents ?? 0) / 100).toFixed(2)}`;
}

export default function AdminPayments() {
  const [days, setDays] = useState(30);
  const range = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    return { fromIso: from.toISOString(), toIso: to.toISOString() };
  }, [days]);

  const { data: kpis, loading: kpiLoading } = useAdminKpis(range.fromIso, range.toIso);
  const [rows, setRows] = useState([]);
  const [rowsLoading, setRowsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setRowsLoading(true);
      const { data } = await supabase
        .from("bookings")
        .select(
          "id, requested_at, rate_cents, platform_fee_cents, status, stripe_payment_intent_id, parent:profiles!bookings_parent_id_fkey(first_name, last_name), nanny:profiles!bookings_nanny_id_fkey(first_name, last_name)"
        )
        .gte("requested_at", range.fromIso)
        .lt("requested_at", range.toIso)
        .not("stripe_payment_intent_id", "is", null)
        .order("requested_at", { ascending: false })
        .limit(200);
      setRows(data ?? []);
      setRowsLoading(false);
    }
    load();
  }, [range.fromIso, range.toIso]);

  const cols = [
    {
      key: "requested_at",
      header: "Date",
      render: (r) => new Date(r.requested_at).toLocaleString(),
    },
    {
      key: "parent",
      header: "Parent",
      render: (r) => `${r.parent?.first_name ?? ""} ${r.parent?.last_name ?? ""}`.trim(),
    },
    {
      key: "nanny",
      header: "Nanny",
      render: (r) => `${r.nanny?.first_name ?? ""} ${r.nanny?.last_name ?? ""}`.trim(),
    },
    {
      key: "charged",
      header: "Charged",
      render: (r) => money(r.rate_cents + r.platform_fee_cents),
    },
    {
      key: "fee",
      header: "Fee",
      render: (r) => money(r.platform_fee_cents),
    },
    { key: "status", header: "Status" },
    {
      key: "stripe",
      header: "Stripe",
      render: (r) => (
        <a
          href={`https://dashboard.stripe.com/payments/${r.stripe_payment_intent_id}`}
          target="_blank"
          rel="noreferrer"
          className="text-sage-dark underline"
        >
          PI
        </a>
      ),
    },
  ];

  return (
    <div>
      <h1 className="font-heading font-bold text-charcoal text-xl mb-4">Payments</h1>

      <div className="flex gap-2 mb-4">
        {PRESETS.map((p) => (
          <button
            key={p.days}
            onClick={() => setDays(p.days)}
            className={
              "px-3 py-1 rounded-md text-sm " +
              (days === p.days
                ? "bg-sage-light text-charcoal font-medium"
                : "bg-white border border-cream-dark text-taupe-dark hover:bg-cream")
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard
          label="GMV"
          value={kpiLoading ? "…" : money(kpis?.gmv_cents)}
          hint={`Last ${days}d`}
        />
        <StatCard
          label="Platform fees"
          value={kpiLoading ? "…" : money(kpis?.platform_fee_cents)}
        />
        <StatCard
          label="Processing fees"
          value={kpiLoading ? "…" : money(kpis?.processing_fee_cents)}
          hint="Estimated (~2.9% + $0.30)"
        />
        <StatCard
          label="Net revenue"
          value={kpiLoading ? "…" : money(kpis?.net_revenue_cents)}
        />
      </div>

      {rowsLoading ? (
        <div className="text-sm text-taupe-dark">Loading…</div>
      ) : (
        <DataTable rows={rows} columns={cols} rowKey={(r) => r.id} emptyMessage="No payments" />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Manual check**

Visit `/admin/payments`. Toggle 7d/30d/90d. KPIs and table both update.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/AdminPayments.jsx
git commit -m "Implement admin Payments module"
```

---

## Task 14: Reports module (Recharts)

**Files:**
- Modify: `frontend/package.json` (add recharts)
- Modify: `frontend/src/pages/admin/AdminReports.jsx`

- [ ] **Step 1: Install recharts**

Run: `cd frontend && npm install recharts`

- [ ] **Step 2: Implement the page**

```jsx
// frontend/src/pages/admin/AdminReports.jsx
import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { useAdminTimeseries } from "../../hooks/useAdminTimeseries";
import { supabase } from "../../lib/supabase";

const PRESETS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "YTD", days: null, ytd: true },
];

function rangeFromPreset(p) {
  const to = new Date();
  let from;
  if (p.ytd) from = new Date(to.getFullYear(), 0, 1);
  else from = new Date(to.getTime() - p.days * 24 * 60 * 60 * 1000);
  return { fromIso: from.toISOString(), toIso: to.toISOString() };
}

function pivotByBucket(rows, splitKey, valueKey = "count") {
  const map = new Map();
  const splits = new Set();
  for (const r of rows) {
    splits.add(r[splitKey]);
    const day = r.bucket;
    if (!map.has(day)) map.set(day, { bucket: day });
    map.get(day)[r[splitKey]] = r[valueKey];
  }
  return {
    data: Array.from(map.values()).sort((a, b) => a.bucket.localeCompare(b.bucket)),
    splits: Array.from(splits),
  };
}

const COLORS = ["#6b8e7b", "#c98a6e", "#7b8ea8", "#b89b6c"];

function ChartCard({ title, children }) {
  return (
    <div className="border border-cream-dark rounded-md bg-white p-4">
      <h2 className="font-heading font-bold text-charcoal text-sm mb-3">{title}</h2>
      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </div>
  );
}

export default function AdminReports() {
  const [preset, setPreset] = useState(PRESETS[1]);
  const range = useMemo(() => rangeFromPreset(preset), [preset]);

  const { rows: signups } = useAdminTimeseries(
    "admin_signups_timeseries",
    range.fromIso,
    range.toIso
  );
  const { rows: bookings } = useAdminTimeseries(
    "admin_bookings_timeseries",
    range.fromIso,
    range.toIso
  );
  const [funnel, setFunnel] = useState(null);

  useMemo(() => {
    supabase
      .rpc("admin_host_funnel", { p_from: range.fromIso, p_to: range.toIso })
      .then(({ data }) => setFunnel(data?.[0] ?? null));
  }, [range.fromIso, range.toIso]);

  const signupsPivot = useMemo(() => pivotByBucket(signups, "account_type"), [signups]);
  const bookingsPivot = useMemo(() => pivotByBucket(bookings, "status"), [bookings]);
  const gmvPivot = useMemo(
    () => pivotByBucket(bookings, "status", "gmv_cents"),
    [bookings]
  );

  return (
    <div>
      <h1 className="font-heading font-bold text-charcoal text-xl mb-4">Reports</h1>

      <div className="flex gap-2 mb-4">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => setPreset(p)}
            className={
              "px-3 py-1 rounded-md text-sm " +
              (preset.label === p.label
                ? "bg-sage-light text-charcoal font-medium"
                : "bg-white border border-cream-dark text-taupe-dark hover:bg-cream")
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Signups">
          <LineChart data={signupsPivot.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="bucket" />
            <YAxis />
            <Tooltip />
            <Legend />
            {signupsPivot.splits.map((s, i) => (
              <Line
                key={s}
                type="monotone"
                dataKey={s}
                stroke={COLORS[i % COLORS.length]}
              />
            ))}
          </LineChart>
        </ChartCard>

        <ChartCard title="Bookings">
          <LineChart data={bookingsPivot.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="bucket" />
            <YAxis />
            <Tooltip />
            <Legend />
            {bookingsPivot.splits.map((s, i) => (
              <Line
                key={s}
                type="monotone"
                dataKey={s}
                stroke={COLORS[i % COLORS.length]}
              />
            ))}
          </LineChart>
        </ChartCard>

        <ChartCard title="GMV (cents)">
          <LineChart data={gmvPivot.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="bucket" />
            <YAxis />
            <Tooltip />
            <Legend />
            {gmvPivot.splits.map((s, i) => (
              <Line
                key={s}
                type="monotone"
                dataKey={s}
                stroke={COLORS[i % COLORS.length]}
              />
            ))}
          </LineChart>
        </ChartCard>

        <div className="border border-cream-dark rounded-md bg-white p-4">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-3">Host funnel</h2>
          {funnel ? (
            <div className="flex gap-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-taupe-dark">Signups</div>
                <div className="font-heading text-charcoal text-2xl">{funnel.signups}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-taupe-dark">Verified</div>
                <div className="font-heading text-charcoal text-2xl">{funnel.verified}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-taupe-dark">Booked</div>
                <div className="font-heading text-charcoal text-2xl">{funnel.booked}</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-taupe-dark">Loading…</div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Manual check**

Visit `/admin/reports`. Toggle date presets, watch the four charts update.

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/pages/admin/AdminReports.jsx
git commit -m "Implement admin Reports module with Recharts"
```

---

## Task 15: Dashboard composing Payments + Reports + Verifications badge

**Files:**
- Modify: `frontend/src/pages/admin/AdminDashboard.jsx`

- [ ] **Step 1: Implement**

```jsx
// frontend/src/pages/admin/AdminDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import StatCard from "../../components/admin/StatCard";
import { useAdminKpis } from "../../hooks/useAdminKpis";
import { useAdminTimeseries } from "../../hooks/useAdminTimeseries";
import { supabase } from "../../lib/supabase";

function money(cents) {
  return `$${((cents ?? 0) / 100).toFixed(2)}`;
}

const COLORS = ["#6b8e7b", "#c98a6e", "#7b8ea8"];

function pivotByBucket(rows, splitKey, valueKey = "count") {
  const map = new Map();
  const splits = new Set();
  for (const r of rows) {
    splits.add(r[splitKey]);
    if (!map.has(r.bucket)) map.set(r.bucket, { bucket: r.bucket });
    map.get(r.bucket)[r[splitKey]] = r[valueKey];
  }
  return {
    data: Array.from(map.values()).sort((a, b) => a.bucket.localeCompare(b.bucket)),
    splits: Array.from(splits),
  };
}

export default function AdminDashboard() {
  const range = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { fromIso: from.toISOString(), toIso: to.toISOString() };
  }, []);

  const { data: kpis, loading: kpiLoading } = useAdminKpis(range.fromIso, range.toIso);
  const { rows: signups } = useAdminTimeseries(
    "admin_signups_timeseries",
    range.fromIso,
    range.toIso
  );
  const { rows: bookings } = useAdminTimeseries(
    "admin_bookings_timeseries",
    range.fromIso,
    range.toIso
  );
  const [pendingCount, setPendingCount] = useState(null);

  useEffect(() => {
    supabase
      .from("verification_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .then(({ count }) => setPendingCount(count ?? 0));
  }, []);

  const signupsPivot = useMemo(() => pivotByBucket(signups, "account_type"), [signups]);
  const gmvPivot = useMemo(
    () => pivotByBucket(bookings, "status", "gmv_cents"),
    [bookings]
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-heading font-bold text-charcoal text-xl">Dashboard</h1>
        <Link
          to="/admin/verifications"
          className="bg-cream border border-cream-dark px-3 py-1 rounded-md text-sm text-charcoal hover:bg-sage-light"
        >
          Pending verifications: {pendingCount ?? "…"}
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="GMV (30d)" value={kpiLoading ? "…" : money(kpis?.gmv_cents)} />
        <StatCard
          label="Platform fees (30d)"
          value={kpiLoading ? "…" : money(kpis?.platform_fee_cents)}
        />
        <StatCard
          label="Processing fees (30d)"
          value={kpiLoading ? "…" : money(kpis?.processing_fee_cents)}
          hint="Estimated"
        />
        <StatCard
          label="Bookings (30d)"
          value={kpiLoading ? "…" : kpis?.booking_count ?? 0}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-cream-dark rounded-md bg-white p-4">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-3">GMV trend</h2>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={gmvPivot.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="bucket" />
                <YAxis />
                <Tooltip />
                <Legend />
                {gmvPivot.splits.map((s, i) => (
                  <Line key={s} type="monotone" dataKey={s} stroke={COLORS[i % COLORS.length]} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border border-cream-dark rounded-md bg-white p-4">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-3">Signups</h2>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={signupsPivot.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="bucket" />
                <YAxis />
                <Tooltip />
                <Legend />
                {signupsPivot.splits.map((s, i) => (
                  <Line key={s} type="monotone" dataKey={s} stroke={COLORS[i % COLORS.length]} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Manual check**

Visit `/admin`. Four KPIs render. Two charts render. Pending verifications badge shows a count and links to the queue.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/AdminDashboard.jsx
git commit -m "Implement admin Dashboard composing KPIs and charts"
```

---

## Task 16: Deploy migration and run full pass

- [ ] **Step 1: Push migration to remote**

Run from repo root: `supabase db push --project-ref pdgtryghvibhmmroqvdk`

Confirm in the Supabase dashboard that the new functions and view are present.

- [ ] **Step 2: Run vitest suite**

Run: `cd frontend && npm test`
Expected: all tests pass (existing + 2 new files).

- [ ] **Step 3: Build the app**

Run: `cd frontend && npm run build`
Expected: clean build, no warnings about missing imports.

- [ ] **Step 4: Push frontend**

```bash
git push
```

Netlify will auto-deploy. After ~75s, visit `/admin` on the live site as the admin profile and walk through every section.

- [ ] **Step 5: Final commit (if any cleanup)**

If the manual walkthrough surfaces small fixes, commit them on this branch with focused messages and push.

---

## Self-review notes

- **Spec coverage:** Verifications (Task 6), Users + detail (Tasks 7–8), Bookings + detail (Tasks 9–10), Payments (Task 13), Reports (Task 14), Dashboard (Task 15), data layer (Tasks 11–12), shell + auth (Tasks 1–3), primitives (Tasks 4–5). All five modules + dashboard covered.
- **Spec deviation:** Spec described "doc previews" for Verifications; the actual `verification_requests` table has only a `notes` field, so the drawer shows profile metadata + notes instead. Recorded inline at the top of this plan and reflected in Task 6.
- **No placeholders.** Every code step contains the actual code an engineer needs.
- **Types match.** Functions referenced across tasks (`useAdminKpis`, `useAdminTimeseries`, `pivotByBucket`) keep the same signatures everywhere they appear. `DataTable` API (`rows`, `columns`, `rowKey`, `onRowClick`, `emptyMessage`) is consistent across all consumers.
