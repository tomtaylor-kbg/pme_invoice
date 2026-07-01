import { Navigate, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { LoginPanel } from "./LoginPanel";
import { AppLayout } from "./AppLayout";
import { WorkspaceProvider, useWorkspace } from "./WorkspaceProvider";
import { DashboardPage } from "./pages/DashboardPage";
import { ToolsPage } from "./pages/ToolsPage";
import { ReceiptsPage } from "./pages/ReceiptsPage";
import { ClientsPage } from "./pages/ClientsPage";
import { UsersPage } from "./pages/UsersPage";
import { InvoicesPage } from "./pages/InvoicesPage";

function LoginRoute() {
  const navigate = useNavigate();
  const { token, authenticate, loading, error } = useWorkspace();

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

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/receipts" element={<ReceiptsPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
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
