import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "../WorkspaceProvider";
import { OverlayActionButton, OverlayDialog, OverlaySaveIcon, Table, TableAction } from "../ui";
import { formatDate } from "../../utils/formatters";
import { buildInvoicePrintHtml } from "../../utils/print/invoicePrintA4";

const blankLine = () => ({ description: "", orderedQuantity: "1", quantity: "1", unitPrice: "0" });
const currencies = ["EUR", "USD", "CDF"];
function clientName(client) { return client?.company || [client?.firstName, client?.lastName].filter(Boolean).join(" ") || "Client"; }
function emptyForm(clients, defaultCurrency = "EUR") { return { number: "", clientId: clients[0]?.id || "", currency: currencies.includes(defaultCurrency) ? defaultCurrency : "EUR", issueDate: new Date().toISOString().slice(0, 10), orderReference: "", notes: "", lines: [blankLine()] }; }

export function DeliveryNotesPage() {
  const { data, loading, saveDeliveryNote, removeDeliveryNote, invoiceDeliveryNote, refreshDeliveryNotes, workspaceSettings } = useWorkspace();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(() => emptyForm(data.clients));
  const [editingId, setEditingId] = useState(null);
  useEffect(() => { refreshDeliveryNotes().catch(() => {}); }, []);
  function openCreate() { setEditingId(null); setError(""); setForm(emptyForm(data.clients, workspaceSettings.defaultCurrency)); setOpen(true); }
  function openEdit(note) { setEditingId(note.id); setError(""); setForm({ number: note.number || "", clientId: note.clientId, currency: note.currency || workspaceSettings.defaultCurrency || "EUR", issueDate: note.issueDate.slice(0, 10), orderReference: note.orderReference || "", notes: note.notes || "", lines: note.lines.map((line) => ({ description: line.description, orderedQuantity: String(line.orderedQuantity ?? line.quantity), quantity: String(line.quantity), unitPrice: String(line.unitPrice || 0) })) }); setOpen(true); }
  function closeEditor() { setOpen(false); setError(""); }
  function setLine(index, key, value) { setForm((current) => ({ ...current, lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, [key]: value } : line) })); }
  async function save(event) { event.preventDefault(); setError(""); try { const lines = form.lines.filter((line) => line.description.trim()).map((line) => ({ ...line, orderedQuantity: Number(line.orderedQuantity), quantity: Number(line.quantity), unitPrice: Number(line.unitPrice) })); await saveDeliveryNote({ ...form, lines }, editingId); closeEditor(); } catch (saveError) { setError(saveError.message); } }
  function print(note) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(buildInvoicePrintHtml({
      invoice: { ...note, documentType: "delivery-note", currency: note.currency || workspaceSettings.defaultCurrency || "EUR", taxRate: 0 },
      client: note.client,
      creator: note.creator,
      settings: workspaceSettings
    }));
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => { if (!printWindow.closed) printWindow.print(); }, 250);
  }
  const totalItems = form.lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
  return <div className="page-shell invoices-page delivery-notes-page">
    <header className="hero list-page-header"><div><span className="eyebrow">Commercial</span><h1>Bons de livraison</h1><p>Suivez les articles livrés avant de les transformer en facture.</p></div><div className="hero-actions"><button className="primary-button list-action-button" type="button" onClick={openCreate}>Nouveau bon de livraison</button></div></header>
    <div className="page-scroll"><section className="list-view-content">{data.deliveryNotes.length ? <div className="panel entity-list-panel"><Table className="entity-list-table invoices-table" columns={["N° BL / Client", "Date", "Articles livrés", "Statut", "Actions"]} rows={data.deliveryNotes.map((note) => [<div className="table-primary-cell"><strong>{note.number}</strong><small>{clientName(note.client)}</small></div>, formatDate(note.issueDate), <strong>{note.totalItems}</strong>, <span className={`badge ${note.status}`}>{note.status === "invoiced" ? "Facturé" : "Brouillon"}</span>, <div className="table-row-actions"><TableAction icon="print" label="Imprimer" onClick={() => print(note)} />{!note.invoice && <TableAction icon="edit" label="Modifier" onClick={() => openEdit(note)} />}{!note.invoice && <TableAction icon="invoice" label="Créer la facture" onClick={() => invoiceDeliveryNote(note.id)} />}{!note.invoice && <TableAction icon="delete" label="Supprimer" danger onClick={() => removeDeliveryNote(note.id)} />}{note.invoice && <><div className="table-primary-cell table-linked-invoice"><small>Facture liée</small><strong>{note.invoice.number}</strong></div><TableAction icon="open" label="Ouvrir la facture" onClick={() => navigate("/invoices", { state: { invoiceAction: { id: note.invoice.id, mode: "open" } } })} /></>}</div>])} /></div> : <div className="empty-card-state">Aucun bon de livraison. Créez le BL de la commande à expédier.</div>}</section></div>
    <OverlayDialog open={open} title={editingId ? "Modifier le bon de livraison" : "Nouveau bon de livraison"} onClose={closeEditor} className="invoice-editor-modal delivery-note-editor" topbarActions={<OverlayActionButton icon={<OverlaySaveIcon />} className="primary-button overlay-save-button" type="submit" form="delivery-note-form" disabled={loading}>{loading ? "Enregistrement…" : "Enregistrer le BL"}</OverlayActionButton>}>
      <form id="delivery-note-form" className="stack-form invoice-form-grid" onSubmit={save}>{error && <div className="empty-card-state text-danger invoice-form-wide">{error}</div>}<label className="invoice-form-field">Numéro du BL<input required value={form.number} onChange={(event) => setForm({ ...form, number: event.target.value })} placeholder="BL-2026-0001" /></label><label className="invoice-form-field">Client<select required value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })}><option value="">Choisir un client</option>{data.clients.map((client) => <option key={client.id} value={client.id}>{clientName(client)}</option>)}</select></label><label className="invoice-form-field">Devise<select required value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })}>{currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></label><label className="invoice-form-field">Date de livraison<input required type="date" value={form.issueDate} onChange={(event) => setForm({ ...form, issueDate: event.target.value })} /></label><label className="invoice-form-field invoice-form-wide">Référence commande <span className="field-hint">facultatif</span><input value={form.orderReference} onChange={(event) => setForm({ ...form, orderReference: event.target.value })} placeholder="" /></label><div className="proforma-lines delivery-note-lines"><div className="section-header"><h3>Quantités livrées</h3><span className="overlay-hint">{totalItems} article{totalItems > 1 ? "s" : ""}</span></div>{form.lines.map((line, index) => <div className="proforma-line" key={index}><label>Désignation<input required value={line.description} onChange={(event) => setLine(index, "description", event.target.value)} placeholder="Ordinateur" /></label><label>Qté commandée<input required type="number" min="0" step="1" value={line.orderedQuantity} onChange={(event) => setLine(index, "orderedQuantity", event.target.value)} /></label><label>Qté livrée<input required type="number" min="1" step="1" value={line.quantity} onChange={(event) => setLine(index, "quantity", event.target.value)} /></label><label>Prix unitaire pour la facture <span className="field-hint">facultatif</span><input type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => setLine(index, "unitPrice", event.target.value)} /></label>{form.lines.length > 1 && <button className="text-button danger" type="button" onClick={() => setForm({ ...form, lines: form.lines.filter((_, lineIndex) => lineIndex !== index) })}>Retirer</button>}</div>)}<button className="text-button" type="button" onClick={() => setForm({ ...form, lines: [...form.lines, blankLine()] })}>+ Ajouter une ligne</button><strong className="delivery-note-total">Total livré : {totalItems} articles</strong></div><label className="invoice-form-field invoice-form-wide">Notes<textarea rows="3" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label></form>
    </OverlayDialog>
  </div>;
}
