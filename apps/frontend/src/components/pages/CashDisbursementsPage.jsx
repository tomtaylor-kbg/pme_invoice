import { useEffect, useMemo, useState } from "react";
import { createCashDisbursement, deleteCashDisbursement, getCashDisbursements, updateCashDisbursement } from "../../api";
import { useWorkspace } from "../WorkspaceProvider";
import { DataLoadingState, OverlayActionButton, OverlayDialog, OverlaySaveIcon, Table } from "../ui";
import { buildCashDisbursementsCsv, downloadTextFile, formatISODate, localDateStamp, money, todayISO } from "../../utils/formatters";
import { buildCashDisbursementPrintHtml } from "../../utils/print/cashDisbursementPrint";

const categories = [
  ["achats", "Achats et fournitures"],
  ["transport", "Transport"],
  ["salaires", "Salaires et avances"],
  ["loyer", "Loyer et charges"],
  ["entretien", "Entretien"],
  ["autre", "Autre"]
];

function emptyForm(currency = "EUR") {
  return { amount: "", currency, category: "achats", beneficiary: "", reason: "", paidAt: todayISO(), notes: "" };
}

export function CashDisbursementsPage() {
  const { token, workspaceSettings, notifySuccess, notifyError } = useWorkspace();
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(() => emptyForm(workspaceSettings.defaultCurrency));
  const [selected, setSelected] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      setRecords(await getCashDisbursements(token));
    } catch (error) {
      notifyError("Chargement impossible", error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [token]);

  const filteredRecords = useMemo(() => records.filter((record) => {
    if (categoryFilter !== "all" && record.category !== categoryFilter) return false;
    const query = search.trim().toLocaleLowerCase("fr");
    if (!query) return true;
    return [record.number, record.beneficiary, record.reason, record.notes].some((value) => String(value || "").toLocaleLowerCase("fr").includes(query));
  }), [records, search, categoryFilter]);

  const totals = filteredRecords.reduce((result, record) => {
    result[record.currency] = (result[record.currency] || 0) + Number(record.amount || 0);
    return result;
  }, {});

  function beginCreate() {
    setSelected(null);
    setForm(emptyForm(workspaceSettings.defaultCurrency || "EUR"));
    setEditorOpen(true);
  }

  function beginEdit(record) {
    setSelected(record);
    setEditorOpen(true);
    setForm({
      amount: String(record.amount),
      currency: record.currency,
      category: record.category,
      beneficiary: record.beneficiary,
      reason: record.reason,
      paidAt: record.paidAt.slice(0, 10),
      notes: record.notes || ""
    });
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    try {
      if (selected) {
        await updateCashDisbursement(token, selected.id, form);
      } else {
        await createCashDisbursement(token, form);
      }
      await refresh();
      setSelected(null);
      setEditorOpen(false);
      notifySuccess(selected ? "Bon mis à jour" : "Bon créé", form.beneficiary);
    } catch (error) {
      notifyError("Enregistrement impossible", error.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(record) {
    if (!window.confirm(`Supprimer le bon ${record.number} ?`)) return;
    try {
      await deleteCashDisbursement(token, record.id);
      await refresh();
      notifySuccess("Bon supprimé", record.number);
    } catch (error) {
      notifyError("Suppression impossible", error.message);
    }
  }

  function exportCsv() {
    downloadTextFile(`sorties-caisse-${localDateStamp()}.csv`, buildCashDisbursementsCsv(filteredRecords), "text/csv;charset=utf-8");
  }

  function print(record) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      notifyError("Impression impossible", "Autorisez les fenêtres contextuelles pour afficher le bon.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(buildCashDisbursementPrintHtml({ record, settings: workspaceSettings }));
    printWindow.document.close();
    printWindow.focus();
  }

  return (
    <div className="page-shell cash-page">
      <header className="hero list-page-header">
        <div><span className="eyebrow">Caisse</span><h1>Sorties de caisse</h1></div>
        <div className="hero-actions">
          <button className="primary-button list-action-button" type="button" onClick={beginCreate}>Nouveau bon de sortie</button>
          <button className="secondary-button" type="button" onClick={exportCsv}>Export CSV</button>
        </div>
      </header>
      <div className="page-scroll">
        <section className="list-view-content">
          <div className="cash-filters list-filters">
            <label className="filter-field search">Rechercher
              <input className="filter-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="N° de bon, bénéficiaire, motif..." />
            </label>
            <label className="filter-field">Catégorie
              <select className="filter-select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="all">Toutes les catégories</option>
                {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <div className="cash-total-line"><span>{filteredRecords.length} bon{filteredRecords.length === 1 ? "" : "s"}</span>{Object.entries(totals).map(([currency, total]) => <strong key={currency}>{money(total, currency)}</strong>)}</div>
          </div>
          {loading ? <DataLoadingState label="Chargement des bons de sortie…" /> : filteredRecords.length ? <div className="panel entity-list-panel"><Table className="entity-list-table cash-table" columns={["N° de bon", "Date", "Bénéficiaire", "Catégorie", "Motif", "Montant", "Saisi par", "Actions"]} rows={filteredRecords.map((record) => [
            <strong>{record.number}</strong>,
            formatISODate(record.paidAt.slice(0, 10)),
            record.beneficiary,
            categories.find(([value]) => value === record.category)?.[1] || record.category,
            <span className="cash-reason-cell">{record.reason}</span>,
            <strong>{money(record.amount, record.currency)}</strong>,
            record.recorder?.name || record.recorder?.email || "—",
            <div className="table-row-actions"><button type="button" className="text-button" onClick={() => print(record)}>Imprimer</button><button type="button" className="text-button" onClick={() => beginEdit(record)}>Modifier</button><button type="button" className="text-button danger" onClick={() => remove(record)}>Supprimer</button></div>
          ])} /></div> : <div className="empty-card-state">Aucun bon de sortie à afficher.</div>}
        </section>
      </div>

      <OverlayDialog
        open={editorOpen}
        title={selected ? `Modifier le bon ${selected.number}` : "Nouveau bon de sortie"}
        onClose={() => { setSelected(null); setEditorOpen(false); }}
        topbarActions={<OverlayActionButton icon={<OverlaySaveIcon />} className="primary-button overlay-save-button" type="submit" form="cash-disbursement-form" disabled={saving}>{selected ? "Enregistrer" : "Créer le bon"}</OverlayActionButton>}
      >
        <form id="cash-disbursement-form" className="stack-form cash-form-grid" onSubmit={save}>
          <label>Date de sortie<input type="date" required value={form.paidAt} onChange={(event) => setForm((current) => ({ ...current, paidAt: event.target.value }))} /></label>
          <label>Montant<input type="number" min="0.01" step="0.01" required value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} /></label>
          <label>Devise<select value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))}><option value="EUR">EUR</option><option value="USD">USD</option><option value="CDF">CDF</option></select></label>
          <label>Catégorie<select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="cash-form-wide">Bénéficiaire<input required maxLength={160} value={form.beneficiary} onChange={(event) => setForm((current) => ({ ...current, beneficiary: event.target.value }))} /></label>
          <label className="cash-form-wide">Motif de la sortie<input required maxLength={240} value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} /></label>
          <label className="cash-form-wide">Observations<textarea rows="3" maxLength={1000} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></label>
        </form>
      </OverlayDialog>
    </div>
  );
}
