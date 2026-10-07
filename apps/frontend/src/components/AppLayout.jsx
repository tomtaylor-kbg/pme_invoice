import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useWorkspace } from "./WorkspaceProvider";
import { ToastViewport } from "./ui";
import { getActiveCashSession, getNeedRequests, getOrders } from "../api";
import { invoiceSettlementStatus } from "../utils/formatters";

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
    key: "proformas",
    label: "Pro forma",
    path: "/proformas",
    icon: <path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7" />
  },
  {
    key: "delivery-notes",
    label: "Bons de livraison",
    path: "/delivery-notes",
    icon: <path d="M4 5h11v14H4zM15 9h3l2 3v7h-5M7 9h5M7 13h5M8 20a2 2 0 1 0-4 0m13 0a2 2 0 1 0-4 0" />
  },
  {
    key: "orders",
    label: "Commandes",
    path: "/orders",
    icon: <path d="M4 5h16v14H4zM8 9h8M8 13h5" />
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
    key: "cash-deposits",
    label: "Versements",
    path: "/cash-deposits",
    icon: <path d="M4 6h16v12H4zM8 10h8M8 14h5" />
  },
  {
    key: "need-requests",
    label: "États de besoins",
    path: "/need-requests",
    icon: <path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" />
  },
  {
    key: "cash-register",
    label: "Caisse",
    path: "/cash-register",
    icon: <path d="M4 7h16v13H4zM7 4h10M8 11h8M8 15h4" />
  },
  {
    key: "cash-reports",
    label: "Rapports de caisse",
    path: "/cash-reports",
    icon: <path d="M5 20V10m7 10V4m7 16v-7M3 20h18" />
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
  director: "Directeur",
  receptionist: "Réceptionniste",
  accountant: "Comptable",
  order_manager: "Gestionnaire des commandes",
  order_operator: "Opérateur de commande"
};

