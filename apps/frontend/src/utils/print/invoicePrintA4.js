import {
  buildInvoicePdfFilename,
  escapeHtml,
  formatISODate,
  formatMoney,
  invoiceDisplayLabel,
  invoiceLineTotal,
  statusToLabel,
  invoiceLinesTotal
} from "../formatters";
import { formatWorkspaceAddress, formatWorkspaceContact, formatWorkspaceLegalInfo } from "./invoicePrintShared";

export function buildInvoicePrintHtml({ invoice, client, creator, settings = {} }) {
  const currency = invoice?.currency || "EUR";
  const lines = (Array.isArray(invoice?.lines) ? invoice.lines : []).filter(
    (line) => String(line?.description || "").trim() || Number(line?.quantity || 0) > 0 || Number(line?.unitPrice || 0) > 0
  );
  const taxRate = Number(invoice?.taxRate ?? 20);
  const isVatActive = taxRate > 0;
  const totalHT = invoiceLinesTotal(lines);
  const taxAmount = isVatActive ? totalHT * (taxRate / 100) : 0;
  const totalTTC = totalHT + taxAmount;
  const createdBy = creator?.name || creator?.email || "Session courante";
  const clientLabel = [client?.firstName, client?.lastName].filter(Boolean).join(" ").trim() || client?.company || "Client";
  const clientCompany = client?.company || "";
  const clientEmail = client?.email || "";
  const clientPhone = client?.phone || "";
  const companyName = settings.companyName || "Mon entreprise";
  const logoDataUrl = String(settings.logoDataUrl || "");
  const addressLine = formatWorkspaceAddress(settings);
  const contactLine = formatWorkspaceContact(settings);
  const legalLine = formatWorkspaceLegalInfo(settings);
  const businessSector = String(settings.businessSector || "").trim();
  const documentLabel = invoice?.documentType === "proforma"
    ? `Facture pro forma n° ${String(invoice.number || "").replace(/^[A-Z0-9]+-/, "")}`
    : invoiceDisplayLabel(invoice);
  const documentFilename = invoice?.documentType === "proforma"
    ? `Pro forma ${String(invoice.number || "proforma").replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")}.pdf`
    : buildInvoicePdfFilename({ invoice, client });
  const dateQualifier = invoice?.documentType === "proforma" ? "Valable jusqu’au" : "Échéance";
  const endDate = invoice?.documentType === "proforma" ? invoice?.validUntil : invoice?.dueDate;
  const printStatus = invoice?.documentType === "proforma"
    ? ({ draft: "Brouillon", sent: "Envoyée au client", accepted: "Acceptée", rejected: "Refusée", converted: "Convertie en facture" })[invoice?.status] || "Pro forma"
    : statusToLabel(invoice?.status || "draft");

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(documentFilename.replace(/\.pdf$/i, ""))}</title>
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
      .preview-toolbar {
        position: sticky;
        top: 0;
        z-index: 1;
        display: flex;
        justify-content: space-between;
        max-width: 210mm;
        margin: 0 auto 12px;
        padding: 10px 0;
        background: #fff;
      }
      .preview-toolbar button {
        padding: 9px 14px;
        border: 0;
        border-radius: 5px;
        color: #fff;
        background: #1d4ed8;
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
      }
      .preview-toolbar .return-button { border: 1px solid #cbd5e1; color: #334155; background: #f1f5f9; }
      .sheet {
        display: flex;
        flex-direction: column;
        min-height: 265mm;
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        padding: 20px;
      }
      .top {
        display: grid;
        justify-items: center;
        gap: 18px;
        margin-bottom: 24px;
        padding: 8px 0 20px;
        border-bottom: 2px solid #0f172a;
        text-align: center;
      }
      .brand {
        display: grid;
        justify-items: center;
        gap: 5px;
        width: 100%;
      }
      .brand strong {
        margin-top: 5px;
        font-size: 24px;
        font-weight: 750;
        line-height: 1.2;
      }
      .company-logo { display: block; max-width: 150px; max-height: 72px; object-fit: contain; margin-bottom: 4px; }
      .brand span, .meta, .client-block, .footer-note {
        color: #475569;
        font-size: 12px;
        line-height: 1.5;
      }
      .brand .highlight {
        color: #0f172a;
        font-weight: 600;
      }
      .brand .sector {
        color: #1d4ed8;
      }
      .title-block { text-align: center; }
      .title-block h1 {
        margin: 0;
        font-size: 22px;
        text-transform: uppercase;
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
        margin-top: auto;
        padding-top: 14px;
        border-top: 1px solid #cbd5e1;
        text-align: center;
      }
      .footer-note span { display: block; }
      .footer-note .legal { margin-top: 3px; font-size: 10px; }
      .badge {
        display: inline-block;
        padding: 4px 11px;
        border: 1px solid #cbd5e1;
        border-radius: 3px;
        color: #334155;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      @media print {
        body { margin: 0; }
        .sheet { border: 0; border-radius: 0; }
        .preview-toolbar { display: none; }
      }
    </style>
  </head>
  <body>
    <div class="preview-toolbar">
      <button class="return-button" type="button" onclick="if (window.opener) { window.close(); } else { window.history.back(); }">Retour</button>
      <button type="button" onclick="window.print()">Imprimer / Enregistrer en PDF</button>
    </div>
    <div class="page">
      <div class="sheet">
        <div class="top">
          <div class="brand">
            ${logoDataUrl ? `<img class="company-logo" src="${escapeHtml(logoDataUrl)}" alt="Logo ${escapeHtml(companyName)}" />` : ""}
            <strong>${escapeHtml(companyName)}</strong>
            ${addressLine ? `<span class="highlight">${escapeHtml(addressLine)}</span>` : ""}
            ${contactLine ? `<span>${escapeHtml(contactLine)}</span>` : ""}
            ${businessSector ? `<span class="sector">${escapeHtml(businessSector)}</span>` : ""}
          </div>
          <div class="title-block">
            <h1>${escapeHtml(documentLabel)}</h1>
            <p>${escapeHtml(formatISODate(invoice?.issueDate))} · ${dateQualifier} ${escapeHtml(formatISODate(endDate))}</p>
            <p>${escapeHtml(printStatus)}</p>
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
            ${isVatActive ? `
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
            ` : `
            <div class="summary-row divider-row" style="margin-top: 4px;">
              <span>Total : </span>
              <strong>${escapeHtml(formatMoney(totalHT, currency))}</strong>
            </div>
            `}
          </div>
        </div>

        ${invoice?.notes ? `<div class="notes">${escapeHtml(invoice.notes)}</div>` : ""}
        <footer class="footer-note"><span>${escapeHtml(companyName)}</span>${legalLine ? `<span class="legal">${escapeHtml(legalLine)}</span>` : ""}</footer>
      </div>
    </div>
  </body>
</html>`;
}
