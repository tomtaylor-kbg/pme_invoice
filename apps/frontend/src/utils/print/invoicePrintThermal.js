import {
  buildInvoicePdfFilename,
  escapeHtml,
  formatISODate,
  formatMoney,
  invoiceDisplayLabel,
  invoiceLineTotal,
  invoiceTemplateLabel,
  invoiceLinesTotal
} from "../formatters";
import { formatWorkspaceAddress, formatWorkspaceContact, formatWorkspaceServices } from "./invoicePrintShared";

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
  const documentLabel = invoiceDisplayLabel(invoice);

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
        <span class="muted">${escapeHtml(documentLabel)}</span>
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
      <div class="footer small muted">Merci pour votre confiance!</div>
    </div>
  </body>
</html>`;
}
