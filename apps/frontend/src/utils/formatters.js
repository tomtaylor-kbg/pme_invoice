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

export function formatMoney(value, currency = "EUR") {
  const number = Number(value || 0);
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(number);
}

export function money(value, currency = "EUR") {
  return formatMoney(value, currency);
}

export function formatDate(value) {
  if (!value) return "-";
  if (/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(String(value))) return formatISODate(value);
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
}

export function formatISODate(value) {
  if (!value) return "-";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "UTC" }).format(parsed);
  }
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!year || !month || !day) {
    return String(value);
  }

  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day))
  );
}

export function isoDateFromUtcDate(date) {
  return date.toISOString().slice(0, 10);
}

export function toMoneyValue(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

export function createInvoiceLineDraft(overrides = {}) {
  return {
    description: "",
    quantity: "1",
    unitPrice: "",
    ...overrides
  };
}

export function normalizeInvoiceLine(line = {}) {
  return {
    description: line.description ?? "",
    quantity: line.quantity !== undefined && line.quantity !== null ? String(line.quantity) : "1",
    unitPrice: line.unitPrice !== undefined && line.unitPrice !== null ? String(line.unitPrice) : ""
  };
}

export function invoiceLineTotal(line = {}) {
  return toMoneyValue(line.quantity) * toMoneyValue(line.unitPrice);
}

export function invoicePaymentTotal(payments = []) {
  return payments.reduce((sum, payment) => sum + toMoneyValue(payment.amount), 0);
}

export function invoicePaymentStatusLabel(invoice = {}) {
  const total = toMoneyValue(invoice.total);
  const paid = toMoneyValue(invoice.amountPaid);

  return total > 0 && paid >= total ? "Payée" : "Impayée";
}

export function invoiceSettlementStatus(invoice = {}) {
  const total = toMoneyValue(invoice.total);
  const paid = toMoneyValue(invoice.amountPaid);
  return total > 0 && paid >= total ? "paid" : "unpaid";
}

export function invoiceLinesTotal(lines = []) {
  return lines.reduce((sum, line) => sum + invoiceLineTotal(line), 0);
}

export function personLabel(person) {
  return [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim();
}

export function clientTypeLabel(value) {
  switch (value) {
    case "company":
      return "Personne morale";
    case "individual":
    default:
      return "Personne physique";
  }
}

export function clientProfileLabel(client) {
  return client?.company ? "Société" : "Particulier";
}

export function padSequence(value) {
  return String(value).padStart(4, "0");
}

export function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildInvoiceNumber(prefix, issueDate, sequence) {
  const year = issueDate ? issueDate.slice(0, 4) : String(new Date().getFullYear());
  const cleanPrefix = String(prefix || "FAC").trim().toUpperCase() || "FAC";
  return `${cleanPrefix}-${year}-${padSequence(sequence)}`;
}

export function invoiceDisplayNumber(value) {
  const normalized = String(value || "").trim().toUpperCase();
  const match = normalized.match(/^(?:[A-Z0-9]+-)?(\d{4}-\d{4})$/);
  return match ? match[1] : String(value || "").trim();
}

export function invoiceDisplayLabel(invoice = {}) {
  const number = invoiceDisplayNumber(invoice.number);
  return number ? `Facture n° ${number}` : "Facture";
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

export function paymentMethodLabel(value) {
  switch (value) {
    case "card":
      return "Carte";
    case "bank_transfer":
      return "Virement";
    case "mobile_money":
      return "Mobile money";
    case "check":
      return "Chèque";
    case "cash":
      return "Espèces";
    case "other":
    default:
      return "Autre";
  }
}

export function csvCell(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value).replace(".", ",");
  }
  let text = String(value ?? "");
  if (typeof value === "string" && /^[\u0000-\u0020]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsv(rows = [], headers = []) {
  const lines = [];
  if (headers.length) {
    lines.push(headers.map(csvCell).join(";"));
  }
  rows.forEach((row) => {
    lines.push(row.map(csvCell).join(";"));
  });
  return `\uFEFF${lines.join("\r\n")}`;
}

export function buildInvoicesCsv(invoices = []) {
  return buildCsv(
    invoices.map((invoice) => {
      const currency = invoice.currency || "EUR";
      const totalTTC = Number(invoice.total || 0);
      const taxRate = Number(invoice.taxRate ?? 20);
      const totalHT = Array.isArray(invoice.lines) && invoice.lines.length
        ? invoice.lines.reduce((sum, line) => sum + Number(line.lineTotal ?? Number(line.unitPrice || 0) * Number(line.quantity || 0)), 0)
        : (taxRate > 0 ? totalTTC / (1 + taxRate / 100) : totalTTC);
      const paid = Number(invoice.amountPaid || 0);
      return [
        invoice.number,
        [invoice.client?.firstName, invoice.client?.lastName].filter(Boolean).join(" ").trim() || invoice.client?.company || "",
        invoice.client?.company || "",
        invoice.creator?.name || invoice.creator?.email || "",
        invoicePaymentStatusLabel(invoice),
        currency,
        formatISODate(invoice.issueDate),
        formatISODate(invoice.dueDate),
        totalHT,
        totalTTC - totalHT,
        totalTTC,
        paid,
        invoice.balanceDue ?? Math.max(0, totalTTC - paid),
        taxRate,
        (invoice.lines || []).map((line) => `${line.description} × ${line.quantity}`).join(" | "),
        invoice.notes || ""
      ];
    }),
    ["Numéro", "Client", "Société", "Créée par", "Statut", "Devise", "Date d'émission", "Échéance", "Total HT", "TVA montant", "Total TTC", "Encaissé", "Reste dû", "TVA %", "Articles / prestations", "Notes"]
  );
}

export function buildClientsCsv(clients = []) {
  return buildCsv(
    clients.map((client) => [
      client.firstName || "",
      client.lastName || "",
      clientTypeLabel(client.clientType),
      client.company || "",
      client.email || "",
      client.phone || "",
      client.city || "",
      client.status || "active",
      client.invoicesCount ?? 0
    ]),
    ["Prénom", "Nom", "Type", "Société", "Email", "Téléphone", "Ville", "Statut", "Factures liées"]
  );
}

export function buildProformasCsv(proformas = []) {
  return buildCsv(proformas.map((proforma) => [
    proforma.number,
    proforma.client?.company || [proforma.client?.firstName, proforma.client?.lastName].filter(Boolean).join(" "),
    proforma.client?.email || "",
    proforma.status || "",
    proforma.currency || "CDF",
    formatISODate(proforma.issueDate),
    formatISODate(proforma.validUntil),
    proforma.total ?? 0,
    proforma.taxRate ?? 0,
    (proforma.lines || []).map((line) => `${line.description} × ${line.quantity}`).join(" | "),
    proforma.convertedInvoice?.number || "",
    proforma.notes || ""
  ]), ["Numéro pro forma", "Client", "Email", "Statut", "Devise", "Date", "Valide jusqu'au", "Total TTC", "TVA %", "Articles / prestations", "Facture créée", "Notes"]);
}

export function buildCashDisbursementsCsv(records = []) {
  const categoryLabels = { achats: "Achats et fournitures", transport: "Transport", salaires: "Salaires et avances", loyer: "Loyer et charges", entretien: "Entretien", autre: "Autre" };
  return buildCsv(records.map((record) => [
    record.number,
    formatISODate(String(record.paidAt || "").slice(0, 10)),
    record.beneficiary,
    categoryLabels[record.category] || record.category,
    record.reason,
    record.amount,
    record.currency || "CDF",
    record.recorder?.name || record.recorder?.email || "",
    record.notes || ""
  ]), ["Numéro du bon", "Date", "Bénéficiaire", "Catégorie", "Motif", "Montant", "Devise", "Saisi par", "Notes"]);
}

export function localDateStamp(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function downloadTextFile(filename, content, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

export function formatMonthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(value) {
  const [year, month] = String(value || "").split("-").map(Number);
  if (!year || !month) {
    return value || "";
  }
  return new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1))
  );
}

export function buildMonthlyRevenueSeries(invoices = [], months = 12) {
  const now = new Date();
  const keys = [];

  for (let index = months - 1; index >= 0; index -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
    keys.push(formatMonthKey(date));
  }

  const totals = new Map(keys.map((key) => [key, 0]));

  invoices.forEach((invoice) => {
    const date = new Date(invoice.issueDate || invoice.createdAt || Date.now());
    if (Number.isNaN(date.getTime())) {
      return;
    }
    const key = formatMonthKey(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)));
    if (totals.has(key)) {
      totals.set(key, totals.get(key) + Number(invoice.total || 0));
    }
  });

  return keys.map((key) => ({
    key,
    label: monthLabel(key),
    value: totals.get(key) || 0
  }));
}

export function buildClientPerformanceSeries(invoices = [], limit = 5) {
  const totals = new Map();

  invoices.forEach((invoice) => {
    const key = invoice.client?.id || invoice.clientId || "unknown";
    const label = [invoice.client?.firstName, invoice.client?.lastName].filter(Boolean).join(" ").trim() || invoice.client?.company || "Client";
    const current = totals.get(key) || { key, label, value: 0 };
    current.value += Number(invoice.total || 0);
    totals.set(key, current);
  });

  return Array.from(totals.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function buildInvoicePdfFilename({ invoice, client }) {
  const number = invoiceDisplayNumber(invoice?.number) || "facture";
  const clientLabel = [client?.firstName, client?.lastName].filter(Boolean).join(" ").trim() || client?.company || "";
  const title = String(invoice?.title || clientLabel || "").trim();
  const rawName = title ? `Facture ${number} - ${title}` : `Facture ${number}`;
  return `${rawName.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-").replace(/\s+/g, " ").trim()}.pdf`;
}
