import { useEffect, useState } from "react";
import { cancelCashDeposit, createCashDeposit, getCashDeposits, validateCashDeposit } from "../../api";
import { useWorkspace } from "../WorkspaceProvider";
import { DataLoadingState, OverlayActionButton, OverlayDialog, OverlaySaveIcon, Table } from "../ui";
import { money } from "../../utils/formatters";

const destinationLabels = { banque: "Banque", caisse_externe: "Caisse externe", mobile_money: "Mobile Money", autre_compte: "Autre compte de trésorerie" };
const statusLabels = { draft: "Brouillon", validated: "Validé", cancelled: "Annulé" };

function emptyForm() { return { amountCdf: "", amountUsd: "", destination: "banque", reason: "", reference: "", notes: "" }; }

export function CashDepositsPage() {
  const { token, user, notifySuccess, notifyError } = useWorkspace();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function refresh() { setLoading(true); try { setRecords(await getCashDeposits(token)); } catch (error) { notifyError("Versements indisponibles", error.message); } finally { setLoading(false); } }
  useEffect(() => { refresh(); }, [token]);
  async function save(event) { event.preventDefault(); if (saving) return; setSaving(true); try { await createCashDeposit(token, form); setOpen(false); await refresh(); notifySuccess("Versement créé", "Il est enregistré comme brouillon."); } catch (error) { notifyError("Versement non enregistré", error.message); } finally { setSaving(false); } }
  async function action(record, type) { try { const updated = type === "validate" ? await validateCashDeposit(token, record.id) : await cancelCashDeposit(token, record.id); setRecords((current) => current.map((item) => item.id === record.id ? updated : item)); notifySuccess(type === "validate" ? "Versement validé" : "Versement annulé", updated.number); } catch (error) { notifyError("Action impossible", error.message); } }
  function setField(field, value) { setForm((current) => ({ ...current, [field]: value })); }

  return <div className="page-shell cash-page">
    <header className="hero list-page-header"><div><span className="eyebrow">Trésorerie</span><h1>Versements</h1><p>Transférez les soldes CDF et USD de la caisse vers une banque ou une caisse externe.</p></div><div className="hero-actions"><button className="primary-button list-action-button" type="button" onClick={() => { setForm(emptyForm()); setOpen(true); }}>Nouveau versement</button></div></header>
    <div className="page-scroll"><section className="list-view-content">{loading ? <DataLoadingState label="Chargement des versements…" /> : records.length ? <div className="panel entity-list-panel"><Table className="entity-list-table cash-table" columns={["Numéro", "Date", "Montants", "Destination", "Motif", "Statut", "Auteur", "Actions"]} rows={records.map((record) => [<strong>{record.number}</strong>, record.createdAt.slice(0, 10), <div className="table-primary-cell">{record.amountCdf > 0 && <strong>{money(record.amountCdf, "CDF")}</strong>}{record.amountUsd > 0 && <strong>{money(record.amountUsd, "USD")}</strong>}</div>, destinationLabels[record.destination] || record.destination, record.reason, <span className={`badge status-${record.status}`}>{statusLabels[record.status] || record.status}</span>, record.creator?.name || record.creator?.email || "—", <div className="table-row-actions">{record.status === "draft" && ["admin", "director"].includes(user?.role) && <><button className="text-button" type="button" onClick={() => action(record, "validate")}>Valider</button><button className="text-button danger" type="button" onClick={() => action(record, "cancel")}>Annuler</button></>}{record.status === "validated" && <small>Mouvements OUT enregistrés</small>}</div>])} /></div> : <div className="empty-card-state">Aucun versement enregistré.</div>}</section></div>
    <OverlayDialog open={open} title="Nouveau versement" onClose={() => setOpen(false)} topbarActions={<OverlayActionButton icon={<OverlaySaveIcon />} className="primary-button overlay-save-button" type="submit" form="cash-deposit-form" disabled={saving}>Créer le versement</OverlayActionButton>}>
      <form id="cash-deposit-form" className="stack-form invoice-form-grid" onSubmit={save}><div className="cash-deposit-form-intro">Saisissez le montant à transférer dans chaque devise. Laissez vide la devise qui ne doit pas être versée.</div><label className="invoice-form-field">Montant CDF<input type="number" min="0" step="0.01" value={form.amountCdf} onChange={(event) => setField("amountCdf", event.target.value)} /></label><label className="invoice-form-field">Montant USD<input type="number" min="0" step="0.01" value={form.amountUsd} onChange={(event) => setField("amountUsd", event.target.value)} /></label><label className="invoice-form-field">Destination<select value={form.destination} onChange={(event) => setField("destination", event.target.value)}>{Object.entries(destinationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="invoice-form-field">Référence <span className="field-hint">facultatif</span><input value={form.reference} onChange={(event) => setField("reference", event.target.value)} /></label><label className="invoice-form-field invoice-form-wide">Motif<input required value={form.reason} onChange={(event) => setField("reason", event.target.value)} /></label><label className="invoice-form-field invoice-form-wide">Notes<textarea rows="3" value={form.notes} onChange={(event) => setField("notes", event.target.value)} /></label></form>
    </OverlayDialog>
  </div>;
}
