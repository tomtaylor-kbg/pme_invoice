import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  createClient,
  createInvoice,
  createReceipt,
  createUser,
  deleteClient,
  deleteInvoice,
  deleteReceipt,
  deleteUser,
  getClients,
  getDashboard,
  getInvoices,
  getMe,
  getReceipts,
  getUsers,
  login,
  logout as apiLogout,
  updateClient,
  updateInvoice,
  updateReceipt,
  updateUser
} from "../api";
import {
  todayISO,
  suggestInvoiceNumber,
  invoicePrefixForType,
  createInvoiceLineDraft,
  normalizeInvoiceLine,
  invoiceLinesTotal,
  toMoneyValue
} from "../utils/formatters";

const STORAGE_KEY = "facturation_token";

const WorkspaceContext = createContext(null);

function emptyForms() {
  return {
    client: { firstName: "", lastName: "", company: "", email: "", phone: "", city: "", status: "active" },
    user: { name: "", email: "", role: "user", passwordHash: "" },
    invoice: {
      number: "",
      clientId: "",
      userId: "",
      templateType: "professional",
      status: "draft",
      currency: "EUR",
      issueDate: todayISO(),
      dueDate: todayISO(),
      taxRate: "20",
      notes: "",
      lines: [createInvoiceLineDraft()]
    },
    receipt: {
      name: "",
      paperWidthMm: 58,
      title: "",
      subtitle: "",
      footerText: "",
      showTax: true,
      showLogo: false,
      status: "active"
    }
  };
}

function createInvoiceDraft(invoices, clients, users, overrides = {}) {
  const issueDate = overrides.issueDate || todayISO();
  const templateType = overrides.templateType || "professional";
    return {
      ...emptyForms().invoice,
      templateType,
      number: overrides.number || suggestInvoiceNumber(invoices, overrides.prefix || invoicePrefixForType(templateType), issueDate),
      clientId: overrides.clientId || clients[0]?.id || "",
      userId: overrides.userId || users[0]?.id || "",
      lines: overrides.lines || [createInvoiceLineDraft()],
      issueDate,
      dueDate: overrides.dueDate || issueDate
    };
  }

function createReceiptDraft(overrides = {}) {
  return {
    ...emptyForms().receipt,
    ...overrides,
    paperWidthMm: Number(overrides.paperWidthMm || 58),
    showTax: overrides.showTax ?? true,
    showLogo: overrides.showLogo ?? false
  };
}

function normalizeError(error) {
  return error instanceof Error ? error.message : "Une erreur est survenue";
}

