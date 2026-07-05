import { NavLink, Outlet } from "react-router-dom";
import { useWorkspace } from "./WorkspaceProvider";

export const navItems = [
  { key: "dashboard", label: "Dashboard", path: "/dashboard" },
  { key: "receipts", label: "Reçus", path: "/receipts" },
  { key: "invoices", label: "Factures", path: "/invoices" },
  { key: "clients", label: "Clients CRM", path: "/clients" },
  { key: "users", label: "Utilisateurs", path: "/users" }
];

export function AppLayout() {
  const { user, logout, theme, toggleTheme } = useWorkspace();
  const displayName = user?.name?.trim() || user?.email?.trim() || "Utilisateur connecté";
  const displayRole = user?.role || "user";
  const isDark = theme === "dark";

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

        <div className="sidebar-bottom">
          <button
            className="ghost-button theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
            title={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
          >
            {isDark ? (
              <svg viewBox="0 0 24 24" className="theme-toggle-icon" aria-hidden="true">
                <path d="M12 3v2M12 19v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M3 12h2M19 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="theme-toggle-icon" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
              </svg>
            )}
          </button>
          <NavLink to="/tools" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")} end>
            Outils
          </NavLink>
          <div className="sidebar-note">
            <button className="ghost-button" type="button" onClick={logout}>
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="main-scroll">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
