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
import { DeliveryNotesPage } from "./pages/DeliveryNotesPage";
import { SetupPage } from "./pages/SetupPage";
import { OrdersPage } from "./pages/OrdersPage";
import { CashRegisterPage } from "./pages/CashRegisterPage";
import { CashReportsPage } from "./pages/CashReportsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
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
    return <Navigate to={user?.role === "accountant" ? "/cash-reports" : ["order_manager", "order_operator"].includes(user?.role) ? "/orders" : "/dashboard"} replace />;
  }
  return children;
}

function RequireSetupComplete() {
  const { user, workspaceSettings, loading } = useWorkspace();
  if (!user) return loading ? <DataLoadingState label="Chargement de votre espace…" className="full-screen-loading" /> : null;
  if (!workspaceSettings.setupCompleted) return <Navigate to="/setup" replace />;
  return <Outlet />;
}

function HomeRedirect() {
  const { user } = useWorkspace();
  return <Navigate to={user?.role === "accountant" ? "/cash-reports" : ["order_manager", "order_operator"].includes(user?.role) ? "/orders" : "/dashboard"} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/" element={<HomeRedirect />} />
      <Route element={<RequireAuth />}>
        <Route path="/setup" element={<SetupPage />} />
        <Route element={<RequireSetupComplete />}>
          <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<RequireRoles allowedRoles={["admin", "receptionist"]}><DashboardPage /></RequireRoles>} />
          <Route path="/tools" element={<RequireRoles allowedRoles={["admin"]}><ToolsPage /></RequireRoles>} />
          <Route path="/clients" element={<RequireRoles allowedRoles={["admin", "receptionist", "order_manager"]}><ClientsPage /></RequireRoles>} />
          <Route path="/logs" element={<RequireRoles allowedRoles={["admin"]}><AuditLogPage /></RequireRoles>} />
          <Route path="/users" element={<RequireRoles allowedRoles={["admin"]}><UsersPage /></RequireRoles>} />
          <Route path="/invoices" element={<RequireRoles allowedRoles={["admin", "receptionist"]}><InvoicesPage /></RequireRoles>} />
          <Route path="/proformas" element={<RequireRoles allowedRoles={["admin"]}><ProformasPage /></RequireRoles>} />
          <Route path="/delivery-notes" element={<RequireRoles allowedRoles={["admin", "receptionist", "order_manager"]}><DeliveryNotesPage /></RequireRoles>} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/cash-register" element={<RequireRoles allowedRoles={["admin", "receptionist"]}><CashRegisterPage /></RequireRoles>} />
          <Route path="/cash-reports" element={<RequireRoles allowedRoles={["admin", "receptionist", "accountant"]}><CashReportsPage /></RequireRoles>} />
          <Route path="/cash" element={<RequireRoles allowedRoles={["admin", "receptionist"]}><CashDisbursementsPage /></RequireRoles>} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
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
