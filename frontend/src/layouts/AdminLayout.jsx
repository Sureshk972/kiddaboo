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
