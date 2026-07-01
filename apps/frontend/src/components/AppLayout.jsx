import { NavLink, Outlet, useLocation } from "react-router-dom";
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
  const { user, logout, loading, error } = useWorkspace();
  const location = useLocation();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" />
          <div>
            <strong>Facturation Interne</strong>
            <p>{user ? `${user.username} · ${user.role}` : "Session active"}</p>
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
          <span>Données synchronisées</span>
          <strong>Prisma + Express</strong>
          <p>Les données affichées proviennent de l’API locale et sont persistées en base.</p>
          <button className="ghost-button" type="button" onClick={logout}>
            Déconnexion
          </button>
        </div>

        <div className="sidebar-meta">
          <span>{location.pathname}</span>
          {loading ? <strong>Chargement...</strong> : <strong>Prêt</strong>}
          {error ? <p>{error}</p> : null}
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
