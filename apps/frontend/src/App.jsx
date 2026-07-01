import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate
} from "react-router-dom";
import {
  createClient,
  createInvoice,
  createUser,
  deleteClient,
  deleteInvoice,
  deleteUser,
  getClients,
  getDashboard,
  getInvoices,
  getMe,
  getUsers,
  login,
  updateClient,
  updateInvoice,
  updateUser
} from "./api";

const STORAGE_KEY = "facturation_token";

const WorkspaceContext = createContext(null);

const navItems = [
  { key: "dashboard", label: "Dashboard", path: "/dashboard" },
  { key: "invoices", label: "Factures", path: "/invoices" },
  { key: "clients", label: "Clients CRM", path: "/clients" },
  { key: "users", label: "Utilisateurs", path: "/users" }
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function slug(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function money(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(number);
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
}

function statusToLabel(value) {
  switch (value) {
    case "draft":
      return "Brouillon";
    case "sent":
      return "Envoyée";
    case "paid":
      return "Payée";
    case "overdue":
      return "En retard";
    case "active":
      return "Actif";
    case "inactive":
      return "Inactif";
    default:
      return value;
  }
}

function emptyForms() {
  return {
    client: { company: "", contact: "", email: "", phone: "", city: "", status: "active" },
    user: { name: "", email: "", role: "user", passwordHash: "" },
    invoice: {
      number: "",
      clientId: "",
      userId: "",
      status: "draft",
      currency: "EUR",
      issueDate: todayISO(),
      dueDate: todayISO(),
      total: "",
      notes: ""
    }
  };
}

function normalizeError(error) {
  return error instanceof Error ? error.message : "Une erreur est survenue";
}

function Badge({ value }) {
  return <span className={`badge ${slug(value)}`}>{value}</span>;
}

function StatCard({ label, value, detail, tone }) {
  return (
    <article className={`stat-card ${tone}`}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      <span className="stat-detail">{detail}</span>
    </article>
  );
}

function SectionHeader({ title, action, buttonLabel, onButtonClick }) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        <p>{action}</p>
      </div>
      {buttonLabel ? (
        <button className="ghost-button" onClick={onButtonClick} type="button">
          {buttonLabel}
        </button>
      ) : null}
    </div>
  );
}

function Table({ columns, rows }) {
  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LoginPanel({ onSubmit, loading, error }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("changeme");

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="brand">
          <span className="brand-mark" />
          <div>
            <strong>Facturation Interne</strong>
            <p>Accès sécurisé au tableau de bord</p>
          </div>
        </div>

        <h1>Connexion</h1>
        <p>Utilisez les identifiants backend configurés dans `apps/backend/.env`.</p>

        <form
          className="login-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(username, password);
          }}
        >
          <label>
            Nom d'utilisateur
            <input value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label>
            Mot de passe
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error ? <div className="error-banner">{error}</div> : null}
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}

function WorkspaceProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) || "");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    metrics: null,
    recentInvoices: [],
    invoices: [],
    clients: [],
    users: []
  });
  const [forms, setForms] = useState(emptyForms());
  const [editor, setEditor] = useState({ kind: null, id: null });

  async function hydrate(currentToken) {
    setLoading(true);
    setError("");
    try {
      const [me, dashboard, clients, users, invoices] = await Promise.all([
        getMe(currentToken),
        getDashboard(currentToken),
        getClients(currentToken),
        getUsers(currentToken),
        getInvoices(currentToken)
      ]);

      setUser(me);
      setData({
        metrics: dashboard.metrics,
        recentInvoices: dashboard.recentInvoices || [],
        invoices,
        clients,
        users
      });
      setForms((current) => ({
        ...current,
        invoice: {
          ...current.invoice,
          clientId: current.invoice.clientId || clients[0]?.id || "",
          userId: current.invoice.userId || users[0]?.id || "",
          issueDate: current.invoice.issueDate || todayISO(),
          dueDate: current.invoice.dueDate || todayISO()
        }
      }));
    } catch (err) {
      localStorage.removeItem(STORAGE_KEY);
      setToken("");
      setUser(null);
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      hydrate(token);
    }
  }, [token]);

  const actions = useMemo(() => {
    function logout() {
      localStorage.removeItem(STORAGE_KEY);
      setToken("");
      setUser(null);
      setData({ metrics: null, recentInvoices: [], invoices: [], clients: [], users: [] });
      setForms(emptyForms());
      setEditor({ kind: null, id: null });
    }

    async function authenticate(username, password) {
      setLoading(true);
      setError("");
      try {
        const result = await login(username, password);
        localStorage.setItem(STORAGE_KEY, result.token);
        setToken(result.token);
        return true;
      } catch (err) {
        setError(normalizeError(err));
        return false;
      } finally {
        setLoading(false);
      }
    }

    function beginCreateClient() {
      setEditor({ kind: "client", id: null });
      setForms((current) => ({ ...current, client: emptyForms().client }));
    }

    function beginEditClient(client) {
      setEditor({ kind: "client", id: client.id });
      setForms((current) => ({
        ...current,
        client: {
          company: client.company || "",
          contact: client.contact || "",
          email: client.email || "",
          phone: client.phone || "",
          city: client.city || "",
          status: client.status || "active"
        }
      }));
    }

    function beginCreateUser() {
      setEditor({ kind: "user", id: null });
      setForms((current) => ({ ...current, user: emptyForms().user }));
    }

    function beginEditUser(item) {
      setEditor({ kind: "user", id: item.id });
      setForms((current) => ({
        ...current,
        user: {
          name: item.name || "",
          email: item.email || "",
          role: item.role || "user",
          passwordHash: ""
        }
      }));
    }

    function beginCreateInvoice() {
      setEditor({ kind: "invoice", id: null });
      setForms((current) => ({
        ...current,
        invoice: {
          ...emptyForms().invoice,
          clientId: data.clients[0]?.id || "",
          userId: data.users[0]?.id || ""
        }
      }));
    }

    function beginEditInvoice(item) {
      setEditor({ kind: "invoice", id: item.id });
      setForms((current) => ({
        ...current,
        invoice: {
          number: item.number || "",
          clientId: item.clientId || item.client?.id || "",
          userId: item.userId || item.creator?.id || "",
          status: item.status || "draft",
          currency: item.currency || "EUR",
          issueDate: item.issueDate ? item.issueDate.slice(0, 10) : todayISO(),
          dueDate: item.dueDate ? item.dueDate.slice(0, 10) : todayISO(),
          total: String(item.total ?? ""),
          notes: item.notes || ""
        }
      }));
    }

    async function refresh() {
      if (token) {
        await hydrate(token);
      }
    }

    async function saveClient() {
      setLoading(true);
      setError("");
      try {
        const payload = forms.client;
        if (editor.kind === "client" && editor.id) {
          await updateClient(token, editor.id, payload);
        } else {
          await createClient(token, payload);
        }
        await refresh();
        beginCreateClient();
      } catch (err) {
        setError(normalizeError(err));
      } finally {
        setLoading(false);
      }
    }

    async function saveUser() {
      setLoading(true);
      setError("");
      try {
        const payload = {
          name: forms.user.name,
          email: forms.user.email,
          role: forms.user.role
        };
        if (editor.kind === "user" && editor.id) {
          await updateUser(token, editor.id, payload);
        } else {
          await createUser(token, {
            ...payload,
            passwordHash: forms.user.passwordHash || "changeme"
          });
        }
        await refresh();
        beginCreateUser();
      } catch (err) {
        setError(normalizeError(err));
      } finally {
        setLoading(false);
      }
    }

    async function saveInvoice() {
      setLoading(true);
      setError("");
      try {
        const payload = {
          ...forms.invoice,
          total: Number(forms.invoice.total || 0)
        };
        if (editor.kind === "invoice" && editor.id) {
          await updateInvoice(token, editor.id, payload);
        } else {
          await createInvoice(token, {
            ...payload,
            lines: [
              {
                description: "Prestation interne",
                quantity: 1,
                unitPrice: Number(forms.invoice.total || 0)
              }
            ]
          });
        }
        await refresh();
        beginCreateInvoice();
      } catch (err) {
        setError(normalizeError(err));
      } finally {
        setLoading(false);
      }
    }

    async function removeClient(id) {
      setLoading(true);
      setError("");
      try {
        await deleteClient(token, id);
        await refresh();
      } catch (err) {
        setError(normalizeError(err));
      } finally {
        setLoading(false);
      }
    }

    async function removeUser(id) {
      setLoading(true);
      setError("");
      try {
        await deleteUser(token, id);
        await refresh();
      } catch (err) {
        setError(normalizeError(err));
      } finally {
        setLoading(false);
      }
    }

    async function removeInvoice(id) {
      setLoading(true);
      setError("");
      try {
        await deleteInvoice(token, id);
        await refresh();
      } catch (err) {
        setError(normalizeError(err));
      } finally {
        setLoading(false);
      }
    }

    return {
      token,
      user,
      loading,
      error,
      data,
      forms,
      editor,
      setForms,
      authenticate,
      logout,
      refresh,
      beginCreateClient,
      beginEditClient,
      beginCreateUser,
      beginEditUser,
      beginCreateInvoice,
      beginEditInvoice,
      saveClient,
      saveUser,
      saveInvoice,
      removeClient,
      removeUser,
      removeInvoice
    };
  }, [data.clients, data.users, editor, forms, loading, token, user, error]);

  return <WorkspaceContext.Provider value={actions}>{children}</WorkspaceContext.Provider>;
}

