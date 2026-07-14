import { NavLink, Outlet } from "react-router-dom";
import { useWorkspace } from "./WorkspaceProvider";
import { ToastViewport } from "./ui";

export const navItems = [
  {
    key: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    icon: (
      <path d="M4 12h6V4H4v8Zm10 8h6V4h-6v16ZM4 20h6v-6H4v6Zm10 0h6v-6h-6v6Z" />
    )
  },
  {
    key: "receipts",
    label: "Reçus",
    path: "/receipts",
    icon: (
      <path d="M7 3h10l3 3v15H4V3h3Zm1 4h8M8 11h8M8 15h5" />
    )
  },
  {
    key: "invoices",
    label: "Factures",
    path: "/invoices",
    icon: (
      <path d="M7 3h10l4 4v14H7V3Zm3 4h4M10 13h8M10 17h8M10 9h2" />
    )
  },
  {
    key: "clients",
    label: "Clients CRM",
    path: "/clients",
    icon: (
      <path d="M9 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm8 1a3 3 0 1 0-2.24-5.02A5.5 5.5 0 0 1 17 12Zm-8 2c-3.31 0-6 2.24-6 5v1h12v-1c0-2.76-2.69-5-6-5Zm8 0c-.48 0-.94.05-1.38.14A4.99 4.99 0 0 1 21 20v1h-5v-1c0-1.55-.65-2.98-1.73-4 .24-.01.48-.02.73-.02Z" />
    )
  },
  {
    key: "users",
    label: "Utilisateurs",
    path: "/users",
    icon: (
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Zm7-1h3v2h-3v3h-2v-3h-3v-2h3V9h2v4Z" />
    )
  }
];

export function AppLayout() {
  const { user, logout, theme, toggleTheme, toasts, dismissToast } = useWorkspace();
  const displayName = user?.name?.trim() || user?.email?.trim() || "Utilisateur connecté";
  const displayRole = user?.role || "user";
  const isDark = theme === "dark";
  const visibleNavItems = navItems.filter((item) => item.key !== "users" || displayRole === "admin");

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
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.path}
              className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
              end
            >
              <span className="nav-item-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="nav-item-svg">
                  {item.icon}
                </svg>
              </span>
              <span className="nav-item-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <NavLink to="/tools" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")} end>
            <span className="nav-item-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="nav-item-svg">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.1-3.1a5 5 0 0 1-6.7 6.7l-7.7 7.7a2 2 0 0 1-2.8-2.8l7.7-7.7a5 5 0 0 1 6.7-6.7l-3.1 3.1Z" />
              </svg>
            </span>
            <span className="nav-item-label">Outils</span>
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
          <header className="topbar">
            <div className="topbar-copy">
              <span className="eyebrow">Session</span>
              <strong>{displayName}</strong>
              <p>{displayRole}</p>
            </div>
            <div className="topbar-actions">
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
            </div>
          </header>

        <div className="main-content">
          <Outlet />
        </div>
      </div>
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </main>
  </div>
  );
}
