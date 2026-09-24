import { useState } from "react";
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
    key: "invoices",
    label: "Factures",
    path: "/invoices",
    icon: (
      <path d="M7 3h10l4 4v14H7V3Zm3 4h4M10 13h8M10 17h8M10 9h2" />
    )
  },
  {
    key: "clients",
    label: "Clients",
    path: "/clients",
    icon: (
      <path d="M9 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm8 1a3 3 0 1 0-2.24-5.02A5.5 5.5 0 0 1 17 12Zm-8 2c-3.31 0-6 2.24-6 5v1h12v-1c0-2.76-2.69-5-6-5Zm8 0c-.48 0-.94.05-1.38.14A4.99 4.99 0 0 1 21 20v1h-5v-1c0-1.55-.65-2.98-1.73-4 .24-.01.48-.02.73-.02Z" />
    )
  },
  {
    key: "logs",
    label: "Journal",
    path: "/logs",
    icon: <path d="M4 5h16M4 10h16M4 15h10M4 20h7M18 14v7m-3.5-3.5h7" />
  },
  {
    key: "cash",
    label: "Sorties de caisse",
    path: "/cash",
    icon: <path d="M3 7h18v13H3zM3 10h18M7 4h10M16 14h2" />
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

const roleLabels = {
  admin: "Administrateur",
  finance: "Finance",
  sales: "Ventes",
  user: "Collaborateur"
};

export function AppLayout() {
  const { user, logout, theme, toggleTheme, toasts, dismissToast, workspaceSettings } = useWorkspace();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("facturation_sidebar") === "collapsed");
  const displayName = user?.name?.trim() || user?.email?.trim() || "Utilisateur connecté";
  const displayRole = user?.role || "user";
  const roleLabel = roleLabels[displayRole] || roleLabels.user;
  const isDark = theme === "dark";
  const canManageSettings = displayRole === "admin" || displayRole === "finance";
  const visibleNavItems = navItems.filter((item) => (item.key !== "users" || displayRole === "admin") && (item.key !== "cash" || canManageSettings));
  const navGroups = [
    { label: "Espace de travail", keys: ["dashboard"] },
    { label: "Commercial", keys: ["invoices", "clients"] },
    { label: "Suivi", keys: ["logs"] },
    { label: "Caisse", keys: ["cash"] },
    { label: "Administration", keys: ["users"] }
  ].map((group) => ({ ...group, items: visibleNavItems.filter((item) => group.keys.includes(item.key)) }))
    .filter((group) => group.items.length > 0);

  function toggleSidebar() {
    const nextCollapsed = !sidebarCollapsed;
    setSidebarCollapsed(nextCollapsed);
    localStorage.setItem("facturation_sidebar", nextCollapsed ? "collapsed" : "expanded");
  }

  return (
    <div className={`app-shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          {workspaceSettings.logoDataUrl ? (
            <img className="brand-logo" src={workspaceSettings.logoDataUrl} alt={`Logo ${workspaceSettings.companyName || "de l’entreprise"}`} />
          ) : <span className="brand-mark" aria-hidden="true" />}
          <div>
            <strong title={workspaceSettings.companyName || "Mon entreprise"}>{workspaceSettings.companyName || "Mon entreprise"}</strong>
            <p>{user ? `${displayName} · ${roleLabel}` : "Session active"}</p>
          </div>
          <button
            className="sidebar-collapse-button"
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Développer la navigation" : "Réduire la navigation"}
            title={sidebarCollapsed ? "Développer la navigation" : "Réduire la navigation"}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg>
          </button>
        </div>

        <nav className="nav">
          {navGroups.map((group) => <div className="nav-group" key={group.label}>
            <span className="nav-group-label">{group.label}</span>
            {group.items.map((item) => <NavLink
              key={item.key}
              to={item.path}
              title={item.label}
              className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
              end
            >
              <span className="nav-item-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="nav-item-svg">{item.icon}</svg>
              </span>
              <span className="nav-item-label">{item.label}</span>
            </NavLink>)}
          </div>)}
        </nav>

        <div className="sidebar-bottom">
          {canManageSettings && <NavLink to="/tools" title="Paramètres" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")} end>
            <span className="nav-item-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="nav-item-svg">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.1-3.1a5 5 0 0 1-6.7 6.7l-7.7 7.7a2 2 0 0 1-2.8-2.8l7.7-7.7a5 5 0 0 1 6.7-6.7l-3.1 3.1Z" />
              </svg>
            </span>
            <span className="nav-item-label">Paramètres</span>
          </NavLink>}
          <div className="sidebar-note">
            <button className="ghost-button sidebar-logout" type="button" onClick={logout} aria-label="Déconnexion" title="Déconnexion">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3m9-8h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" /></svg>
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
              <p>{roleLabel}</p>
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
