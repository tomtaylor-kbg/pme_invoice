const API_BASE = import.meta.env.VITE_API_URL || "";

async function request(path, { token, method = "GET", body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "Request failed");
  }

  return payload;
}

export function login(username, password) {
  return request("/api/auth/login", {
    method: "POST",
    body: { username, password }
  });
}

export function logout(token) {
  return request("/api/auth/logout", { token, method: "POST" });
}

export function getMe(token) {
  return request("/api/auth/me", { token });
}

export function getDashboard(token) {
  return request("/api/dashboard", { token });
}

export function getAuditLogs(token) {
  return request("/api/audit-logs", { token });
}

export function getWorkspaceSettings(token) {
  return request("/api/workspace-settings", { token });
}

export function updateWorkspaceSettings(token, data) {
  return request("/api/workspace-settings", { token, method: "PATCH", body: data });
}

export function getClients(token) {
  return request("/api/clients", { token });
}

export function createClient(token, data) {
  return request("/api/clients", { token, method: "POST", body: data });
}

export function updateClient(token, id, data) {
  return request(`/api/clients/${id}`, { token, method: "PATCH", body: data });
}

export function deleteClient(token, id) {
  return request(`/api/clients/${id}`, { token, method: "DELETE" });
}

export function getUsers(token) {
  return request("/api/users", { token });
}

export function createUser(token, data) {
  return request("/api/users", { token, method: "POST", body: data });
}

export function updateUser(token, id, data) {
  return request(`/api/users/${id}`, { token, method: "PATCH", body: data });
}

export function deleteUser(token, id) {
  return request(`/api/users/${id}`, { token, method: "DELETE" });
}

export function getInvoices(token) {
  return request("/api/invoices", { token });
}

export function getInvoiceNextNumber(token, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      query.set(key, String(value));
    }
  });
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request(`/api/invoices/next-number${suffix}`, { token });
}

export function createInvoice(token, data) {
  return request("/api/invoices", { token, method: "POST", body: data });
}

export function updateInvoice(token, id, data) {
  return request(`/api/invoices/${id}`, { token, method: "PATCH", body: data });
}

export function deleteInvoice(token, id) {
  return request(`/api/invoices/${id}`, { token, method: "DELETE" });
}

export function getProformas(token) {
  return request("/api/proformas", { token });
}

export function createProforma(token, data) {
  return request("/api/proformas", { token, method: "POST", body: data });
}

export function updateProforma(token, id, data) {
  return request(`/api/proformas/${id}`, { token, method: "PATCH", body: data });
}

export function deleteProforma(token, id) {
  return request(`/api/proformas/${id}`, { token, method: "DELETE" });
}

export function convertProforma(token, id) {
  return request(`/api/proformas/${id}/convert`, { token, method: "POST" });
}

export function getDeliveryNotes(token) { return request("/api/delivery-notes", { token }); }
export function createDeliveryNote(token, data) { return request("/api/delivery-notes", { token, method: "POST", body: data }); }
export function updateDeliveryNote(token, id, data) { return request(`/api/delivery-notes/${id}`, { token, method: "PATCH", body: data }); }
export function deleteDeliveryNote(token, id) { return request(`/api/delivery-notes/${id}`, { token, method: "DELETE" }); }
export function convertDeliveryNote(token, id) { return request(`/api/delivery-notes/${id}/convert`, { token, method: "POST" }); }

export function getOrders(token) { return request("/api/orders", { token }); }
export function createOrder(token, data) { return request("/api/orders", { token, method: "POST", body: data }); }
export function updateOrder(token, id, data) { return request(`/api/orders/${id}`, { token, method: "PATCH", body: data }); }
export function convertOrderToInvoice(token, id) { return request(`/api/orders/${id}/convert-to-invoice`, { token, method: "POST" }); }
export function getOrderOperators(token) { return request("/api/orders/operators", { token }); }

export function getActiveCashSession(token) { return request("/api/cash-register/active", { token }); }
export function getCashSessions(token) { return request("/api/cash-register/sessions", { token }); }
export function getDailyCashReport(token, date) { return request(`/api/cash-register/reports/daily${date ? `?date=${encodeURIComponent(date)}` : ""}`, { token }); }
export function openCashSession(token, data) { return request("/api/cash-register/sessions", { token, method: "POST", body: data }); }
export function closeCashSession(token, id, data) { return request(`/api/cash-register/sessions/${id}/close`, { token, method: "POST", body: data }); }
export function addCashMovement(token, data) { return request("/api/cash-register/movements", { token, method: "POST", body: data }); }

export function getCashDisbursements(token) {
  return request("/api/cash-disbursements", { token });
}

export function createCashDisbursement(token, data) {
  return request("/api/cash-disbursements", { token, method: "POST", body: data });
}

export function updateCashDisbursement(token, id, data) {
  return request(`/api/cash-disbursements/${id}`, { token, method: "PATCH", body: data });
}

export function deleteCashDisbursement(token, id) {
  return request(`/api/cash-disbursements/${id}`, { token, method: "DELETE" });
}

export function getInvoicePayments(token, invoiceId) {
  return request(`/api/invoices/${invoiceId}/payments`, { token });
}

export function createInvoicePayment(token, invoiceId, data) {
  return request(`/api/invoices/${invoiceId}/payments`, { token, method: "POST", body: data });
}

export function updateInvoicePayment(token, id, data) {
  return request(`/api/payments/${id}`, { token, method: "PATCH", body: data });
}

export function deleteInvoicePayment(token, id) {
  return request(`/api/payments/${id}`, { token, method: "DELETE" });
}
