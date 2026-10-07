import {
  buildInvoicePdfFilename,
  escapeHtml,
  formatISODate,
  formatMoney,
  invoiceDisplayLabel,
  invoiceLineTotal,
  invoiceLinesTotal,
  invoicePaymentTotal,
  paymentMethodLabel
} from "../formatters";
import { formatWorkspaceAddress, formatWorkspaceBankInfo, formatWorkspaceContact, formatWorkspaceLegalInfo } from "./invoicePrintShared";

export function buildThermalInvoiceHtml({ invoice, client, settings = {} }) {
  const currency = invoice?.currency || "EUR";
  const lines = (Array.isArray(invoice?.lines) ? invoice.lines : []).filter(
    (line) => String(line?.description || "").trim() || Number(line?.quantity || 0) > 0 || Number(line?.unitPrice || 0) > 0
  );
  const totalHT = invoiceLinesTotal(lines);
  const configuredVatRate = Number(settings?.vatRate);
  const taxRate = configuredVatRate === 0 ? 0 : Number(invoice?.taxRate ?? (configuredVatRate || 20));
  const isVatActive = taxRate > 0;
  const taxAmount = isVatActive ? (totalHT * taxRate / 100) : 0;
  const totalTTC = totalHT + taxAmount;
  const paid = Number(invoice?.amountPaid ?? invoicePaymentTotal(invoice?.payments || []));
  const balanceDue = Math.max(0, Number(invoice?.balanceDue ?? totalTTC - paid));
  const clientName = [client?.firstName, client?.lastName].filter(Boolean).join(" ").trim() || client?.company || "Client comptoir";
  const companyName = settings.companyName || "Mon entreprise";
  const address = formatWorkspaceAddress(settings);
  const contact = formatWorkspaceContact(settings);
  const legalInfo = formatWorkspaceLegalInfo(settings);
  const bankInfo = formatWorkspaceBankInfo(settings);
  const logo = String(settings.logoDataUrl || "");
  const filename = buildInvoicePdfFilename({ invoice, client }).replace(/\.pdf$/i, "");
  const directorName = "Directeur";

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(filename)}</title>
    <style>
      @page { size: 80mm auto; margin: 0; }
      * { box-sizing: border-box; }
      html, body { width: 80mm; margin: 0; padding: 0; color: #111; background: #fff; font-family: Arial, sans-serif; }
      body { padding: 4mm; }
      .ticket { width: 72mm; margin: 0 auto; font-size: 9px; line-height: 1.3; }
      .center { text-align: center; }
      .brand { display: grid; justify-items: center; gap: 2px; overflow-wrap: anywhere; }
      .logo { max-width: 30mm; max-height: 16mm; object-fit: contain; margin-bottom: 2px; }
      .company-name { font-size: 14px; line-height: 1.15; }
      .muted { color: #444; }
      .small { font-size: 9px; }
      .doc-title { margin-top: 5px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
      .divider { margin: 8px 0; border-top: 1px dashed #555; }
      .meta { display: grid; gap: 3px; }
      .meta-row, .line-total, .total-row { display: flex; justify-content: space-between; gap: 8px; }
      .meta-row span:first-child, .line-detail, .total-row { color: #333; }
      .meta-row strong, .line-total strong, .total-row strong { text-align: right; }
      .items { display: grid; gap: 8px; }
      .item { display: grid; gap: 2px; overflow-wrap: anywhere; }
      .item-name { font-weight: 700; }
      .line-detail { display: flex; justify-content: space-between; gap: 6px; font-size: 8px; }
      .totals { display: grid; gap: 4px; }
      .grand-total { margin-top: 3px; padding-top: 6px; border-top: 1px dashed #555; font-size: 12px; font-weight: 700; }
      .payment-state { display: grid; gap: 3px; }
      .payment-list { display: grid; gap: 2px; margin-top: 4px; }
      .footer { margin-top: 10px; text-align: center; white-space: pre-wrap; }
      .signature { margin-top: 12px; padding-top: 8px; border-top: 1px dashed #555; text-align: center; }
      .signature .seal { height: 12mm; margin: 4px 0; border-bottom: 1px dashed #999; color: #666; }
      .signature strong, .signature span { display: block; }
      @media print { html, body { width: 80mm; } body { padding: 3mm; } }
    </style>
  </head>
  <body>
    <main class="ticket">
      <header class="brand center">
        ${logo ? `<img class="logo" src="${escapeHtml(logo)}" alt="Logo ${escapeHtml(companyName)}" />` : ""}
        <strong class="company-name">${escapeHtml(companyName)}</strong>
        ${address ? `<span class="muted small">${escapeHtml(address)}</span>` : ""}
        ${contact ? `<span class="muted small">${escapeHtml(contact)}</span>` : ""}
        ${settings.businessSector ? `<span class="muted small">${escapeHtml(settings.businessSector)}</span>` : ""}
        <div class="doc-title">Facture</div>
        <strong>${escapeHtml(invoiceDisplayLabel(invoice))}</strong>
      </header>

      <div class="divider"></div>
      <section class="meta">
        <div class="meta-row"><span>Date d’édition</span><strong>${escapeHtml(formatISODate(invoice?.issueDate))}</strong></div>
        <div class="meta-row"><span>Client</span><strong>${escapeHtml(clientName)}</strong></div>
        ${client?.company && client.company !== clientName ? `<div class="meta-row"><span>Société</span><strong>${escapeHtml(client.company)}</strong></div>` : ""}
        ${client?.phone ? `<div class="meta-row"><span>Téléphone</span><strong>${escapeHtml(client.phone)}</strong></div>` : ""}
      </section>

      <div class="divider"></div>
      <section class="items" aria-label="Prestations">
        ${lines.map((line) => `<article class="item">
          <div class="item-name">${escapeHtml(line.description || "Prestation")}</div>
          <div class="line-detail"><span>${escapeHtml(line.quantity || 0)} × ${escapeHtml(formatMoney(line.unitPrice, currency))}</span><strong>${escapeHtml(formatMoney(invoiceLineTotal(line), currency))}</strong></div>
        </article>`).join("") || `<span class="muted">Aucune prestation</span>`}
      </section>

      <div class="divider"></div>
      <section class="totals">
        ${isVatActive ? `
        <div class="total-row"><span>Total HT</span><strong>${escapeHtml(formatMoney(totalHT, currency))}</strong></div>
        <div class="total-row grand-total"><span>Total TTC</span><strong>${escapeHtml(formatMoney(totalTTC, currency))}</strong></div>
        ` : `
        <div class="total-row grand-total"><span>TOTAL</span><strong>${escapeHtml(formatMoney(totalTTC, currency))}</strong></div>
        `}
      </section>

      <div class="divider"></div>
      <section class="payment-state">
        <div class="total-row"><span>Payé</span><strong>${escapeHtml(formatMoney(paid, currency))}</strong></div>
        <div class="total-row"><span>${balanceDue ? "Reste à payer" : "Statut"}</span><strong>${balanceDue ? escapeHtml(formatMoney(balanceDue, currency)) : "Réglée"}</strong></div>
        ${(invoice?.payments || []).length ? `<div class="payment-list small">${invoice.payments.map((payment) => `<div>${escapeHtml(formatISODate(payment.paidAt))} · ${escapeHtml(paymentMethodLabel(payment.method))} · ${escapeHtml(formatMoney(payment.amount, currency))}</div>`).join("")}</div>` : ""}
      </section>

      ${invoice?.notes ? `<div class="divider"></div><p class="small">${escapeHtml(invoice.notes)}</p>` : ""}
      <section class="signature"><div class="seal">Signature et sceau</div><strong>${escapeHtml(directorName)}</strong></section>
      <footer class="footer small">Merci de votre confiance${legalInfo ? `<br>${escapeHtml(legalInfo)}` : ""}${bankInfo ? `<br>${escapeHtml(bankInfo)}` : ""}
    </main>
  </body>
</html>`;
}