export function AppLayout() {
  const { token, user, data, logout, theme, toggleTheme, toasts, dismissToast, workspaceSettings } = useWorkspace();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("facturation_sidebar") === "collapsed");
  const [activeOrderCount, setActiveOrderCount] = useState(0);
  const [pendingNeedCount, setPendingNeedCount] = useState(0);
  const [cashSessionOpen, setCashSessionOpen] = useState(false);
  const displayName = user?.name?.trim() || user?.email?.trim() || "Utilisateur connecté";
  const displayRole = user?.role || "order_operator";
  const roleLabel = roleLabels[displayRole] || roleLabels.order_operator;
  const isDark = theme === "dark";
  useEffect(() => {
    let active = true;
    if (!token || !user) {
      setActiveOrderCount(0);
      setPendingNeedCount(0);
      setCashSessionOpen(false);
      return () => { active = false; };
    }
    const canSeeNeeds = ["admin", "director", "receptionist"].includes(user.role);
    Promise.all([
      getOrders(token),
      canSeeNeeds ? getNeedRequests(token) : Promise.resolve([]),
      canSeeNeeds ? getActiveCashSession(token) : Promise.resolve(null)
    ])
      .then(([orders, needs, activeSession]) => {
        if (!active) return;
        setActiveOrderCount(orders.filter((order) => ["assigned", "processing", "blocked"].includes(order.status)).length);
        setPendingNeedCount(needs.filter((record) => record.status === "submitted").length);
        setCashSessionOpen(Boolean(activeSession));
      })
      .catch(() => { if (active) { setActiveOrderCount(0); setPendingNeedCount(0); setCashSessionOpen(false); } });
    return () => { active = false; };
  }, [token, user?.id, user?.role, data.invoices.length]);
  const unpaidInvoiceCount = data.invoices.filter((invoice) => invoiceSettlementStatus(invoice) === "unpaid").length;
  const visibleKeys = ["admin", "director"].includes(displayRole)
    ? new Set(navItems.map((item) => item.key))
    : displayRole === "receptionist"
      ? new Set(["dashboard", "invoices", "orders", "delivery-notes", "clients", "need-requests", "cash", "cash-deposits", "cash-register", "cash-reports"])
      : displayRole === "accountant"
        ? new Set(["cash-reports"])
      : displayRole === "order_manager"
        ? new Set(["orders", "clients", "delivery-notes"])
        : new Set(["orders"]);
  const visibleNavItems = navItems.filter((item) => visibleKeys.has(item.key));
  const navGroups = [
    { label: "Espace de travail", keys: ["dashboard"] },
    { label: "Commercial", keys: ["invoices", "proformas", "orders", "delivery-notes", "clients"] },
    { label: "Suivi", keys: ["logs"] },
    { label: "Caisse", keys: ["need-requests", "cash", "cash-deposits", "cash-register", "cash-reports"] },
    { label: "Administration", keys: ["users"] }
  ].map((group) => ({ ...group, items: visibleNavItems.filter((item) => group.keys.includes(item.key)) }))
    .filter((group) => group.items.length > 0);

  function toggleSidebar() {
    const nextCollapsed = !sidebarCollapsed;
    setSidebarCollapsed(nextCollapsed);
    localStorage.setItem("facturation_sidebar", nextCollapsed ? "collapsed" : "expanded");
  }

  return (
    <div className={`app-shell role-${displayRole}${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
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
              className={({ isActive }) => `nav-item nav-item-${item.key}${isActive ? " active" : ""}`}
              end
            >
              <span className="nav-item-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="nav-item-svg">{item.icon}</svg>
              </span>
              <span className="nav-item-label">{item.label}{item.key === "invoices" && unpaidInvoiceCount > 0 && <span className="nav-item-count" aria-label={`${unpaidInvoiceCount} facture${unpaidInvoiceCount > 1 ? "s" : ""} impayée${unpaidInvoiceCount > 1 ? "s" : ""}`}>{unpaidInvoiceCount > 99 ? "99+" : unpaidInvoiceCount}</span>}{item.key === "orders" && activeOrderCount > 0 && <span className="nav-item-count" aria-label={`${activeOrderCount} commande${activeOrderCount > 1 ? "s" : ""} active${activeOrderCount > 1 ? "s" : ""}`}>{activeOrderCount > 99 ? "99+" : activeOrderCount}</span>}{item.key === "need-requests" && pendingNeedCount > 0 && <span className="nav-item-count" aria-label={`${pendingNeedCount} état${pendingNeedCount > 1 ? "s" : ""} de besoins non validé${pendingNeedCount > 1 ? "s" : ""}`}>{pendingNeedCount > 99 ? "99+" : pendingNeedCount}</span>}{item.key === "cash-register" && <span className={`nav-item-status ${cashSessionOpen ? "open" : "closed"}`} aria-label={cashSessionOpen ? "Caisse ouverte" : "Caisse fermée"} title={cashSessionOpen ? "Caisse ouverte" : "Caisse fermée"} />}</span>
            </NavLink>)}
          </div>)}
        </nav>

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
              {["admin", "director"].includes(displayRole) && <NavLink to="/tools" className={({ isActive }) => `topbar-action${isActive ? " active" : ""}`} title="Paramètres">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8 3.5-1.8-.7a6.7 6.7 0 0 0-.5-1.2l.8-1.8-1.8-1.8-1.8.8a6.7 6.7 0 0 0-1.2-.5L13 5h-2l-.7 1.8a6.7 6.7 0 0 0-1.2.5l-1.8-.8-1.8 1.8.8 1.8a6.7 6.7 0 0 0-.5 1.2L4 12v2l1.8.7c.1.4.3.8.5 1.2l-.8 1.8 1.8 1.8 1.8-.8c.4.2.8.4 1.2.5L11 21h2l.7-1.8c.4-.1.8-.3 1.2-.5l1.8.8 1.8-1.8-.8-1.8c.2-.4.4-.8.5-1.2L20 14v-2Z" /></svg>
                <span>Paramètres</span>
              </NavLink>}
              <button className="topbar-action topbar-logout" type="button" onClick={logout} aria-label="Déconnexion" title="Déconnexion">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3m9-8h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" /></svg>
                <span>Déconnexion</span>
              </button>
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
