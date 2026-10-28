export async function request(apiUrl, path, { token, method = "GET", body, mobile = false } = {}) {
  const response = await fetch(`${apiUrl.replace(/\/$/, "")}${path}`, { method, headers: { Accept: "application/json", "Content-Type": "application/json", ...(mobile ? { "X-Client": "mobile" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "La requête n’a pas pu aboutir.");
  return payload;
}
export function listItems(payload) { return payload?.items || payload?.data || (Array.isArray(payload) ? payload : []); }
export function formatAmount(value, currency = "USD") { return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(Number(value || 0)); }
