import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  createClient,
  createInvoice,
  createInvoicePayment,
  createUser,
  deleteClient,
  deleteInvoice,
  deleteInvoicePayment,
  deleteUser,
  getClients,
  getDashboard,
  getInvoiceNextNumber,
  getInvoices,
  getDeliveryNotes,
  createDeliveryNote,
  updateDeliveryNote,
  deleteDeliveryNote,
  convertDeliveryNote,
  getMe,
  getWorkspaceSettings,
  getUsers,
  login,
  logout as apiLogout,
  updateClient,
  updateInvoice,
  updateInvoicePayment,
  updateWorkspaceSettings,
  updateUser
} from "../api";
import {
  todayISO,
  suggestInvoiceNumber,
  invoiceDisplayLabel,
  personLabel,
  createInvoiceLineDraft,
  normalizeInvoiceLine,
  invoiceLinesTotal,
  toMoneyValue,
  money
} from "../utils/formatters";

const STORAGE_KEY = "facturation_token";
const SETTINGS_STORAGE_KEY = "facturation_workspace_settings";
const THEME_STORAGE_KEY = "facturation_theme";

const WorkspaceContext = createContext(null);

function defaultWorkspaceSettings() {
  return {
    setupCompleted: false,
    companyName: "Mon entreprise",
    companyAcronym: "",
    logoDataUrl: "",
    businessSector: "Imprimerie",
    vatRate: "20",
    defaultCurrency: "EUR",
    addressLine1: "",
    addressLine2: "",
    postalCode: "",
    city: "",
    country: "",
    phone: "",
    phone2: "",
    email: "",
    website: "",
    rccm: "",
    idNat: "",
    taxNumber: "",
    invoicePrefix: "FAC",
    paymentTermsDays: "30"
  };
}

function normalizeWorkspaceSettings(settings = {}) {
  return {
    ...defaultWorkspaceSettings(),
    ...settings,
    setupCompleted: Boolean(settings.setupCompleted ?? defaultWorkspaceSettings().setupCompleted),
    companyName: String(settings.companyName ?? defaultWorkspaceSettings().companyName),
    companyAcronym: String(settings.companyAcronym ?? defaultWorkspaceSettings().companyAcronym).trim().toUpperCase(),
    logoDataUrl: String(settings.logoDataUrl ?? defaultWorkspaceSettings().logoDataUrl),
    vatRate: String(settings.vatRate ?? defaultWorkspaceSettings().vatRate),
    defaultCurrency: String(settings.defaultCurrency ?? defaultWorkspaceSettings().defaultCurrency).toUpperCase(),
    addressLine1: String(settings.addressLine1 ?? defaultWorkspaceSettings().addressLine1),
    addressLine2: String(settings.addressLine2 ?? defaultWorkspaceSettings().addressLine2),
    postalCode: String(settings.postalCode ?? defaultWorkspaceSettings().postalCode),
    city: String(settings.city ?? defaultWorkspaceSettings().city),
    country: String(settings.country ?? defaultWorkspaceSettings().country),
    phone: String(settings.phone ?? defaultWorkspaceSettings().phone),
    phone2: String(settings.phone2 ?? defaultWorkspaceSettings().phone2),
    email: String(settings.email ?? defaultWorkspaceSettings().email),
    website: String(settings.website ?? defaultWorkspaceSettings().website),
    rccm: String(settings.rccm ?? defaultWorkspaceSettings().rccm),
    idNat: String(settings.idNat ?? defaultWorkspaceSettings().idNat),
    taxNumber: String(settings.taxNumber ?? defaultWorkspaceSettings().taxNumber),
    invoicePrefix: String(settings.invoicePrefix ?? defaultWorkspaceSettings().invoicePrefix).toUpperCase(),
    paymentTermsDays: String(settings.paymentTermsDays ?? defaultWorkspaceSettings().paymentTermsDays),
    businessSector: String(settings.businessSector ?? defaultWorkspaceSettings().businessSector)
  };
}

function readLegacyWorkspaceSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return normalizeWorkspaceSettings(JSON.parse(raw));
  } catch {
    return null;
  }
}

