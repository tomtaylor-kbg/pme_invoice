import { useEffect, useMemo, useState } from "react";
import { convertProforma as convertProformaRequest, createProforma, deleteProforma, getProformas, updateProforma } from "../../api";
import { useWorkspace } from "../WorkspaceProvider";
import { useNavigate } from "react-router-dom";
import { OverlayActionButton, OverlayDialog, OverlayPreviewIcon, OverlaySaveIcon, Table, TableAction } from "../ui";
import { buildInvoicePrintHtml } from "../../utils/print/invoicePrintA4";
import { buildProformasCsv, createInvoiceLineDraft, downloadTextFile, formatDate, localDateStamp, money } from "../../utils/formatters";

function today() { return new Date().toISOString().slice(0, 10); }
function newForm(settings) {
  const issueDate = today();
  return { clientId: "", clientMode: "crm", manualClientName: "", manualClientCompany: "", manualClientEmail: "", currency: settings.defaultCurrency || "CDF", issueDate, validUntil: issueDate, taxRate: settings.vatRate || "20", notes: "", status: "draft", lines: [createInvoiceLineDraft()] };
}

export function ProformasPage() {
  const { token, data, user, workspaceSettings, notifySuccess, notifyError, refresh: refreshWorkspace } = useWorkspace();
  const canDeleteRecords = ["admin", "director"].includes(user?.role);
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(() => newForm(workspaceSettings));
  const [selected, setSelected] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const clients = data.clients || [];
  const hasClient = form.clientMode === "manual" ? Boolean(form.manualClientName.trim()) : Boolean(form.clientId);
  const totalHT = useMemo(() => form.lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0), [form.lines]);
  const total = totalHT * (1 + Number(form.taxRate || 0) / 100);

  async function refresh() {
    try { setRecords(await getProformas(token)); }
    catch (requestError) { setError(requestError.message || "Chargement des proforma impossible."); }
  }

  useEffect(() => { refresh(); }, [token]);

  function openCreate() {
    setSelected(null);
    setEditorOpen(true);
    setForm({ ...newForm(workspaceSettings), clientId: clients[0]?.id || "" });
    setError("");
  }

  function openEdit(record) {
    setSelected(record);
    setEditorOpen(true);
    setForm({
      clientId: record.clientId,
      clientMode: "crm",
      manualClientName: "",
      manualClientCompany: "",
      manualClientEmail: "",
      currency: record.currency,
      issueDate: record.issueDate.slice(0, 10),
      validUntil: record.validUntil.slice(0, 10),
      taxRate: String(record.taxRate),
      notes: record.notes || "",
      status: record.status || "draft",
      lines: record.lines.map(({ description, quantity, unitPrice }) => ({ description, quantity: String(quantity), unitPrice: String(unitPrice) }))
    });
  }

  function setLine(index, key, value) {
    setForm((current) => ({ ...current, lines: current.lines.map((line, i) => i === index ? { ...line, [key]: value } : line) }));
  }

  function preview(record = null) {
    const source = record || { ...form, number: selected?.number || "PROFORMA", documentType: "proforma", total, lines: form.lines };
    const client = record?.client || (form.clientMode === "manual" ? {
      firstName: form.manualClientName.trim().split(/\s+/)[0] || "Client",
      lastName: form.manualClientName.trim().split(/\s+/).slice(1).join(" "),
      company: form.manualClientCompany,
      email: form.manualClientEmail
    } : clients.find((item) => item.id === form.clientId));
    const html = buildInvoicePrintHtml({ invoice: { ...source, documentType: "proforma" }, client, creator: record?.creator || user, settings: workspaceSettings });
    const target = window.open("", "_blank");
    if (!target) { notifyError("Aperçu impossible", "Autorisez les fenêtres contextuelles pour afficher le document."); return; }
    target.document.open(); target.document.write(html); target.document.close(); target.focus();
  }

  async function save(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = { ...form, ...(form.clientMode === "manual" ? { clientId: "" } : {}), taxRate: Number(form.taxRate), lines: form.lines.map((line) => ({ ...line, quantity: Number(line.quantity), unitPrice: Number(line.unitPrice) })) };
      const saved = selected ? await updateProforma(token, selected.id, payload) : await createProforma(token, payload);
      await refresh();
      notifySuccess(selected ? "Proforma modifiée" : "Proforma créée", saved.number);
      setSelected(null);
      setEditorOpen(false);
    } catch (requestError) { setError(requestError.message || "Enregistrement impossible."); }
    finally { setLoading(false); }
  }

  async function remove(record) {
    if (!window.confirm(`Supprimer la proforma ${record.number} ?`)) return;
    try { await deleteProforma(token, record.id); await refresh(); notifySuccess("Proforma supprimée", record.number); }
    catch (requestError) { notifyError("Suppression impossible", requestError.message); }
  }

  async function convert(record) {
    try {
      const invoice = await convertProformaRequest(token, record.id);
      await Promise.all([refresh(), refreshWorkspace()]);
      notifySuccess("Facture définitive créée", invoice.number);
      navigate("/invoices");
    } catch (requestError) { notifyError("Conversion impossible", requestError.message); }
  }

  function exportCsv() {
    downloadTextFile(`proformas-${localDateStamp()}.csv`, buildProformasCsv(records), "text/csv;charset=utf-8");
  }

  return <div className="page-shell invoices-page proformas-page">
      <header className="hero list-page-header"><div><span className="eyebrow">Commercial</span><h1>Factures proforma</h1><p>Préparez une offre chiffrée avant d’émettre la facture définitive.</p></div><div className="hero-actions"><button className="primary-button list-action-button" type="button" onClick={openCreate}>Nouvelle proforma</button><button className="secondary-button" type="button" onClick={exportCsv}>Export CSV</button></div></header>
    <div className="page-scroll"><section className="list-view-content">
      {error && !selected && <div className="empty-card-state text-danger">{error}</div>}
      {records.length ? <div className="panel entity-list-panel"><Table className="entity-list-table invoices-table" columns={["N° proforma", "Client", "Date", "Valide jusqu’au", "Statut", "Montant", "Actions"]} rows={records.map((record) => [
        <strong>{record.number}</strong>, record.client?.company || [record.client?.firstName, record.client?.lastName].filter(Boolean).join(" "), formatDate(record.issueDate), formatDate(record.validUntil), <span className={`badge ${record.status}`}>{({ draft: "Brouillon", sent: "Envoyée", accepted: "Acceptée", rejected: "Refusée", converted: "Convertie" })[record.status] || record.status}</span>, <strong>{money(record.total, record.currency)}</strong>,
        <div className="table-row-actions"><TableAction icon="print" label="Imprimer" onClick={() => preview(record)} />{record.status === "accepted" && <TableAction icon="invoice" label="Convertir en facture" onClick={() => convert(record)} />}{record.status !== "converted" && <TableAction icon="edit" label="Modifier" onClick={() => openEdit(record)} />}{canDeleteRecords && record.status !== "converted" && <TableAction icon="delete" label="Supprimer" danger onClick={() => remove(record)} />}</div>
      ])} /></div> : <div className="empty-card-state">Aucune proforma. Créez-en une pour préparer une proposition au client.</div>}
    </section></div>

    <OverlayDialog open={editorOpen} title={selected ? `Modifier ${selected.number}` : "Créer une proforma"} onClose={() => { setEditorOpen(false); setSelected(null); setError(""); }} className="invoice-editor-modal" topbarActions={<>
      <OverlayActionButton icon={<OverlayPreviewIcon />} className="overlay-preview-button" type="button" onClick={() => preview()} disabled={!hasClient}>Aperçu PDF</OverlayActionButton>
      <OverlayActionButton icon={<OverlaySaveIcon />} className="primary-button overlay-save-button" type="submit" form="proforma-form" disabled={loading || !hasClient}>{loading ? "Enregistrement…" : selected ? "Enregistrer" : "Créer la proforma"}</OverlayActionButton>
    </>}>
      <form id="proforma-form" className="stack-form invoice-form-grid" onSubmit={save}>
        {error && <div className="empty-card-state text-danger">{error}</div>}
        <label className="invoice-form-field">Type de client<select value={form.clientMode} onChange={(event) => setForm({ ...form, clientMode: event.target.value })}><option value="crm">Client enregistré</option><option value="manual">Client ponctuel</option></select></label>
        {form.clientMode === "manual" ? <>
          <label className="invoice-form-field">Nom du client<input required maxLength="160" value={form.manualClientName} onChange={(event) => setForm({ ...form, manualClientName: event.target.value })} /></label>
          <label className="invoice-form-field">Entreprise (facultatif)<input maxLength="160" value={form.manualClientCompany} onChange={(event) => setForm({ ...form, manualClientCompany: event.target.value })} /></label>
          <label className="invoice-form-field">E-mail (facultatif)<input type="email" maxLength="200" value={form.manualClientEmail} onChange={(event) => setForm({ ...form, manualClientEmail: event.target.value })} /></label>
        </> : <label className="invoice-form-field">Client<select required value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })}><option value="">Choisir un client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.company || [client.firstName, client.lastName].filter(Boolean).join(" ")}</option>)}</select></label>}
        {selected && <label className="invoice-form-field">Statut<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="draft">Brouillon</option><option value="sent">Envoyée</option><option value="accepted">Acceptée</option><option value="rejected">Refusée</option></select></label>}
        <label className="invoice-form-field">Date<input type="date" required value={form.issueDate} onChange={(event) => setForm({ ...form, issueDate: event.target.value })} /></label>
        <label className="invoice-form-field">Valide jusqu’au<input type="date" required value={form.validUntil} onChange={(event) => setForm({ ...form, validUntil: event.target.value })} /></label>
        <label className="invoice-form-field">Devise<select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })}><option value="CDF">CDF</option><option value="USD">USD</option><option value="EUR">EUR</option></select></label>
        <label className="invoice-form-field">TVA (%)<input type="number" min="0" step="0.01" value={form.taxRate} onChange={(event) => setForm({ ...form, taxRate: event.target.value })} /></label>
        <div className="proforma-lines"><h3>Articles / prestations</h3>{form.lines.map((line, index) => <div className="proforma-line" key={index}>
          <label>Description<input required value={line.description} onChange={(event) => setLine(index, "description", event.target.value)} /></label>
          <label>Quantité<input required type="number" min="1" step="1" value={line.quantity} onChange={(event) => setLine(index, "quantity", event.target.value)} /></label>
          <label>Prix unitaire<input required type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => setLine(index, "unitPrice", event.target.value)} /></label>
          <button className="text-button danger" type="button" onClick={() => setForm((current) => ({ ...current, lines: current.lines.length > 1 ? current.lines.filter((_, i) => i !== index) : current.lines }))}>Retirer</button>
        </div>)}<button className="text-button" type="button" onClick={() => setForm((current) => ({ ...current, lines: [...current.lines, createInvoiceLineDraft()] }))}>+ Ajouter une ligne</button><strong className="proforma-total">Total estimé : {money(total, form.currency)}</strong></div>
        <label className="invoice-form-field invoice-form-wide">Notes<textarea rows="3" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
      </form>
    </OverlayDialog>
  </div>;
}