function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return value;
}

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

function AppLayout() {
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
          <span>Backend connecté</span>
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

function DashboardPage() {
  const navigate = useNavigate();
  const { data, refresh, beginCreateInvoice } = useWorkspace();

  const summaryCards = [
    { label: "Factures", value: data.metrics?.invoices ?? 0, detail: "Total enregistré", tone: "accent" },
    { label: "Clients", value: data.metrics?.clients ?? 0, detail: "Comptes CRM actifs", tone: "neutral" },
    { label: "Utilisateurs", value: data.metrics?.users ?? 0, detail: "Comptes internes", tone: "neutral" },
    { label: "CA", value: money(data.metrics?.turnover ?? 0), detail: "Somme des factures", tone: "success" }
  ];

  const recent = data.recentInvoices.length ? data.recentInvoices : data.invoices.slice(0, 5);
  const rows = recent.map((invoice) => [
    invoice.number,
    invoice.client?.company || "-",
    money(invoice.total),
    <Badge key={`${invoice.id}-status`} value={statusToLabel(invoice.status)} />,
    formatDate(invoice.dueDate)
  ]);

  return (
    <>
      <header className="hero">
        <div>
          <span className="eyebrow">Gestion interne</span>
          <h1>Dashboard</h1>
          <p>Vue d’ensemble de l’activité facturation et CRM.</p>
        </div>
        <div className="hero-actions">
          <button className="secondary-button" type="button" onClick={refresh}>
            Rafraîchir
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              beginCreateInvoice();
              navigate("/invoices");
            }}
          >
            Nouvelle facture
          </button>
        </div>
      </header>

      <section className="stats-grid">
        {summaryCards.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </section>

      <section className="content-grid">
        <div className="panel">
          <SectionHeader
            title="Activité récente"
            action="Derniers documents enregistrés et indicateurs clés."
          />
          <Table columns={["Numéro", "Client", "Montant", "Statut", "Échéance"]} rows={rows} />
        </div>

        <div className="panel panel-side">
          <SectionHeader title="Tâches rapides" action="Accès direct aux zones métier." />
          <div className="quick-list">
            <article>
              <strong>Créer une facture</strong>
              <p>Préremplir le client, les dates et le total.</p>
            </article>
            <article>
              <strong>Ajouter un client</strong>
              <p>Enregistrer les informations CRM et le contact.</p>
            </article>
            <article>
              <strong>Gérer les utilisateurs</strong>
              <p>Définir rôles et accès internes.</p>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}

function ClientsPage() {
  const { data, forms, setForms, editor, beginCreateClient, beginEditClient, saveClient, removeClient, loading } = useWorkspace();

  useEffect(() => {
    if (editor.kind !== "client") {
      beginCreateClient();
    }
  }, [beginCreateClient, editor.kind]);

  const rows = data.clients.map((client) => [
    client.company,
    client.contact,
    client.email,
    client.city || "-",
    <Badge key={`${client.id}-status`} value={statusToLabel(client.status)} />,
    client.invoicesCount ?? 0,
    <div key={`${client.id}-actions`} className="row-actions">
      <button type="button" className="text-button" onClick={() => beginEditClient(client)}>
        Modifier
      </button>
      <button type="button" className="text-button danger" onClick={() => removeClient(client.id)} disabled={loading}>
        Supprimer
      </button>
    </div>
  ]);

  const isEditing = editor.kind === "client" && Boolean(editor.id);

  return (
    <>
      <header className="hero">
        <div>
          <span className="eyebrow">CRM</span>
          <h1>Clients</h1>
          <p>Gestion des comptes, contacts et statuts commerciaux.</p>
        </div>
        <div className="hero-actions">
          <button className="secondary-button" type="button" onClick={beginCreateClient}>
            Nouveau client
          </button>
        </div>
      </header>

      <section className="content-grid">
        <div className="panel">
          <SectionHeader title="Liste clients" action="Table CRM connectée à Prisma." />
          <Table columns={["Société", "Contact", "Email", "Ville", "Statut", "Factures", "Actions"]} rows={rows} />
        </div>

        <div className="panel panel-side">
          <SectionHeader title={isEditing ? "Modifier client" : "Créer client"} action="Formulaire de saisie simple." />
          <form className="stack-form" onSubmit={(event) => { event.preventDefault(); saveClient(); }}>
            <label>
              Société
              <input
                value={forms.client.company}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  client: { ...current.client, company: event.target.value }
                }))}
              />
            </label>
            <label>
              Contact
              <input
                value={forms.client.contact}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  client: { ...current.client, contact: event.target.value }
                }))}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={forms.client.email}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  client: { ...current.client, email: event.target.value }
                }))}
              />
            </label>
            <label>
              Ville
              <input
                value={forms.client.city}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  client: { ...current.client, city: event.target.value }
                }))}
              />
            </label>
            <label>
              Téléphone
              <input
                value={forms.client.phone}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  client: { ...current.client, phone: event.target.value }
                }))}
              />
            </label>
            <label>
              Statut
              <select
                value={forms.client.status}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  client: { ...current.client, status: event.target.value }
                }))}
              >
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </label>
            <button className="primary-button" type="submit" disabled={loading}>
              {isEditing ? "Enregistrer" : "Créer client"}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}

