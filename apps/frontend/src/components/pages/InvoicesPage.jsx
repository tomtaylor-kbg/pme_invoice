import { useState } from "react";
import { useWorkspace } from "../WorkspaceProvider";
import { InvoiceCard, OverlayDialog, SectionHeader } from "../ui";
import {
  createInvoiceLineDraft,
  buildInvoicePrintHtml,
  buildInvoicePdfFilename,
  buildInvoicesCsv,
  invoiceLinesTotal,
  invoicePrefixForType,
  invoiceTemplateAudience,
  invoiceTemplateLabel,
  downloadTextFile,
  money,
  suggestInvoiceNumber,
  toMoneyValue
} from "../../utils/formatters";

export function InvoicesPage() {
  const { data, forms, setForms, editor, beginCreateInvoiceWithPreset, beginEditInvoice, saveInvoice, removeInvoice, loading, closeEditor, user } = useWorkspace();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");

  const isEditing = editor.kind === "invoice" && Boolean(editor.id);
  const invoiceLines = forms.invoice.lines?.length ? forms.invoice.lines : [createInvoiceLineDraft()];
  const invoiceTotalHT = invoiceLinesTotal(invoiceLines);
  const taxRateVal = Number(forms.invoice.taxRate || 20);
  const taxAmountVal = invoiceTotalHT * (taxRateVal / 100);
  const invoiceTotalTTC = invoiceTotalHT + taxAmountVal;

  const selectedClient = data.clients.find((client) => client.id === forms.invoice.clientId) || null;
  const selectedCreator = data.users.find((item) => item.id === forms.invoice.userId) || user || null;
  const isReceiptTemplate = forms.invoice.templateType === "receipt";

  const filteredInvoices = data.invoices.filter((invoice) => {
    if (statusFilter !== "all" && invoice.status !== statusFilter) {
      return false;
    }
    if (clientFilter !== "all" && invoice.clientId !== clientFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const numMatch = String(invoice.number || "").toLowerCase().includes(query);
      const notesMatch = String(invoice.notes || "").toLowerCase().includes(query);
      const clientName = [invoice.client?.firstName, invoice.client?.lastName].filter(Boolean).join(" ").toLowerCase();
      const clientCompany = String(invoice.client?.company || "").toLowerCase();
      const clientMatch = clientName.includes(query) || clientCompany.includes(query);
      return numMatch || notesMatch || clientMatch;
    }
    return true;
  });

  function exportInvoicesCsv() {
    const filename = `factures-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadTextFile(filename, buildInvoicesCsv(filteredInvoices), "text/csv;charset=utf-8");
  }

  function updateInvoiceLine(index, field, value) {
    setForms((current) => ({
      ...current,
      invoice: {
        ...current.invoice,
        lines: (current.invoice.lines?.length ? current.invoice.lines : [createInvoiceLineDraft()]).map((line, lineIndex) =>
          lineIndex === index ? { ...line, [field]: value } : line
        )
      }
    }));
  }

  function addInvoiceLine() {
    setForms((current) => ({
      ...current,
      invoice: {
        ...current.invoice,
        lines: [...(current.invoice.lines?.length ? current.invoice.lines : [createInvoiceLineDraft()]), createInvoiceLineDraft()]
      }
    }));
  }

  function removeInvoiceLine(index) {
    setForms((current) => {
      const lines = current.invoice.lines?.length ? current.invoice.lines : [createInvoiceLineDraft()];
      const nextLines = lines.filter((_, lineIndex) => lineIndex !== index);
      return {
        ...current,
        invoice: {
          ...current.invoice,
          lines: nextLines.length > 0 ? nextLines : [createInvoiceLineDraft()]
        }
      };
    });
  }

  function openInvoicePdf() {
    const filename = buildInvoicePdfFilename({
      invoice: {
        ...forms.invoice,
        lines: invoiceLines
      },
      client: selectedClient
    });
    const printHtml = buildInvoicePrintHtml({
      invoice: {
        ...forms.invoice,
        lines: invoiceLines
      },
      client: selectedClient,
      creator: selectedCreator
    });

    const existingFrame = document.getElementById("invoice-print-frame");
    if (existingFrame) {
      existingFrame.remove();
    }

    const frame = document.createElement("iframe");
    frame.id = "invoice-print-frame";
    frame.title = filename.replace(/\.pdf$/i, "");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    frame.style.opacity = "0";
    frame.style.pointerEvents = "none";
    frame.setAttribute("aria-hidden", "true");

    let printed = false;
    let printTimer = null;

    const cleanup = () => {
      if (printTimer) {
        window.clearTimeout(printTimer);
        printTimer = null;
      }
      window.setTimeout(() => frame.remove(), 500);
    };

    const tryPrint = () => {
      if (printed) {
        return;
      }

      const frameWindow = frame.contentWindow;
      const frameDocument = frame.contentDocument;
      const frameBody = frameDocument?.body;
      if (!frameWindow || !frameBody || !frameBody.innerHTML.trim()) {
        return;
      }

      printed = true;
      frameWindow.onafterprint = () => {
        cleanup();
      };

      frameWindow.focus();
      frameWindow.print();
    };

    frame.onload = () => {
      const frameWindow = frame.contentWindow;
      if (!frameWindow) {
        cleanup();
        return;
      }

      printTimer = window.setTimeout(tryPrint, 150);
    };

    document.body.appendChild(frame);
    frame.srcdoc = printHtml;
  }

  return (
    <div className="page-shell invoices-page">
      <header className="hero">
        <div>
          <span className="eyebrow">Facturation</span>
          <h1>Factures</h1>
          <p>Création, édition et suivi des documents de facturation sous forme de cartes.</p>
        </div>
        <div className="hero-actions">
          <button className="secondary-button" type="button" onClick={() => beginCreateInvoiceWithPreset({ templateType: "professional" })}>
            Facture pro
          </button>
          <button className="secondary-button" type="button" onClick={() => beginCreateInvoiceWithPreset({ templateType: "receipt" })}>
            Reçu direct
          </button>
          <button className="secondary-button" type="button" onClick={exportInvoicesCsv}>
            Export CSV
          </button>
        </div>
      </header>

      <div className="page-scroll">
        <section className="content-grid invoices-layout">
          <div className="panel">
            <SectionHeader title="Cartes factures" action="Une carte par document pour accélérer le scan visuel." />
            <div className="filter-bar" style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "24px", background: "#f8fafc", padding: "16px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
              <label style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: "600", color: "#475569" }}>
                Rechercher
                <input
                  type="text"
                  placeholder="N° facture, client, notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: "normal" }}
                />
              </label>
              <label style={{ flex: "0 1 200px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: "600", color: "#475569" }}>
                Statut
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: "normal", background: "#fff" }}
                >
                  <option value="all">Tous les statuts</option>
                  <option value="draft">Brouillon</option>
                  <option value="sent">Envoyée</option>
                  <option value="paid">Payée</option>
                  <option value="overdue">En retard</option>
                </select>
              </label>
              <label style={{ flex: "0 1 220px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: "600", color: "#475569" }}>
                Client
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: "normal", background: "#fff" }}
                >
                  <option value="all">Tous les clients</option>
                  {data.clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}{c.company ? ` · ${c.company}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="card-grid invoices-grid">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((invoice) => (
                  <InvoiceCard
                    key={invoice.id}
                    invoice={invoice}
                    loading={loading}
                    onEdit={() => beginEditInvoice(invoice)}
                    onDelete={() => removeInvoice(invoice.id)}
                  />
                ))
              ) : (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px 20px", color: "#64748b", background: "#f8fafc", borderRadius: "14px", border: "1px dashed #cbd5e1" }}>
                  Aucune facture ne correspond à vos critères.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <OverlayDialog
        open={editor.kind === "invoice"}
        title={isEditing ? "Modifier facture" : "Créer facture"}
        description="Choisis le modèle de document, puis ajoute les lignes de facture avec calcul automatique du PT."
        onClose={closeEditor}
        footer={
          <>
            <button className="secondary-button" type="button" onClick={openInvoicePdf} disabled={!forms.invoice.clientId}>
              {isReceiptTemplate ? "Aperçu thermique" : "Aperçu PDF"}
            </button>
            <button className="primary-button" type="submit" form="invoice-form" disabled={loading || !forms.invoice.clientId}>
              {isEditing ? "Enregistrer" : "Créer facture"}
            </button>
          </>
        }
        >
        <form className="stack-form" id="invoice-form" onSubmit={(event) => { event.preventDefault(); saveInvoice(); }}>
          <label>
            Modèle
            <select
              value={forms.invoice.templateType}
              onChange={(event) => {
                const templateType = event.target.value;
                const prefix = invoicePrefixForType(templateType);
                setForms((current) => ({
                  ...current,
                  invoice: {
                    ...current.invoice,
                    templateType,
                    number:
                      !current.invoice.number || /^(FAC|REC)-\d{4}-\d{4}$/.test(current.invoice.number)
                        ? suggestInvoiceNumber(data.invoices, prefix, current.invoice.issueDate)
                        : current.invoice.number
                  }
                }));
              }}
            >
              <option value="professional">Modèle professionnel - utilisateurs</option>
              <option value="receipt">Modèle receipt - service direct</option>
            </select>
          </label>
          <label>
            Numéro
            <input
              value={forms.invoice.number}
              onChange={(event) => setForms((current) => ({
                ...current,
                invoice: { ...current.invoice, number: event.target.value }
              }))}
            />
          </label>
          <label>
            Client
            <select
              value={forms.invoice.clientId}
              onChange={(event) => setForms((current) => ({
                ...current,
                invoice: { ...current.invoice, clientId: event.target.value }
              }))}
            >
              <option value="">Sélectionner</option>
              {data.clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.firstName} {client.lastName}{client.company ? ` · ${client.company}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Statut
            <select
              value={forms.invoice.status}
              onChange={(event) => setForms((current) => ({
                ...current,
                invoice: { ...current.invoice, status: event.target.value }
              }))}
            >
              <option value="draft">Brouillon</option>
              <option value="sent">Envoyée</option>
              <option value="paid">Payée</option>
              <option value="overdue">En retard</option>
            </select>
          </label>
          <label>
            Devise
            <select
              value={forms.invoice.currency}
              onChange={(event) => setForms((current) => ({
                ...current,
                invoice: { ...current.invoice, currency: event.target.value }
              }))}
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="CDF">CDF</option>
            </select>
          </label>
          <label>
            Taux de TVA (%)
            <input
              type="number"
              min="0"
              step="0.1"
              value={forms.invoice.taxRate}
              onChange={(event) => setForms((current) => ({
                ...current,
                invoice: { ...current.invoice, taxRate: event.target.value }
              }))}
            />
          </label>
          <label>
            Date d'émission
            <input
              type="date"
              value={forms.invoice.issueDate}
              onChange={(event) => setForms((current) => ({
                ...current,
                invoice: { ...current.invoice, issueDate: event.target.value }
              }))}
            />
          </label>
          <label>
            Échéance
            <input
              type="date"
              value={forms.invoice.dueDate}
              onChange={(event) => setForms((current) => ({
                ...current,
                invoice: { ...current.invoice, dueDate: event.target.value }
              }))}
            />
          </label>
          <div className="invoice-lines-editor">
            <div className="invoice-lines-head">
              <div>
                <strong>Lignes de facture</strong>
                <p>Le PT est calculé automatiquement par ligne, puis le total est dérivé de toutes les lignes.</p>
              </div>
              <button className="ghost-button" type="button" onClick={addInvoiceLine}>
                Ajouter une ligne
              </button>
            </div>

            <div className="invoice-lines-table">
              <div className="invoice-lines-row invoice-lines-row-head">
                <span>N°</span>
                <span>Désignation</span>
                <span>Qte</span>
                <span>PU</span>
                <span>PT</span>
                <span>Action</span>
              </div>
              {invoiceLines.map((line, index) => {
                const lineTotal = toMoneyValue(line.quantity) * toMoneyValue(line.unitPrice);

                return (
                  <div className="invoice-lines-row" key={index}>
                    <span className="invoice-line-index">{index + 1}</span>
                    <label className="invoice-line-field">
                      <span className="sr-only">Désignation ligne {index + 1}</span>
                      <input
                        value={line.description}
                        onChange={(event) => updateInvoiceLine(index, "description", event.target.value)}
                        placeholder="Ex. Prestation de conseil"
                      />
                    </label>
                    <label className="invoice-line-field compact">
                      <span className="sr-only">Quantité ligne {index + 1}</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={line.quantity}
                        onChange={(event) => updateInvoiceLine(index, "quantity", event.target.value)}
                      />
                    </label>
                    <label className="invoice-line-field compact">
                      <span className="sr-only">Prix unitaire ligne {index + 1}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitPrice}
                        onChange={(event) => updateInvoiceLine(index, "unitPrice", event.target.value)}
                        placeholder="0.00"
                      />
                    </label>
                    <strong className="invoice-line-total">{money(lineTotal)}</strong>
                    <button className="ghost-button invoice-line-remove" type="button" onClick={() => removeInvoiceLine(index)}>
                      Supprimer
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="invoice-lines-summary" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px 24px", width: "100%", maxWidth: "320px", marginLeft: "auto", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
              <span>Total HT</span>
              <strong style={{ textAlign: "right" }}>{money(invoiceTotalHT)}</strong>
              <span>TVA ({taxRateVal}%)</span>
              <strong style={{ textAlign: "right" }}>{money(taxAmountVal)}</strong>
              <span style={{ fontSize: "1.1em", fontWeight: "bold" }}>Total TTC</span>
              <strong style={{ fontSize: "1.1em", fontWeight: "bold", textAlign: "right" }}>{money(invoiceTotalTTC)}</strong>
            </div>
          </div>
          <label>
            Notes
            <textarea
              rows="3"
              value={forms.invoice.notes}
              onChange={(event) => setForms((current) => ({
                ...current,
                invoice: { ...current.invoice, notes: event.target.value }
              }))}
            />
          </label>
          <div className="overlay-hint">
            <strong>{invoiceTemplateLabel(forms.invoice.templateType)}</strong>
            <span>{invoiceTemplateAudience(forms.invoice.templateType)}</span>
            <span>Créée par la session connectée.</span>
          </div>
        </form>
      </OverlayDialog>
    </div>
  );
}
