import { escapeHtml, formatISODate, formatMoney, invoicePaymentStatusLabel } from "../formatters";
import { formatWorkspaceAddress, formatWorkspaceBankInfo, formatWorkspaceContact, formatWorkspaceLegalInfo } from "./invoicePrintShared";

function clientName(client = {}) {
  if (client.clientType === "company") {
    return client.company || "Entité";
  }
  return [client.firstName, client.lastName].filter(Boolean).join(" ").trim() || "Client";
}

export function buildClientPrintHtml({ client = {}, settings = {}, orders = [], invoices = [] } = {}) {
  const name = clientName(client);
  const contactName = [client.firstName, client.lastName].filter(Boolean).join(" ").trim();
  const companyName = settings.companyName || "Mon entreprise";
  const businessSector = String(settings.businessSector || "").trim();
  const filename = `Fiche client - ${name}`.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-");
  const address = [client.city].filter(Boolean).join(" · ");
  const legalLine = formatWorkspaceLegalInfo(settings);
  const bankLine = formatWorkspaceBankInfo(settings);
  const clientOrders = orders.filter((order) => order.clientId === client.id || order.client?.id === client.id);
  const clientInvoices = invoices.filter((invoice) => invoice.clientId === client.id || invoice.client?.id === client.id);
  const orderStatus = { pending: "En attente", processing: "En cours", ready: "Prête", invoiced: "Facturée" };

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(filename)}</title>
    <style>
      @page { size: A4; margin: 16mm; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #0f172a; background: #fff; font: 11px Inter, Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .preview-toolbar { display: flex; justify-content: space-between; max-width: 210mm; margin: 0 auto 12px; padding: 10px 0; background: #fff; }
      .preview-toolbar button { padding: 8px 12px; border: 0; border-radius: 5px; color: #fff; background: #1d4ed8; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
      .preview-toolbar .return-button { border: 1px solid #cbd5e1; color: #334155; background: #f1f5f9; }
      .page { width: 100%; max-width: 210mm; margin: 0 auto; }
      .sheet { min-height: 265mm; display: flex; flex-direction: column; padding: 20px; border: 1px solid #e2e8f0; border-radius: 18px; }
      .top { display: grid; justify-items: center; gap: 14px; margin-bottom: 24px; padding: 8px 0 20px; border-bottom: 2px solid #0f172a; text-align: center; }
      .brand { display: grid; justify-items: center; gap: 5px; width: 100%; }
      .brand-copy { display: grid; justify-items: center; gap: 4px; }
      .company-logo { display: block; max-width: 150px; max-height: 72px; object-fit: contain; margin-bottom: 4px; }
      .brand strong { margin-top: 5px; font-size: 20px; font-weight: 750; line-height: 1.2; }
      .brand span, .meta, .footer { color: #475569; font-size: 12px; line-height: 1.5; }
      .brand .highlight { color: #0f172a; font-weight: 600; }
      .brand .sector { color: #1d4ed8; }
      .title-block { text-align: center; }
      .title-block h1 { margin: 0; font-size: 18px; text-transform: uppercase; }
      .title-block p { margin: 5px 0 0; color: #64748b; }
      .identity { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 22px; }
      .card { padding: 14px; border: 1px solid #e2e8f0; border-radius: 14px; }
      .card h2 { margin: 0 0 10px; color: #64748b; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }
      .field { display: flex; justify-content: space-between; gap: 14px; padding: 7px 0; border-bottom: 1px solid #f1f5f9; }
      .field:last-child { border-bottom: 0; }
      .field span { color: #64748b; }
      .field strong { text-align: right; overflow-wrap: anywhere; }
      .status { display: inline-block; padding: 3px 8px; border-radius: 999px; color: #166534; background: #dcfce7; font-size: 10px; font-weight: 700; }
      .status.inactive { color: #991b1b; background: #fee2e2; }
      .notes { margin-top: 18px; padding: 14px; border: 1px dashed #cbd5e1; border-radius: 14px; background: #f8fafc; color: #334155; line-height: 1.6; }
      .relations { margin-top: 20px; }
      .relations h2 { margin: 0 0 8px; color: #64748b; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; }
      th, td { padding: 7px 6px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top; }
      th { color: #64748b; font-size: 9px; text-transform: uppercase; }
      td:last-child, th:last-child { text-align: right; white-space: nowrap; }
      .empty { padding: 9px 0; color: #64748b; font-style: italic; }
      .footer { margin-top: auto; padding-top: 14px; border-top: 1px solid #cbd5e1; text-align: center; font-size: 10px; }
      .footer span { display: block; }
      @media print { .preview-toolbar { display: none; } .sheet { border: 0; border-radius: 0; } }
    </style>
  </head>
  <body>
    <div class="preview-toolbar">
      <button class="return-button" type="button" onclick="if (window.opener) { window.close(); } else { window.history.back(); }">Retour</button>
      <button type="button" onclick="window.print()">Imprimer / Enregistrer en PDF</button>
    </div>
    <main class="page">
      <section class="sheet">
        <header class="top">
          <div class="brand">
            ${settings.logoDataUrl ? `<img class="company-logo" src="${escapeHtml(settings.logoDataUrl)}" alt="Logo ${escapeHtml(companyName)}" />` : ""}
            <div class="brand-copy">
              <strong>${escapeHtml(companyName)}</strong>
              ${formatWorkspaceAddress(settings) ? `<span class="highlight">${escapeHtml(formatWorkspaceAddress(settings))}</span>` : ""}
              ${formatWorkspaceContact(settings) ? `<span>${escapeHtml(formatWorkspaceContact(settings))}</span>` : ""}
              ${businessSector ? `<span class="sector">${escapeHtml(businessSector)}</span>` : ""}
            </div>
          </div>
          <div class="title-block">
            <h1>Fiche client</h1>
            <p>Éditée le ${escapeHtml(formatISODate(new Date().toISOString()))} · ${escapeHtml(client.clientType === "company" ? "Entité" : "Personne")}</p>
          </div>
        </header>

        <div class="identity">
          <section class="card">
            <h2>Identité</h2>
            <div class="field"><span>Nom</span><strong>${escapeHtml(name)}</strong></div>
            <div class="field"><span>Type</span><strong>${escapeHtml(client.clientType === "company" ? "Entité" : "Personne")}</strong></div>
            ${client.clientType === "company" && contactName ? `<div class="field"><span>Contact</span><strong>${escapeHtml(contactName)}</strong></div>` : ""}
            <div class="field"><span>Statut</span><strong><span class="status${client.status === "inactive" ? " inactive" : ""}">${client.status === "inactive" ? "Inactif" : "Actif"}</span></strong></div>
          </section>
          <section class="card">
            <h2>Coordonnées</h2>
            <div class="field"><span>E-mail</span><strong>${escapeHtml(client.email || "—")}</strong></div>
            <div class="field"><span>Téléphone</span><strong>${escapeHtml(client.phone || "—")}</strong></div>
            <div class="field"><span>Ville</span><strong>${escapeHtml(address || "—")}</strong></div>
          </section>
        </div>

        <section class="relations">
          <h2>Commandes du client</h2>
          ${clientOrders.length ? `<table><thead><tr><th>N° commande</th><th>Date</th><th>Statut</th><th>Total</th></tr></thead><tbody>${clientOrders.map((order) => `<tr><td>${escapeHtml(order.number || "—")}</td><td>${escapeHtml(formatISODate(order.issueDate))}</td><td>${escapeHtml(orderStatus[order.status] || order.status || "—")}</td><td>${escapeHtml(formatMoney(order.total, order.currency || "EUR"))}</td></tr>`).join("")}</tbody></table>` : `<div class="empty">Aucune commande enregistrée.</div>`}
        </section>

        <section class="relations">
          <h2>Factures du client</h2>
          ${clientInvoices.length ? `<table><thead><tr><th>N° facture</th><th>Date</th><th>Statut</th><th>Total</th></tr></thead><tbody>${clientInvoices.map((invoice) => `<tr><td>${escapeHtml(invoice.number || "—")}</td><td>${escapeHtml(formatISODate(invoice.issueDate))}</td><td>${escapeHtml(invoicePaymentStatusLabel(invoice))}</td><td>${escapeHtml(formatMoney(invoice.total, invoice.currency || "EUR"))}</td></tr>`).join("")}</tbody></table>` : `<div class="empty">Aucune facture enregistrée.</div>`}
        </section>

        <div class="notes">Cette fiche récapitule les informations enregistrées dans la base clients.</div>
        <footer class="footer"><span>${escapeHtml(companyName)}</span>${legalLine ? `<span>${escapeHtml(legalLine)}</span>` : ""}${bankLine ? `<span>${escapeHtml(bankLine)}</span>` : ""}</footer>
      </section>
    </main>
  </body>
</html>`;
}
