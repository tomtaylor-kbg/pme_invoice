import { escapeHtml, formatISODate, formatMoney } from "../formatters";
import { formatWorkspaceAddress, formatWorkspaceContact, formatWorkspaceLegalInfo } from "./invoicePrintShared";

export function buildCashDisbursementPrintHtml({ record, settings = {} }) {
  const companyName = settings.companyName || "Mon entreprise";
  const address = formatWorkspaceAddress(settings);
  const contact = formatWorkspaceContact(settings);
  const legal = formatWorkspaceLegalInfo(settings);
  const category = {
    achats: "Achats et fournitures",
    transport: "Transport",
    salaires: "Salaires et avances",
    loyer: "Loyer et charges",
    entretien: "Entretien",
    autre: "Autre"
  }[record.category] || record.category;

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(record.number)}</title>
<style>
@page{size:A4;margin:18mm}*{box-sizing:border-box}body{margin:0;color:#17202d;font:14px Arial,sans-serif}.page{width:100%;max-width:174mm;margin:auto}.toolbar{display:flex;justify-content:space-between;margin:0 0 12px}.toolbar button{padding:9px 14px;border:0;border-radius:5px;background:#1d4ed8;color:#fff;font:inherit;cursor:pointer}.toolbar .return-button{border:1px solid #cbd5e1;background:#f1f5f9;color:#334155}.document{min-height:255mm;display:flex;flex-direction:column}.company{text-align:center;padding:8px 0 18px;border-bottom:2px solid #17202d}.logo{display:block;max-width:130px;max-height:65px;object-fit:contain;margin:0 auto 8px}.company h1{margin:0;font-size:23px}.company p{margin:4px 0;color:#4b5563;line-height:1.45}.title{text-align:center;margin:28px 0}.title h2{margin:0;font-size:22px;text-transform:uppercase}.number{margin-top:8px;color:#475569;font-weight:700}.amount{margin:20px 0;padding:18px;border:1px solid #cbd5e1;text-align:center}.amount span{display:block;color:#64748b;font-size:12px;text-transform:uppercase}.amount strong{display:block;margin-top:6px;font-size:27px}.details{display:grid;grid-template-columns:1fr 1fr;gap:14px}.detail{padding:12px 0;border-bottom:1px solid #dbe1e8}.detail span{display:block;margin-bottom:4px;color:#64748b;font-size:11px;text-transform:uppercase}.detail strong{overflow-wrap:anywhere}.reason{margin-top:24px;padding:15px;border:1px solid #dbe1e8}.reason span{display:block;margin-bottom:6px;color:#64748b;font-size:11px;text-transform:uppercase}.notes{margin-top:12px;color:#475569;white-space:pre-wrap}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-top:auto;padding-top:54px}.signature{text-align:center}.signature span{display:block;padding-top:8px;border-top:1px solid #64748b}.footer{margin-top:22px;padding-top:10px;border-top:1px solid #cbd5e1;text-align:center;color:#475569;font-size:10px;line-height:1.5}.footer p{margin:2px 0}@media print{.toolbar{display:none}}
</style></head><body><div class="toolbar"><button class="return-button" type="button" onclick="if (window.opener) { window.close(); } else { window.history.back(); }">Retour</button><button type="button" onclick="window.print()">Imprimer / Enregistrer en PDF</button></div><main class="page document">
<header class="company">${settings.logoDataUrl ? `<img class="logo" src="${escapeHtml(settings.logoDataUrl)}" alt="">` : ""}<h1>${escapeHtml(companyName)}</h1>${address ? `<p>${escapeHtml(address)}</p>` : ""}${contact ? `<p>${escapeHtml(contact)}</p>` : ""}</header>
<div class="title"><h2>Bon de sortie de caisse</h2><div class="number">${escapeHtml(record.number)}</div></div>
<section class="details"><div class="detail"><span>Date de sortie</span><strong>${escapeHtml(formatISODate(record.paidAt))}</strong></div><div class="detail"><span>Catégorie</span><strong>${escapeHtml(category)}</strong></div><div class="detail"><span>Bénéficiaire</span><strong>${escapeHtml(record.beneficiary)}</strong></div><div class="detail"><span>Établi par</span><strong>${escapeHtml(record.recorder?.name || record.recorder?.email || "")}</strong></div></section>
<div class="amount"><span>Montant décaissé</span><strong>${escapeHtml(formatMoney(record.amount, record.currency))}</strong></div>
<div class="reason"><span>Motif de la sortie</span><strong>${escapeHtml(record.reason)}</strong></div>${record.notes ? `<p class="notes">${escapeHtml(record.notes)}</p>` : ""}
<section class="signatures"><div class="signature"><span>Signature du bénéficiaire</span></div><div class="signature"><span>Signature du responsable</span></div></section>
<footer class="footer">${legal ? `<p>${escapeHtml(legal)}</p>` : ""}${settings.website ? `<p>${escapeHtml(settings.website)}</p>` : ""}</footer></main></body></html>`;
}