export function WorkspaceProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) || "");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    metrics: null,
    recentInvoices: [],
    invoices: [],
    clients: [],
    users: [],
    receipts: []
  });
  const [forms, setForms] = useState(emptyForms());
  const [editor, setEditor] = useState({ kind: null, id: null });

  async function hydrate(currentToken) {
    setLoading(true);
    setError("");
    try {
      const [me, dashboard, clients, users, invoices, receipts] = await Promise.all([
        getMe(currentToken),
        getDashboard(currentToken),
        getClients(currentToken),
        getUsers(currentToken),
        getInvoices(currentToken),
        getReceipts(currentToken)
      ]);

      setUser(me);
      setData({
        metrics: dashboard.metrics,
        recentInvoices: dashboard.recentInvoices || [],
        invoices,
        clients,
        users,
        receipts
      });
      setForms((current) => ({
        ...current,
        invoice: {
          ...current.invoice,
          clientId: current.invoice.clientId || clients[0]?.id || "",
          userId: current.invoice.userId || me?.id || users[0]?.id || "",
          templateType: current.invoice.templateType || "professional",
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
      const currentToken = token;
      if (currentToken) {
        apiLogout(currentToken).catch(() => {});
      }
      localStorage.removeItem(STORAGE_KEY);
      setToken("");
      setUser(null);
      setData({ metrics: null, recentInvoices: [], invoices: [], clients: [], users: [], receipts: [] });
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
          firstName: client.firstName || "",
          lastName: client.lastName || "",
          company: client.company || "",
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
        invoice: createInvoiceDraft(data.invoices, data.clients, data.users, {
          userId: user?.id || data.users[0]?.id || ""
        })
      }));
    }

    function beginCreateInvoiceWithPreset(overrides = {}) {
      setEditor({ kind: "invoice", id: null });
      setForms((current) => ({
        ...current,
        invoice: createInvoiceDraft(data.invoices, data.clients, data.users, {
          ...overrides,
          userId: overrides.userId || user?.id || data.users[0]?.id || ""
        })
      }));
    }

    function beginCreateReceipt() {
      setEditor({ kind: "receipt", id: null });
      setForms((current) => ({
        ...current,
        receipt: createReceiptDraft()
      }));
    }

    function beginEditReceipt(receipt) {
      setEditor({ kind: "receipt", id: receipt.id });
      setForms((current) => ({
        ...current,
        receipt: {
          name: receipt.name || "",
          paperWidthMm: receipt.paperWidthMm || 58,
          title: receipt.title || "",
          subtitle: receipt.subtitle || "",
          footerText: receipt.footerText || "",
          showTax: receipt.showTax ?? true,
          showLogo: receipt.showLogo ?? false,
          status: receipt.status || "active"
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
          templateType: item.templateType || "professional",
          status: item.status || "draft",
          currency: item.currency || "EUR",
          issueDate: item.issueDate ? item.issueDate.slice(0, 10) : todayISO(),
          dueDate: item.dueDate ? item.dueDate.slice(0, 10) : todayISO(),
          taxRate: item.taxRate !== undefined ? String(item.taxRate) : "20",
          notes: item.notes || "",
          lines: (item.lines?.length ? item.lines : [createInvoiceLineDraft()]).map((line) => normalizeInvoiceLine(line))
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
        setEditor({ kind: null, id: null });
      } catch (err) {
        setError(normalizeError(err));
      } finally {
        setLoading(false);
      }
    }

    async function saveReceipt() {
      setLoading(true);
      setError("");
      try {
        const payload = {
          ...forms.receipt,
          paperWidthMm: Number(forms.receipt.paperWidthMm || 58),
          showTax: Boolean(forms.receipt.showTax),
          showLogo: Boolean(forms.receipt.showLogo)
        };
        if (editor.kind === "receipt" && editor.id) {
          await updateReceipt(token, editor.id, payload);
        } else {
          await createReceipt(token, payload);
        }
        await refresh();
        setEditor({ kind: null, id: null });
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
            ...(forms.user.passwordHash ? { passwordHash: forms.user.passwordHash } : {})
          });
        }
        await refresh();
        setEditor({ kind: null, id: null });
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
        const lines = (forms.invoice.lines || [])
          .map((line) => ({
            description: String(line.description || "").trim(),
            quantity: toMoneyValue(line.quantity),
            unitPrice: toMoneyValue(line.unitPrice)
          }))
          .filter((line) => line.description);

        const payload = {
          ...forms.invoice,
          userId: forms.invoice.userId || user?.id || "",
          total: invoiceLinesTotal(lines) * (1 + Number(forms.invoice.taxRate || 20) / 100),
          taxRate: Number(forms.invoice.taxRate || 20),
          lines
        };
        if (editor.kind === "invoice" && editor.id) {
          await updateInvoice(token, editor.id, payload);
        } else {
          await createInvoice(token, payload);
        }
        await refresh();
        setEditor({ kind: null, id: null });
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

    async function removeReceipt(id) {
      setLoading(true);
      setError("");
      try {
        await deleteReceipt(token, id);
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
      closeEditor: () => setEditor({ kind: null, id: null }),
      refresh,
      beginCreateClient,
      beginEditClient,
      beginCreateUser,
      beginEditUser,
      beginCreateInvoice,
      beginCreateInvoiceWithPreset,
      beginCreateReceipt,
      beginEditReceipt,
      beginEditInvoice,
      saveClient,
      saveUser,
      saveInvoice,
      saveReceipt,
      removeClient,
      removeUser,
      removeInvoice,
      removeReceipt
    };
  }, [data.clients, data.invoices, data.receipts, data.users, editor, forms, loading, token, user, error]);

  return <WorkspaceContext.Provider value={actions}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return value;
}