function workspaceSettingsEqual(left, right) {
  const normalizedLeft = normalizeWorkspaceSettings(left);
  const normalizedRight = normalizeWorkspaceSettings(right);
  return JSON.stringify(normalizedLeft) === JSON.stringify(normalizedRight);
}

function readTheme() {
  if (typeof window === "undefined") {
    return "dark";
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return "dark";
}

function emptyForms() {
  return {
    client: { firstName: "", lastName: "", company: "", email: "", phone: "", city: "", status: "active", clientType: "individual" },
    user: { username: "", name: "", email: "", role: "user", passwordHash: "" },
    invoice: {
      number: "",
      clientId: "",
      clientMode: "crm",
      manualClientName: "",
      manualClientEmail: "",
      manualClientCompany: "",
      userId: "",
      status: "draft",
      currency: "EUR",
      issueDate: todayISO(),
      dueDate: todayISO(),
      taxRate: "20",
      notes: "",
      lines: [createInvoiceLineDraft()]
    },
    payment: {
      invoiceId: "",
      amount: "",
      method: "cash",
      paidAt: todayISO(),
      reference: "",
      notes: ""
    }
  };
}

function createInvoiceDraft(invoices, clients, users, settings, overrides = {}) {
  const issueDate = overrides.issueDate || todayISO();
  return {
    ...emptyForms().invoice,
    currency: overrides.currency || settings.defaultCurrency || emptyForms().invoice.currency,
    taxRate: overrides.taxRate !== undefined
      ? String(overrides.taxRate)
      : (settings.vatRate !== undefined ? String(settings.vatRate) : emptyForms().invoice.taxRate),
    number:
      overrides.number ||
      suggestInvoiceNumber(invoices, overrides.prefix || settings.invoicePrefix, issueDate),
    clientId: overrides.clientId || clients[0]?.id || "",
    userId: overrides.userId || users[0]?.id || "",
    lines: overrides.lines || [createInvoiceLineDraft()],
    issueDate,
    dueDate: overrides.dueDate || issueDate
  };
}

function createPaymentDraft(invoice = null, overrides = {}) {
  return {
    ...emptyForms().payment,
    invoiceId: invoice?.id || overrides.invoiceId || "",
    amount:
      overrides.amount !== undefined
        ? String(overrides.amount)
        : invoice
          ? String(Math.max(0, Number(invoice.balanceDue ?? invoice.total ?? 0)))
          : "",
    method: overrides.method || "cash",
    paidAt: overrides.paidAt || todayISO(),
    reference: overrides.reference || "",
    notes: overrides.notes || ""
  };
}

function normalizeError(error) {
  return error instanceof Error ? error.message : "Une erreur est survenue";
}

function confirmDestructiveAction(message) {
  if (typeof window === "undefined") {
    return false;
  }

  return window.confirm(message);
}

function createToastId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function WorkspaceProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) || "");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  const [error, setError] = useState("");
  const [toasts, setToasts] = useState([]);
  const [data, setData] = useState({
    metrics: null,
    recentInvoices: [],
    cashDisbursements: [],
    invoices: [],
    clients: [],
    users: [],
    deliveryNotes: []
  });
  const legacyWorkspaceSettingsRef = useRef(readLegacyWorkspaceSettings());
  const workspaceSettingsSnapshotRef = useRef(normalizeWorkspaceSettings(legacyWorkspaceSettingsRef.current || defaultWorkspaceSettings()));
  const workspaceSettingsSaveTimerRef = useRef(null);
  const workspaceSettingsActionRef = useRef(null);
  const workspaceSettingsRollbackRef = useRef(null);
  const [workspaceSettings, setWorkspaceSettings] = useState(() => normalizeWorkspaceSettings(legacyWorkspaceSettingsRef.current || defaultWorkspaceSettings()));
  const [theme, setTheme] = useState(() => readTheme());
  const [forms, setForms] = useState(emptyForms());
  const [editor, setEditor] = useState({ kind: null, id: null });
  const toastTimersRef = useRef(new Map());

  function resetWorkspaceSettings() {
    const defaultSettings = defaultWorkspaceSettings();
    workspaceSettingsRollbackRef.current = workspaceSettingsSnapshotRef.current;
    workspaceSettingsActionRef.current = "reset";
    setWorkspaceSettings(defaultSettings);
  }

  async function saveWorkspaceSettingsNow(settings) {
    if (workspaceSettingsSaveTimerRef.current) {
      window.clearTimeout(workspaceSettingsSaveTimerRef.current);
      workspaceSettingsSaveTimerRef.current = null;
    }
    const normalized = normalizeWorkspaceSettings(settings);
    const result = await updateWorkspaceSettings(token, normalized);
    const savedSettings = normalizeWorkspaceSettings(result?.settings || normalized);
    workspaceSettingsSnapshotRef.current = savedSettings;
    legacyWorkspaceSettingsRef.current = savedSettings;
    setWorkspaceSettings(savedSettings);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(savedSettings));
    } catch {
      // Ignore persistence errors.
    }
    return savedSettings;
  }

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const currentSettings = normalizeWorkspaceSettings(workspaceSettings);
    if (workspaceSettingsEqual(currentSettings, workspaceSettingsSnapshotRef.current)) {
      return undefined;
    }

    if (workspaceSettingsSaveTimerRef.current) {
      window.clearTimeout(workspaceSettingsSaveTimerRef.current);
    }

    workspaceSettingsSaveTimerRef.current = window.setTimeout(async () => {
      workspaceSettingsSaveTimerRef.current = null;
      try {
        const action = workspaceSettingsActionRef.current;
        const result = await updateWorkspaceSettings(token, currentSettings);
        const savedSettings = normalizeWorkspaceSettings(result?.settings || currentSettings);
        workspaceSettingsSnapshotRef.current = savedSettings;
        legacyWorkspaceSettingsRef.current = savedSettings;
        if (action === "reset") {
          notifySuccess("Paramètres réinitialisés", "Les paramètres système ont été remis aux valeurs de départ.");
        }
        workspaceSettingsActionRef.current = null;
        workspaceSettingsRollbackRef.current = null;
        try {
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(savedSettings));
        } catch {
          // Ignore persistence errors.
        }
      } catch {
        const action = workspaceSettingsActionRef.current;
        const rollbackSettings = workspaceSettingsRollbackRef.current;
        workspaceSettingsActionRef.current = null;
        workspaceSettingsRollbackRef.current = null;
        if (action === "reset" && rollbackSettings) {
          setWorkspaceSettings(rollbackSettings);
          notifyError("Réinitialisation impossible", "Les paramètres système n'ont pas pu être réinitialisés.");
        }
        // Keep the in-memory version and retry on the next change.
      }
    }, 400);

    return () => {
      if (workspaceSettingsSaveTimerRef.current) {
        window.clearTimeout(workspaceSettingsSaveTimerRef.current);
        workspaceSettingsSaveTimerRef.current = null;
      }
    };
  }, [token, workspaceSettings]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.dataset.theme = theme;
    body.dataset.theme = theme;
    root.style.colorScheme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore persistence errors.
    }
  }, [theme]);

  useEffect(() => {
    document.title = workspaceSettings.companyAcronym || workspaceSettings.companyName || "Facturation Interne";
  }, [workspaceSettings.companyAcronym, workspaceSettings.companyName]);

  useEffect(() => {
    return () => {
      toastTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      toastTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (workspaceSettingsSaveTimerRef.current) {
        window.clearTimeout(workspaceSettingsSaveTimerRef.current);
        workspaceSettingsSaveTimerRef.current = null;
      }
    };
  }, []);

  function dismissToast(id) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = toastTimersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
  }

  function pushToast({ tone = "info", title, message }) {
    const id = createToastId();
    setToasts((current) => [...current, { id, tone, title, message }]);
    const timer = window.setTimeout(() => {
      dismissToast(id);
    }, 4000);
    toastTimersRef.current.set(id, timer);
    return id;
  }

  function notifySuccess(title, message) {
    return pushToast({ tone: "success", title, message });
  }

  function notifyError(title, message) {
    return pushToast({ tone: "danger", title, message });
  }

  useEffect(() => {
    if (!token || editor.kind !== "invoice" || editor.id) {
      return undefined;
    }

    let cancelled = false;

    async function syncInvoiceNumber() {
      const issueDate = forms.invoice.issueDate || todayISO();
      const prefix = workspaceSettings.invoicePrefix || "FAC";

      try {
        const preview = await getInvoiceNextNumber(token, {
          prefix,
          issueDate
        });

        if (!cancelled && preview?.number) {
          setForms((current) => ({
            ...current,
            invoice: {
              ...current.invoice,
              number: preview.number
            }
          }));
        }
      } catch {
        if (!cancelled) {
          setForms((current) => ({
            ...current,
            invoice: {
              ...current.invoice,
              number: suggestInvoiceNumber(data.invoices, prefix, issueDate)
            }
          }));
        }
      }
    }

    syncInvoiceNumber();

    return () => {
      cancelled = true;
    };
  }, [data.invoices, editor.id, editor.kind, forms.invoice.issueDate, token, workspaceSettings.invoicePrefix]);

  async function hydrate(currentToken) {
    setIsHydrating(true);
    setLoading(true);
    setError("");
    try {
      const [me, dashboard, clients, invoices, workspaceSettingsPayload] = await Promise.all([
        getMe(currentToken),
        getDashboard(currentToken),
        getClients(currentToken),
        getInvoices(currentToken),
        getWorkspaceSettings(currentToken).catch(() => null)
      ]);
      const users = me?.role === "admin" ? await getUsers(currentToken) : [];
      const serverSettings = normalizeWorkspaceSettings(workspaceSettingsPayload?.settings || workspaceSettingsPayload || defaultWorkspaceSettings());
      const legacySettings = legacyWorkspaceSettingsRef.current;
      const shouldRestoreLegacy = Boolean(workspaceSettingsPayload?.created && legacySettings && !workspaceSettingsEqual(legacySettings, defaultWorkspaceSettings()));
      const nextWorkspaceSettings = shouldRestoreLegacy ? normalizeWorkspaceSettings(legacySettings) : serverSettings;

      setUser(me);
      setData({
        metrics: dashboard.metrics,
        recentInvoices: dashboard.recentInvoices || [],
        cashDisbursements: dashboard.cashDisbursements || [],
        invoices,
        clients,
        users,
        deliveryNotes: []
      });
      workspaceSettingsSnapshotRef.current = serverSettings;
      setWorkspaceSettings(nextWorkspaceSettings);
      setForms((current) => ({
        ...current,
        invoice: {
          ...current.invoice,
          clientId: current.invoice.clientId || clients[0]?.id || "",
          userId: current.invoice.userId || me?.id || users[0]?.id || "",
          issueDate: current.invoice.issueDate || todayISO(),
          dueDate: current.invoice.dueDate || todayISO()
        }
      }));
      if (shouldRestoreLegacy) {
        try {
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextWorkspaceSettings));
        } catch {
          // Ignore persistence errors.
        }
      }
    } catch (err) {
      localStorage.removeItem(STORAGE_KEY);
      setToken("");
      setUser(null);
      setError(normalizeError(err));
    } finally {
      setIsHydrating(false);
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
      if (workspaceSettingsSaveTimerRef.current) {
        window.clearTimeout(workspaceSettingsSaveTimerRef.current);
        workspaceSettingsSaveTimerRef.current = null;
      }
      workspaceSettingsActionRef.current = null;
      workspaceSettingsRollbackRef.current = null;
      localStorage.removeItem(STORAGE_KEY);
      setToken("");
      setUser(null);
      setData({ metrics: null, recentInvoices: [], cashDisbursements: [], invoices: [], clients: [], users: [], deliveryNotes: [] });
      setForms(emptyForms());
      setEditor({ kind: null, id: null });
    }

    function toggleTheme() {
      setTheme((current) => (current === "dark" ? "light" : "dark"));
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
          status: client.status || "active",
          clientType: client.clientType || "individual"
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
          username: item.username || "",
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
        invoice: createInvoiceDraft(data.invoices, data.clients, data.users, workspaceSettings, {
          userId: user?.id || data.users[0]?.id || ""
        })
      }));
    }

    function beginCreateInvoiceWithPreset(overrides = {}) {
      setEditor({ kind: "invoice", id: null });
      setForms((current) => ({
        ...current,
        invoice: createInvoiceDraft(data.invoices, data.clients, data.users, workspaceSettings, {
          ...overrides,
          userId: overrides.userId || user?.id || data.users[0]?.id || "",
          currency: overrides.currency || workspaceSettings.defaultCurrency || emptyForms().invoice.currency,
          taxRate: overrides.taxRate || workspaceSettings.vatRate || emptyForms().invoice.taxRate,
          prefix: overrides.prefix || workspaceSettings.invoicePrefix || "FAC"
        })
      }));
    }

    function beginEditInvoice(item) {
      setEditor({ kind: "invoice", id: item.id });
      setForms((current) => ({
        ...current,
        invoice: {
          number: item.number || "",
          clientId: item.clientId || item.client?.id || "",
          clientMode: "crm",
          manualClientName: "",
          manualClientEmail: "",
          manualClientCompany: "",
          userId: item.userId || item.creator?.id || "",
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

    function beginManagePayments(invoice) {
      setEditor({ kind: "payment", id: null, invoiceId: invoice.id });
      setForms((current) => ({
        ...current,
        payment: createPaymentDraft(invoice, {
          amount: invoice.balanceDue ?? invoice.total ?? 0,
          paidAt: todayISO()
        })
      }));
    }

    function beginEditPayment(payment, invoice) {
      setEditor({ kind: "payment", id: payment.id, invoiceId: invoice.id });
      setForms((current) => ({
        ...current,
        payment: {
          invoiceId: invoice.id,
          amount: payment.amount !== undefined ? String(payment.amount) : "",
          method: payment.method || "cash",
          paidAt: payment.paidAt ? payment.paidAt.slice(0, 10) : todayISO(),
          reference: payment.reference || "",
          notes: payment.notes || ""
        }
      }));
    }

    async function refresh() {
      if (token) {
        await hydrate(token);
      }
    }

    async function refreshDeliveryNotes() {
      const deliveryNotes = await getDeliveryNotes(token);
      setData((current) => ({ ...current, deliveryNotes }));
      return deliveryNotes;
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
        notifySuccess(
          editor.kind === "client" && editor.id ? "Client mis à jour" : "Client créé",
          (payload.clientType === "company" ? payload.company : `${payload.firstName} ${payload.lastName}`.trim()) || (editor.kind === "client" && editor.id ? "Les modifications ont été enregistrées." : "Le client a été enregistré.")
        );
        setEditor({ kind: null, id: null });
      } catch (err) {
        notifyError("Client non enregistré", normalizeError(err));
      } finally {
        setLoading(false);
      }
    }

    async function saveUser() {
      setLoading(true);
      setError("");
      try {
        const payload = {
          username: forms.user.username,
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
        notifySuccess(editor.kind === "user" && editor.id ? "Utilisateur mis à jour" : "Utilisateur créé", payload.name || payload.email || (editor.kind === "user" && editor.id ? "Les modifications ont été enregistrées." : "Le compte a été enregistré."));
        setEditor({ kind: null, id: null });
      } catch (err) {
        notifyError("Utilisateur non enregistré", normalizeError(err));
      } finally {
        setLoading(false);
      }
    }

    async function saveInvoice() {
      setLoading(true);
      setError("");
      try {
        const normalizedLines = (forms.invoice.lines || []).map((line) => ({
          description: String(line.description || "").trim(),
          quantity: toMoneyValue(line.quantity),
          unitPrice: toMoneyValue(line.unitPrice)
        }));

        while (normalizedLines.length > 0) {
          const lastLine = normalizedLines[normalizedLines.length - 1];
          if (lastLine.description || lastLine.quantity || lastLine.unitPrice) {
            break;
          }
          normalizedLines.pop();
        }

        const invoiceTaxRate = forms.invoice.taxRate !== undefined && forms.invoice.taxRate !== "" ? Number(forms.invoice.taxRate) : 0;
        const payload = {
          ...forms.invoice,
          ...(forms.invoice.clientMode === "manual" ? {
            clientId: "",
            manualClientName: forms.invoice.manualClientName,
            manualClientEmail: forms.invoice.manualClientEmail,
            manualClientCompany: forms.invoice.manualClientCompany
          } : {}),
          userId: forms.invoice.userId || user?.id || "",
          prefix: workspaceSettings.invoicePrefix || "FAC",
          total: invoiceLinesTotal(normalizedLines) * (1 + invoiceTaxRate / 100),
          taxRate: invoiceTaxRate,
          lines: normalizedLines
        };
        if (editor.kind === "invoice" && editor.id) {
          await updateInvoice(token, editor.id, payload);
        } else {
          await createInvoice(token, payload);
        }
        await refresh();
        notifySuccess(editor.kind === "invoice" && editor.id ? "Facture mise à jour" : "Facture créée", invoiceDisplayLabel(payload));
        setEditor({ kind: null, id: null });
      } catch (err) {
        notifyError("Facture non enregistrée", normalizeError(err));
      } finally {
        setLoading(false);
      }
    }

    async function savePayment() {
      setLoading(true);
      setError("");
      try {
        const paymentInvoiceId = editor.invoiceId || forms.payment.invoiceId;
        if (!paymentInvoiceId) {
          throw new Error("Invoice not found");
        }

        const payload = {
          ...forms.payment,
          invoiceId: paymentInvoiceId,
          amount: toMoneyValue(forms.payment.amount),
          userId: user?.id || "",
          paidAt: forms.payment.paidAt || todayISO()
        };
        const paymentInvoice = data.invoices.find((invoice) => invoice.id === paymentInvoiceId);

        if (editor.kind === "payment" && editor.id) {
          await updateInvoicePayment(token, editor.id, payload);
        } else {
          await createInvoicePayment(token, paymentInvoiceId, payload);
        }
        await refresh();
        notifySuccess(
          editor.kind === "payment" && editor.id ? "Paiement mis à jour" : "Paiement ajouté",
          `${money(payload.amount, paymentInvoice?.currency)} · ${invoiceDisplayLabel(paymentInvoice || {})}`
        );
        setEditor({ kind: null, id: null });
      } catch (err) {
        notifyError("Paiement non enregistré", normalizeError(err));
      } finally {
        setLoading(false);
      }
    }

    async function removeClient(id) {
      const client = data.clients.find((item) => item.id === id);
      const label = client ? personLabel(client) || `${client.firstName || ""} ${client.lastName || ""}`.trim() || "ce contact" : "ce contact";
      if (!confirmDestructiveAction(`Supprimer ${label} ? Cette action est définitive.`)) {
        return;
      }
      setLoading(true);
      setError("");
      try {
        await deleteClient(token, id);
        await refresh();
        notifySuccess("Client supprimé", label);
      } catch (err) {
        notifyError("Suppression du client impossible", normalizeError(err));
      } finally {
        setLoading(false);
      }
    }

    async function removeUser(id) {
      const userToDelete = data.users.find((item) => item.id === id);
      const label = userToDelete?.name || userToDelete?.email || "cet utilisateur";
      if (!confirmDestructiveAction(`Supprimer ${label} ? Cette action est définitive.`)) {
        return;
      }
      setLoading(true);
      setError("");
      try {
        await deleteUser(token, id);
        await refresh();
        notifySuccess("Utilisateur supprimé", label);
      } catch (err) {
        notifyError("Suppression de l’utilisateur impossible", normalizeError(err));
      } finally {
        setLoading(false);
      }
    }

    async function removeInvoice(id) {
      const invoice = data.invoices.find((item) => item.id === id);
      const label = invoice ? invoiceDisplayLabel(invoice) : "cette facture";
      const amountLabel = invoice ? ` (${money(invoice.total, invoice.currency)})` : "";
      const paymentCount = invoice?.payments?.length || 0;
      const paymentWarning = paymentCount > 0 ? ` Les ${paymentCount} paiement(s) associés seront aussi supprimés.` : "";
      if (!confirmDestructiveAction(`Supprimer ${label}${amountLabel} ? Cette action est définitive.${paymentWarning}`)) {
        return;
      }
      setLoading(true);
      setError("");
      try {
        await deleteInvoice(token, id);
        await refresh();
        notifySuccess("Facture supprimée", label);
      } catch (err) {
        notifyError("Suppression de la facture impossible", normalizeError(err));
      } finally {
        setLoading(false);
      }
    }

    async function removePayment(id) {
      const payment = data.invoices
        .flatMap((invoice) => (invoice.payments || []).map((item) => ({ ...item, invoice })))
        .find((item) => item.id === id);
      const label = payment ? `${money(payment.amount, payment.invoice.currency)} · ${invoiceDisplayLabel(payment.invoice)}` : "ce paiement";
      if (!confirmDestructiveAction(`Supprimer ${label} ? Cette action est définitive.`)) {
        return;
      }
      setLoading(true);
      setError("");
      try {
        await deleteInvoicePayment(token, id);
        await refresh();
        if (editor.kind === "payment" && editor.id === id) {
          setEditor({ kind: null, id: null });
        }
        notifySuccess("Paiement supprimé", label);
      } catch (err) {
        notifyError("Suppression du paiement impossible", normalizeError(err));
      } finally {
        setLoading(false);
      }
    }

    async function saveDeliveryNote(payload, id = null) {
      setLoading(true);
      try {
        const result = id ? await updateDeliveryNote(token, id, payload) : await createDeliveryNote(token, payload);
        await refreshDeliveryNotes();
        notifySuccess(id ? "Bon de livraison mis à jour" : "Bon de livraison créé", result.number);
        return result;
      } catch (err) {
        notifyError("Bon de livraison non enregistré", normalizeError(err));
        throw err;
      } finally { setLoading(false); }
    }

    async function removeDeliveryNote(id) {
      if (!confirmDestructiveAction("Supprimer ce bon de livraison ? Cette action est définitive.")) return;
      setLoading(true);
      try { await deleteDeliveryNote(token, id); await refreshDeliveryNotes(); notifySuccess("Bon de livraison supprimé", ""); }
      catch (err) { notifyError("Suppression impossible", normalizeError(err)); }
      finally { setLoading(false); }
    }

    async function invoiceDeliveryNote(id) {
      setLoading(true);
      try { const invoice = await convertDeliveryNote(token, id); await refreshDeliveryNotes(); notifySuccess("Facture créée", invoice.number); return invoice; }
      catch (err) { notifyError("Conversion impossible", normalizeError(err)); throw err; }
      finally { setLoading(false); }
    }

    return {
      token,
      user,
      loading,
      isHydrating,
      error,
      notifySuccess,
      notifyError,
      toasts,
      data,
      forms,
      editor,
      setForms,
      dismissToast,
      authenticate,
      logout,
      resetWorkspaceSettings,
      saveWorkspaceSettingsNow,
      closeEditor: () => setEditor({ kind: null, id: null }),
      refresh,
      refreshDeliveryNotes,
      beginCreateClient,
      beginEditClient,
      beginCreateUser,
      beginEditUser,
      beginCreateInvoice,
      beginCreateInvoiceWithPreset,
      beginEditInvoice,
      beginManagePayments,
      beginEditPayment,
      saveClient,
      saveUser,
      saveInvoice,
      savePayment,
      removeClient,
      removeUser,
      removeInvoice,
      removePayment,
      saveDeliveryNote,
      removeDeliveryNote,
      invoiceDeliveryNote,
      workspaceSettings,
      setWorkspaceSettings,
      theme,
      setTheme,
      toggleTheme
    };
  }, [data.clients, data.invoices, data.users, data.deliveryNotes, editor, forms, loading, isHydrating, token, user, error, workspaceSettings, theme, toasts, dismissToast, resetWorkspaceSettings]);

  return <WorkspaceContext.Provider value={actions}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return value;
}