function UsersPage() {
  const { data, forms, setForms, editor, beginCreateUser, beginEditUser, saveUser, removeUser, loading } = useWorkspace();

  useEffect(() => {
    if (editor.kind !== "user") {
      beginCreateUser();
    }
  }, [beginCreateUser, editor.kind]);

  const rows = data.users.map((item) => [
    item.name,
    item.email,
    item.role,
    <div key={`${item.id}-actions`} className="row-actions">
      <button type="button" className="text-button" onClick={() => beginEditUser(item)}>
        Modifier
      </button>
      <button type="button" className="text-button danger" onClick={() => removeUser(item.id)} disabled={loading}>
        Supprimer
      </button>
    </div>
  ]);

  const isEditing = editor.kind === "user" && Boolean(editor.id);

  return (
    <>
      <header className="hero">
        <div>
          <span className="eyebrow">Administration</span>
          <h1>Utilisateurs</h1>
          <p>Gestion des comptes internes et des rôles applicatifs.</p>
        </div>
        <div className="hero-actions">
          <button className="secondary-button" type="button" onClick={beginCreateUser}>
            Nouvel utilisateur
          </button>
        </div>
      </header>

      <section className="content-grid">
        <div className="panel">
          <SectionHeader title="Liste utilisateurs" action="Comptes connectés à l’instance interne." />
          <Table columns={["Nom", "Email", "Rôle", "Actions"]} rows={rows} />
        </div>

        <div className="panel panel-side">
          <SectionHeader title={isEditing ? "Modifier utilisateur" : "Créer utilisateur"} action="Définir l’identité et les droits." />
          <form className="stack-form" onSubmit={(event) => { event.preventDefault(); saveUser(); }}>
            <label>
              Nom
              <input
                value={forms.user.name}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  user: { ...current.user, name: event.target.value }
                }))}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={forms.user.email}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  user: { ...current.user, email: event.target.value }
                }))}
              />
            </label>
            <label>
              Rôle
              <select
                value={forms.user.role}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  user: { ...current.user, role: event.target.value }
                }))}
              >
                <option value="user">Utilisateur</option>
                <option value="admin">Administrateur</option>
                <option value="finance">Finance</option>
                <option value="sales">Ventes</option>
              </select>
            </label>
            <label>
              Mot de passe
              <input
                value={forms.user.passwordHash}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  user: { ...current.user, passwordHash: event.target.value }
                }))}
              />
            </label>
            <button className="primary-button" type="submit" disabled={loading}>
              {isEditing ? "Enregistrer" : "Créer utilisateur"}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}

