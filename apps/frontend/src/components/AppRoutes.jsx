import { Navigate, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { LoginPanel } from "./LoginPanel";
import { AppLayout } from "./AppLayout";
import { WorkspaceProvider, useWorkspace } from "./WorkspaceProvider";
import { DashboardPage } from "./pages/DashboardPage";
import { ToolsPage } from "./pages/ToolsPage";
import { ClientsPage } from "./pages/ClientsPage";
import { UsersPage } from "./pages/UsersPage";
import { InvoicesPage } from "./pages/InvoicesPage";
import { CashDisbursementsPage } from "./pages/CashDisbursementsPage";
import { AuditLogPage } from "./pages/AuditLogPage";
import { ProformasPage } from "./pages/ProformasPage";
import { SetupPage } from "./pages/SetupPage";
import { DataLoadingState } from "./ui";

function LoginRoute() {
  const navigate = useNavigate();
  const { token, authenticate, loading, error, notifySuccess } = useWorkspace();

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <LoginPanel
      loading={loading}
      error={error}
      onSubmit={async (username, password) => {
        const success = await authenticate(username, password);
        if (success) {
          notifySuccess("Connexion réussie", "Bienvenue sur le tableau de bord.");
          navigate("/dashboard", { replace: true });
        }
      }}
    />
  );
}

function RequireAuth() {
  const { token } = useWorkspace();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

function RequireRoles({ allowedRoles, children }) {
  const { user, token, loading } = useWorkspace();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (loading && !user) {
    return null;
  }
  if (!allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function RequireSetupComplete() {
  const { user, workspaceSettings, loading } = useWorkspace();
  if (!user) return loading ? <DataLoadingState label="Chargement de votre espace…" className="full-screen-loading" /> : null;
  if (!workspaceSettings.setupCompleted) return <Navigate to="/setup" replace />;
  return <Outlet />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route element={<RequireAuth />}>
        <Route path="/setup" element={<SetupPage />} />
        <Route element={<RequireSetupComplete />}>
          <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tools" element={<RequireRoles allowedRoles={["admin", "finance"]}><ToolsPage /></RequireRoles>} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/logs" element={<AuditLogPage />} />
          <Route path="/users" element={<RequireRoles allowedRoles={["admin"]}><UsersPage /></RequireRoles>} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/proformas" element={<ProformasPage />} />
          <Route path="/cash" element={<RequireRoles allowedRoles={["admin", "finance"]}><CashDisbursementsPage /></RequireRoles>} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export function AppShell() {
  return (
    <WorkspaceProvider>
      <AppRoutes />
    </WorkspaceProvider>
  );
}
