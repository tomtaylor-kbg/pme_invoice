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

  if (total <= 0 || paid <= 0) {
    return "Non payée";
  }

  if (paid >= total) {
    return "Réglée";
  }

  return "Partiellement payée";
}

export function invoiceLinesTotal(lines = []) {
  return lines.reduce((sum, line) => sum + invoiceLineTotal(line), 0);
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

export function invoiceTemplateLabel(value) {
  switch (value) {
    case "receipt":
      return "Modèle receipt";
    case "professional":
    default:
      return "Modèle professionnel";
  }
}

export function invoiceTemplateAudience(value) {
  switch (value) {
    case "receipt":
      return "Destiné au service direct, module à développer plus tard.";
    case "professional":
    default:
      return "Destiné aux utilisateurs et aux factures classiques.";
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

export function invoicePrefixForType(value) {
  return value === "receipt" ? "REC" : "FAC";
}

export function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildCsv(rows = [], headers = []) {
  const lines = [];
  if (headers.length) {
    lines.push(headers.map(csvCell).join(","));
  }
  rows.forEach((row) => {
    lines.push(row.map(csvCell).join(","));
  });
  return lines.join("\n");
}

export function buildInvoicesCsv(invoices = []) {
  return buildCsv(
    invoices.map((invoice) => [
      invoice.number,
      [invoice.client?.firstName, invoice.client?.lastName].filter(Boolean).join(" ").trim() || invoice.client?.company || "",
      invoice.client?.company || "",
      invoice.creator?.name || invoice.creator?.email || "",
      invoice.templateType || "",
      invoice.status || "",
      invoice.currency || "EUR",
      formatISODate(invoice.issueDate),
      formatISODate(invoice.dueDate),
      invoice.total ?? 0,
      invoice.taxRate ?? 20,
      invoice.notes || ""
    ]),
    ["Numéro", "Client", "Société", "Créée par", "Modèle", "Statut", "Devise", "Date d'émission", "Échéance", "Total TTC", "TVA %", "Notes"]
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
  const number = String(invoice?.number || "facture").trim();
  const clientLabel = [client?.firstName, client?.lastName].filter(Boolean).join(" ").trim() || client?.company || "";
  const title = String(invoice?.title || clientLabel || "").trim();
  const rawName = title ? `${number} - ${title}` : number;
  return `${rawName.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-").replace(/\s+/g, " ").trim()}.pdf`;
}

function formatWorkspaceAddress(settings = {}) {
  return [settings.addressLine1, settings.addressLine2, [settings.postalCode, settings.city].filter(Boolean).join(" "), settings.country]
    .filter(Boolean)
    .join(" · ");
}

function formatWorkspaceContact(settings = {}) {
  return [settings.phone, settings.email, settings.website].filter(Boolean).join(" · ");
}

function formatWorkspaceServices(settings = {}) {
  return String(settings.services || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .join(" · ");
}

export function buildInvoicePrintHtml({ invoice, client, creator, settings = {} }) {
  if (invoice?.templateType === "receipt") {
    return buildThermalReceiptPrintHtml({ invoice, client, creator, settings });
  }

  const currency = invoice?.currency || "EUR";
  const lines = (Array.isArray(invoice?.lines) ? invoice.lines : []).filter(
    (line) => String(line?.description || "").trim() || Number(line?.quantity || 0) > 0 || Number(line?.unitPrice || 0) > 0
  );
  const taxRate = Number(invoice?.taxRate ?? 20);
  const totalHT = invoiceLinesTotal(lines);
  const taxAmount = totalHT * (taxRate / 100);
  const totalTTC = totalHT + taxAmount;
  const createdBy = creator?.name || creator?.email || "Session courante";
  const clientLabel = [client?.firstName, client?.lastName].filter(Boolean).join(" ").trim() || client?.company || "Client";
  const clientCompany = client?.company || "";
  const clientEmail = client?.email || "";
  const clientPhone = client?.phone || "";
  const companyName = settings.companyName || "Facturation Interne";
  const addressLine = formatWorkspaceAddress(settings);
  const contactLine = formatWorkspaceContact(settings);
  const servicesLine = formatWorkspaceServices(settings);

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(buildInvoicePdfFilename({ invoice, client }).replace(/\.pdf$/i, ""))}</title>
    <style>
      @page { size: A4; margin: 16mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, Arial, sans-serif;
        color: #0f172a;
        background: #fff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .page {
        width: 100%;
        max-width: 210mm;
        margin: 0 auto;
        padding: 0;
      }
      .sheet {
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        padding: 20px;
      }
      .top {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        align-items: start;
        margin-bottom: 24px;
        padding-bottom: 18px;
        border-bottom: 1px solid #e2e8f0;
      }
      .brand {
        display: grid;
        gap: 6px;
        max-width: 52%;
      }
      .brand strong {
        font-size: 20px;
        letter-spacing: 0.02em;
      }
      .brand span, .meta, .client-block, .footer-note {
        color: #475569;
        font-size: 12px;
        line-height: 1.5;
      }
      .brand .highlight {
        color: #0f172a;
        font-weight: 600;
      }
      .brand .services {
        color: #1d4ed8;
      }
      .title-block {
        text-align: right;
        max-width: 42%;
      }
      .title-block h1 {
        margin: 0;
        font-size: 26px;
      }
      .title-block p {
        margin: 6px 0 0;
        color: #64748b;
      }
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 20px;
      }
      .card {
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        padding: 14px;
      }
      .card h2 {
        margin: 0 0 10px;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: #64748b;
      }
      .invoice-meta {
        display: grid;
        gap: 6px;
      }
      .invoice-meta div, .client-fields div {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }
      .invoice-meta span:first-child, .client-fields span:first-child {
        color: #64748b;
      }
      .lines {
        width: 100%;
        border-collapse: collapse;
        margin-top: 12px;
      }
      .lines th, .lines td {
        border-bottom: 1px solid #e2e8f0;
        padding: 10px 8px;
        text-align: left;
        vertical-align: top;
      }
      .lines th {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #64748b;
      }
      .lines td.num, .lines th.num {
        width: 40px;
        text-align: center;
      }
      .lines td.qty, .lines th.qty,
      .lines td.unit, .lines th.unit,
      .lines td.total, .lines th.total {
        text-align: right;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }
      .summary {
        margin-top: 18px;
        display: flex;
        justify-content: flex-end;
      }
      .summary-box {
        min-width: 240px;
        border: 1px solid #cbd5e1;
        border-radius: 14px;
        padding: 14px;
      }
      .summary-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 8px;
      }
      .summary-row strong {
        font-size: 18px;
      }
      .notes {
        margin-top: 18px;
        padding: 14px;
        border: 1px dashed #cbd5e1;
        border-radius: 14px;
        color: #334155;
        line-height: 1.6;
        white-space: pre-wrap;
      }
      .footer-note {
        margin-top: 20px;
        text-align: center;
      }
      .badge {
        display: inline-flex;
        padding: 4px 10px;
        border-radius: 999px;
        background: #dbeafe;
        color: #1d4ed8;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      @media print {
        body { margin: 0; }
        .sheet { border: 0; border-radius: 0; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="sheet">
        <div class="top">
          <div class="brand">
            <span class="badge">${escapeHtml(invoice?.templateType === "receipt" ? "Receipt" : "Facture professionnelle")}</span>
            <strong>${escapeHtml(companyName)}</strong>
            ${addressLine ? `<span class="highlight">${escapeHtml(addressLine)}</span>` : ""}
            ${contactLine ? `<span>${escapeHtml(contactLine)}</span>` : ""}
            ${servicesLine ? `<span class="services">Services: ${escapeHtml(servicesLine)}</span>` : ""}
          </div>
          <div class="title-block">
            <h1>${escapeHtml(invoice?.number || "Facture")}</h1>
            <p>${escapeHtml(formatISODate(invoice?.issueDate))} · Échéance ${escapeHtml(formatISODate(invoice?.dueDate))}</p>
            <p>${escapeHtml(statusToLabel(invoice?.status || "draft"))}</p>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <h2>Client</h2>
            <div class="client-fields">
              <div><span>Nom</span><strong>${escapeHtml(clientLabel)}</strong></div>
              ${clientCompany ? `<div><span>Société</span><strong>${escapeHtml(clientCompany)}</strong></div>` : ""}
              ${clientEmail ? `<div><span>Email</span><strong>${escapeHtml(clientEmail)}</strong></div>` : ""}
              ${clientPhone ? `<div><span>Téléphone</span><strong>${escapeHtml(clientPhone)}</strong></div>` : ""}
            </div>
          </div>
          <div class="card">
            <h2>Informations</h2>
            <div class="invoice-meta">
              <div><span>Modèle</span><strong>${escapeHtml(invoiceTemplateLabel(invoice?.templateType))}</strong></div>
              <div><span>Devise</span><strong>${escapeHtml(currency)}</strong></div>
              ${settings.vatRate ? `<div><span>TVA par défaut</span><strong>${escapeHtml(settings.vatRate)}%</strong></div>` : ""}
              <div><span>Créée par</span><strong>${escapeHtml(createdBy)}</strong></div>
            </div>
          </div>
        </div>

        <table class="lines">
          <thead>
            <tr>
              <th class="num">N°</th>
              <th>Désignation</th>
              <th class="qty">Qte</th>
              <th class="unit">PU</th>
              <th class="total">PT</th>
            </tr>
          </thead>
          <tbody>
            ${lines
              .map(
                (line, index) => `
                  <tr>
                    <td class="num">${index + 1}</td>
                    <td>${escapeHtml(line.description || "")}</td>
                    <td class="qty">${escapeHtml(line.quantity || 0)}</td>
                    <td class="unit">${escapeHtml(formatMoney(line.unitPrice, currency))}</td>
                    <td class="total">${escapeHtml(formatMoney(invoiceLineTotal(line), currency))}</td>
                  </tr>
                `
              )
              .join("") || `
                <tr>
                  <td class="num" colspan="5">Aucune ligne</td>
                </tr>
              `}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-box">
            <div class="summary-row">
              <span>Total HT</span>
              <span>${escapeHtml(formatMoney(totalHT, currency))}</span>
            </div>
            <div class="summary-row">
              <span>TVA (${taxRate}%)</span>
              <span>${escapeHtml(formatMoney(taxAmount, currency))}</span>
            </div>
            <div class="summary-row divider-row" style="border-top: 1px solid #cbd5e1; margin-top: 8px; padding-top: 8px;">
              <span>Total TTC</span>
              <strong>${escapeHtml(formatMoney(totalTTC, currency))}</strong>
            </div>
            <div class="meta" style="font-size: 10px; color: #64748b; margin-top: 6px;">Total calculé avec TVA.</div>
          </div>
        </div>

        ${invoice?.notes ? `<div class="notes">${escapeHtml(invoice.notes)}</div>` : ""}
        <div class="footer-note">Document généré par Facturation Interne</div>
      </div>
    </div>
  </body>
</html>`;
}

export function buildThermalReceiptPrintHtml({ invoice, client, creator, settings = {} }) {
  const currency = invoice?.currency || "EUR";
  const lines = (Array.isArray(invoice?.lines) ? invoice.lines : []).filter(
    (line) => String(line?.description || "").trim() || Number(line?.quantity || 0) > 0 || Number(line?.unitPrice || 0) > 0
  );
  const taxRate = Number(invoice?.taxRate ?? 20);
  const totalHT = invoiceLinesTotal(lines);
  const taxAmount = totalHT * (taxRate / 100);
  const totalTTC = totalHT + taxAmount;
  const createdBy = creator?.name || creator?.email || "Session courante";
  const clientLabel = [client?.firstName, client?.lastName].filter(Boolean).join(" ").trim() || client?.company || "Client";
  const widthMm = 58;
  const companyName = settings.companyName || "Facturation Interne";
  const addressLine = formatWorkspaceAddress(settings);
  const contactLine = formatWorkspaceContact(settings);
  const servicesLine = formatWorkspaceServices(settings);

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(buildInvoicePdfFilename({ invoice, client }).replace(/\.pdf$/i, ""))}</title>
    <style>
      @page { size: ${widthMm}mm auto; margin: 3mm; }
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        width: ${widthMm}mm;
        background: #fff;
        color: #111827;
        font-family: Arial, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      body {
        padding: 3mm;
      }
      .ticket {
        width: 100%;
        display: grid;
        gap: 6px;
        font-size: 10px;
        line-height: 1.4;
      }
      .center {
        text-align: center;
      }
      .brand {
        display: grid;
        gap: 2px;
      }
      .brand strong {
        font-size: 13px;
      }
      .muted {
        color: #475569;
      }
      .divider {
        border-top: 1px dashed #cbd5e1;
        margin: 2px 0;
      }
      .meta {
        display: grid;
        gap: 2px;
      }
      .meta div {
        display: flex;
        justify-content: space-between;
        gap: 8px;
      }
      .lines {
        display: grid;
        gap: 6px;
      }
      .line {
        display: grid;
        gap: 2px;
      }
      .line-head, .line-foot {
        display: flex;
        justify-content: space-between;
        gap: 8px;
      }
      .line-desc {
        word-break: break-word;
      }
      .totals {
        display: grid;
        gap: 4px;
        padding-top: 4px;
      }
      .totals-row {
        display: flex;
        justify-content: space-between;
        gap: 8px;
      }
      .total-grand {
        font-size: 12px;
        font-weight: 700;
      }
      .footer {
        margin-top: 4px;
        text-align: center;
        white-space: pre-wrap;
      }
      .small {
        font-size: 9px;
      }
    </style>
  </head>
  <body>
    <div class="ticket">
      <div class="center brand">
        <strong>${escapeHtml(companyName)}</strong>
        ${addressLine ? `<span class="muted">${escapeHtml(addressLine)}</span>` : ""}
        ${contactLine ? `<span class="muted">${escapeHtml(contactLine)}</span>` : ""}
        ${servicesLine ? `<span class="muted">${escapeHtml(servicesLine)}</span>` : ""}
        <span class="muted">${escapeHtml(invoice?.number || "-")}</span>
        <span class="muted">${escapeHtml(invoiceTemplateLabel(invoice?.templateType))}</span>
      </div>

      <div class="divider"></div>

      <div class="meta">
        <div><span>Client</span><strong>${escapeHtml(clientLabel)}</strong></div>
        <div><span>Date</span><strong>${escapeHtml(formatISODate(invoice?.issueDate))}</strong></div>
        <div><span>Échéance</span><strong>${escapeHtml(formatISODate(invoice?.dueDate))}</strong></div>
        <div><span>Créée par</span><strong>${escapeHtml(createdBy)}</strong></div>
      </div>

      <div class="divider"></div>

      <div class="lines">
        ${lines
          .map(
            (line, index) => `
              <div class="line">
                <div class="line-head">
                  <strong>${index + 1}.</strong>
                  <strong>${escapeHtml(formatMoney(invoiceLineTotal(line), currency))}</strong>
                </div>
                <div class="line-desc">${escapeHtml(line.description || "")}</div>
                <div class="line-foot small">
                  <span>Qté: ${escapeHtml(line.quantity || 0)}</span>
                  <span>PU: ${escapeHtml(formatMoney(line.unitPrice, currency))}</span>
                </div>
              </div>
            `
          )
          .join("") || `<div class="small muted">Aucune ligne</div>`}
      </div>

      <div class="divider"></div>

      <div class="totals">
        <div class="totals-row">
          <span>Sous-total HT</span>
          <span>${escapeHtml(formatMoney(totalHT, currency))}</span>
        </div>
        <div class="totals-row">
          <span>TVA (${taxRate}%)</span>
          <span>${escapeHtml(formatMoney(taxAmount, currency))}</span>
        </div>
        <div class="totals-row total-grand" style="font-weight: 700; border-top: 1px dashed #cbd5e1; margin-top: 4px; padding-top: 4px;">
          <span>Total TTC</span>
          <strong>${escapeHtml(formatMoney(totalTTC, currency))}</strong>
        </div>
      </div>

      ${invoice?.notes ? `<div class="footer small">${escapeHtml(invoice.notes)}</div>` : ""}
      <div class="footer small muted">Merci pour votre visite</div>
    </div>
  </body>
</html>`;
}
