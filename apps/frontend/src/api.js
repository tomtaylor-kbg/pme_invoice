const API_BASE = import.meta.env.VITE_API_URL || "";

async function request(path, { token, method = "GET", body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
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

export function getMe(token) {
  return request("/api/me", { token });
}

export function getDashboard(token) {
  return request("/api/dashboard", { token });
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

export function getReceipts(token) {
  return request("/api/receipts", { token });
}

export function createReceipt(token, data) {
  return request("/api/receipts", { token, method: "POST", body: data });
}

export function updateReceipt(token, id, data) {
  return request(`/api/receipts/${id}`, { token, method: "PATCH", body: data });
}

export function deleteReceipt(token, id) {
  return request(`/api/receipts/${id}`, { token, method: "DELETE" });
}

export function getInvoices(token) {
  return request("/api/invoices", { token });
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
