import { NavLink, Outlet } from "react-router-dom";
import { useWorkspace } from "./WorkspaceProvider";

export const navItems = [
  { key: "dashboard", label: "Dashboard", path: "/dashboard" },
  { key: "tools", label: "Outils", path: "/tools" },
  { key: "receipts", label: "Reçus", path: "/receipts" },
  { key: "invoices", label: "Factures", path: "/invoices" },
  { key: "clients", label: "Clients CRM", path: "/clients" },
  { key: "users", label: "Utilisateurs", path: "/users" }
];

export function AppLayout() {
  const { user, logout } = useWorkspace();
  const displayName = user?.name?.trim() || user?.email?.trim() || "Utilisateur connecté";
  const displayRole = user?.role || "user";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" />
          <div>
            <strong>Facturation Interne</strong>
            <p>{user ? `${displayName} · ${displayRole}` : "Session active"}</p>
          </div>
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.path}
              className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
              end
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-note">
          <button className="ghost-button" type="button" onClick={logout}>
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
