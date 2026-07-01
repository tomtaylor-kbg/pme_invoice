export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function slug(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function money(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(number);
}

export function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
}

export function formatISODate(value) {
  if (!value) return "-";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day))
  );
}

export function isoDateFromUtcDate(date) {
  return date.toISOString().slice(0, 10);
}

export function addDaysToISODate(value, days) {
  const base = value ? new Date(`${value}T00:00:00.000Z`) : new Date();
  if (Number.isNaN(base.getTime())) {
    return "";
  }

  const result = new Date(base);
  result.setUTCDate(result.getUTCDate() + Number(days || 0));
  return isoDateFromUtcDate(result);
}

export function toMoneyValue(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

export function calculateToolBreakdown({ quantity, unitPrice, discountRate, taxRate }) {
  const qty = Math.max(0, Number(quantity || 0));
  const price = Math.max(0, toMoneyValue(unitPrice));
  const discount = Math.max(0, Number(discountRate || 0));
  const tax = Math.max(0, Number(taxRate || 0));

  const subtotal = qty * price;
  const discountAmount = subtotal * (discount / 100);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * (tax / 100);
  const total = taxableAmount + taxAmount;

  return { subtotal, discountAmount, taxableAmount, taxAmount, total };
}

export function personLabel(person) {
  return [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim();
}

export function receiptWidthLabel(width) {
  return `${width || 58} mm`;
}

export function receiptTone(width) {
  return Number(width) >= 80 ? "wide" : "compact";
}

export function padSequence(value) {
  return String(value).padStart(4, "0");
}

export function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildInvoiceNumber(prefix, issueDate, sequence) {
  const year = issueDate ? issueDate.slice(0, 4) : String(new Date().getFullYear());
  const cleanPrefix = String(prefix || "FAC").trim().toUpperCase() || "FAC";
  return `${cleanPrefix}-${year}-${padSequence(sequence)}`;
}

export function nextInvoiceSequence(invoices, prefix, issueDate) {
  const year = issueDate ? issueDate.slice(0, 4) : String(new Date().getFullYear());
  const cleanPrefix = String(prefix || "FAC").trim().toUpperCase() || "FAC";
  const pattern = new RegExp(`^${escapeRegExp(cleanPrefix)}-${year}-(\\d{4})$`);

  const maxSequence = invoices.reduce((max, invoice) => {
    const match = String(invoice.number || "").match(pattern);
    if (!match) return max;
    return Math.max(max, Number(match[1] || 0));
  }, 0);

  return maxSequence + 1;
}

export function suggestInvoiceNumber(invoices, prefix, issueDate) {
  return buildInvoiceNumber(prefix, issueDate, nextInvoiceSequence(invoices, prefix, issueDate));
}

export function statusToLabel(value) {
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