function InvoicesPage() {
  const { data, forms, setForms, editor, beginCreateInvoice, beginEditInvoice, saveInvoice, removeInvoice, loading } = useWorkspace();

  useEffect(() => {
    if (editor.kind !== "invoice") {
      beginCreateInvoice();
    }
  }, [beginCreateInvoice, editor.kind]);

  const rows = data.invoices.map((invoice) => [
    invoice.number,
    invoice.client?.company || "-",
    money(invoice.total),
    <Badge key={`${invoice.id}-status`} value={statusToLabel(invoice.status)} />,
    formatDate(invoice.dueDate),
    <div key={`${invoice.id}-actions`} className="row-actions">
      <button type="button" className="text-button" onClick={() => beginEditInvoice(invoice)}>
        Modifier
      </button>
      <button type="button" className="text-button danger" onClick={() => removeInvoice(invoice.id)} disabled={loading}>
        Supprimer
      </button>
    </div>
  ]);

  const isEditing = editor.kind === "invoice" && Boolean(editor.id);

  return (
    <>
      <header className="hero">
        <div>
          <span className="eyebrow">Facturation</span>
          <h1>Factures</h1>
          <p>Création, édition et suivi des échéances de facturation.</p>
        </div>
        <div className="hero-actions">
          <button className="secondary-button" type="button" onClick={beginCreateInvoice}>
            Nouvelle facture
          </button>
        </div>
      </header>

      <section className="content-grid">
        <div className="panel">
          <SectionHeader title="Liste factures" action="Docs comptables liés aux clients et utilisateurs." />
          <Table columns={["Numéro", "Client", "Montant", "Statut", "Échéance", "Actions"]} rows={rows} />
        </div>

        <div className="panel panel-side">
          <SectionHeader title={isEditing ? "Modifier facture" : "Créer facture"} action="Enregistrer un document de facturation." />
          <form className="stack-form" onSubmit={(event) => { event.preventDefault(); saveInvoice(); }}>
            <label>
              Numéro
              <input
                value={forms.invoice.number}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  invoice: { ...current.invoice, number: event.target.value }
                }))}
              />
            </label>
            <label>
              Client
              <select
                value={forms.invoice.clientId}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  invoice: { ...current.invoice, clientId: event.target.value }
                }))}
              >
                <option value="">Sélectionner</option>
                {data.clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.company}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Utilisateur
              <select
                value={forms.invoice.userId}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  invoice: { ...current.invoice, userId: event.target.value }
                }))}
              >
                <option value="">Aucun</option>
                {data.users.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Statut
              <select
                value={forms.invoice.status}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  invoice: { ...current.invoice, status: event.target.value }
                }))}
              >
                <option value="draft">Brouillon</option>
                <option value="sent">Envoyée</option>
                <option value="paid">Payée</option>
                <option value="overdue">En retard</option>
              </select>
            </label>
            <label>
              Devise
              <select
                value={forms.invoice.currency}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  invoice: { ...current.invoice, currency: event.target.value }
                }))}
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="CDF">CDF</option>
              </select>
            </label>
            <label>
              Date d'émission
              <input
                type="date"
                value={forms.invoice.issueDate}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  invoice: { ...current.invoice, issueDate: event.target.value }
                }))}
              />
            </label>
            <label>
              Échéance
              <input
                type="date"
                value={forms.invoice.dueDate}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  invoice: { ...current.invoice, dueDate: event.target.value }
                }))}
              />
            </label>
            <label>
              Total
              <input
                type="number"
                min="0"
                step="0.01"
                value={forms.invoice.total}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  invoice: { ...current.invoice, total: event.target.value }
                }))}
              />
            </label>
            <label>
              Notes
              <textarea
                rows="3"
                value={forms.invoice.notes}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  invoice: { ...current.invoice, notes: event.target.value }
                }))}
              />
            </label>
            <button className="primary-button" type="submit" disabled={loading || !forms.invoice.clientId}>
              {isEditing ? "Enregistrer" : "Créer facture"}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}

function DashboardRoute() {
  return <DashboardPage />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardRoute />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <WorkspaceProvider>
        <AppRoutes />
      </WorkspaceProvider>
    </BrowserRouter>
  );
}
