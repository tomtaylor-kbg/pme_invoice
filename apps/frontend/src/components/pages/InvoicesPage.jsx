import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useWorkspace } from "../WorkspaceProvider";
import {
  DataLoadingState,
  OverlayActionButton,
  OverlayDialog,
  OverlayPreviewIcon,
  OverlaySaveIcon,
  Table,
  TableAction
} from "../ui";
import {
  createInvoiceLineDraft,
  buildInvoicesCsv,
  invoiceLinesTotal,
  invoicePaymentTotal,
  invoiceDisplayLabel,
  invoicePaymentStatusLabel,
  paymentMethodLabel,
  downloadTextFile,
  localDateStamp,
  formatDate,
  money,
  suggestInvoiceNumber,
  toMoneyValue,
  statusToLabel
} from "../../utils/formatters";
import { buildInvoicePrintHtml } from "../../utils/print/invoicePrintA4";
import { buildThermalInvoiceHtml } from "../../utils/print/invoicePrintThermal";

export function InvoicesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    data,
    forms,
    setForms,
    editor,
    beginCreateInvoiceWithPreset,
    beginEditInvoice,
    beginManagePayments,
    beginEditPayment,
    saveInvoice,
    savePayment,
    removeInvoice,
    removePayment,
    loading,
    isHydrating,
    closeEditor,
    user,
    workspaceSettings,
    notifyError
  } = useWorkspace();
  const canDeleteRecords = user?.role === "admin" || user?.role === "finance";

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [clientFilter, setClientFilter] = useState("all");

  const isEditing = editor.kind === "invoice" && Boolean(editor.id);
  const invoiceLines = forms.invoice.lines?.length ? forms.invoice.lines : [createInvoiceLineDraft()];
  const invoiceTotalHT = invoiceLinesTotal(invoiceLines);
  const taxRateVal = Number(forms.invoice.taxRate ?? 0);
  const isVatActive = taxRateVal > 0;
  const taxAmountVal = invoiceTotalHT * (taxRateVal / 100);
  const invoiceTotalTTC = invoiceTotalHT + taxAmountVal;
  const selectedCurrency = forms.invoice.currency || "EUR";

  const selectedClient = data.clients.find((client) => client.id === forms.invoice.clientId) || (forms.invoice.clientMode === "manual" && forms.invoice.manualClientName.trim() ? {
    firstName: forms.invoice.manualClientName.trim().split(/\s+/)[0],
    lastName: forms.invoice.manualClientName.trim().split(/\s+/).slice(1).join(" "),
    company: forms.invoice.manualClientCompany || "",
    email: forms.invoice.manualClientEmail || ""
  } : null);
  const hasInvoiceClient = forms.invoice.clientMode === "manual" ? Boolean(forms.invoice.manualClientName.trim()) : Boolean(forms.invoice.clientId);
  const selectedCreator = data.users.find((item) => item.id === forms.invoice.userId) || user || null;
  const canAddInvoiceLine = (() => {
    const lastLine = invoiceLines[invoiceLines.length - 1] || createInvoiceLineDraft();
    const description = String(lastLine.description || "").trim();
    const quantity = String(lastLine.quantity ?? "").trim();
    const unitPrice = String(lastLine.unitPrice ?? "").trim();
    return !(description === "" && unitPrice === "" && (quantity === "" || Number(quantity) === 1));
  })();
  const paymentInvoice = editor.kind === "payment" ? data.invoices.find((invoice) => invoice.id === editor.invoiceId) || null : null;
  const paymentRows = paymentInvoice?.payments || [];
  const paymentRowsTotal = invoicePaymentTotal(paymentRows);
  const paymentBalance = Math.max(0, Number(paymentInvoice?.total || 0) - paymentRowsTotal);

  useEffect(() => {
    const requested = location.state?.invoiceAction;
    if (!requested?.id) return;
    const invoice = data.invoices.find((item) => item.id === requested.id);
    if (!invoice) return;
    if (requested.mode === "payments") beginManagePayments(invoice);
    else beginEditInvoice(invoice);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [data.invoices, location.key, location.pathname, location.search, location.state, navigate, beginEditInvoice, beginManagePayments]);

  useEffect(() => {
    setStatusFilter(searchParams.get("status") || "all");
  }, [searchParams]);

  const filteredInvoices = data.invoices.filter((invoice) => {
    const isOpen = invoice.status !== "draft" && invoice.status !== "paid" && Number(invoice.balanceDue ?? invoice.total ?? 0) > 0;
    if (statusFilter === "open" && !isOpen) return false;
    if (statusFilter !== "all" && statusFilter !== "open" && invoice.status !== statusFilter) {
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
    const filename = `factures-${localDateStamp()}.csv`;
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
    if (!canAddInvoiceLine) {
      return;
    }

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
    const a4PrintHtml = buildInvoicePrintHtml({
      invoice: {
        ...forms.invoice,
        lines: invoiceLines
      },
      client: selectedClient,
      creator: selectedCreator,
      settings: workspaceSettings
    });
    const previewWindow = window.open("", "_blank");
    if (!previewWindow) return;
    previewWindow.document.open();
    previewWindow.document.write(a4PrintHtml);
    previewWindow.document.close();
    previewWindow.focus();
  }

  function printThermalTicket(invoice) {
    const printWindow = window.open("", "_blank", "width=420,height=800");
    if (!printWindow) {
      notifyError("Impression impossible", "Autorisez les fenêtres contextuelles pour imprimer le ticket.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildThermalInvoiceHtml({
      invoice,
      client: invoice.client,
      creator: invoice.creator,
      settings: workspaceSettings
    }));
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
      if (!printWindow.closed) printWindow.print();
    }, 350);
  }

  function printReceipt(payment) {
    if (!payment.receipt || !paymentInvoice) return;
    const receipt = payment.receipt;
    const clientLabel = paymentInvoice.client?.company || [paymentInvoice.client?.firstName, paymentInvoice.client?.lastName].filter(Boolean).join(" ") || "Client";
    const html = `<html><head><title>${receipt.number}</title><style>body{font:14px Arial;max-width:560px;margin:40px auto;color:#17202a}h1{margin-bottom:4px;border-bottom:2px solid #17202a;padding-bottom:12px}p{line-height:1.7}.amount{font-size:24px;font-weight:bold;margin:28px 0}</style></head><body><h1>REÇU DE PAIEMENT</h1><p><strong>${receipt.number}</strong><br>Client : ${clientLabel}<br>Facture : ${paymentInvoice.number}<br>Date : ${formatDate(receipt.receivedAt)}<br>Moyen : ${paymentMethodLabel(receipt.method)}</p><p class="amount">Montant reçu : ${money(receipt.amount, paymentInvoice.currency)}</p><p>Solde restant : ${money(receipt.balanceDue, paymentInvoice.currency)}</p></body></html>`;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <div className="page-shell invoices-page">
      <header className="hero list-page-header">
        <div>
          <span className="eyebrow">Facturation</span>
          <h1>Factures</h1>
        </div>
        <div className="hero-actions">
          <button className="primary-button list-action-button" type="button" onClick={() => beginCreateInvoiceWithPreset()}>
            Nouvelle facture
          </button>
          <button className="secondary-button" type="button" onClick={exportInvoicesCsv}>
            Export CSV
          </button>
        </div>
      </header>

      <div className="page-scroll">
        <section className="list-view-content">
            <div className="filters-panel list-filters">
              <div className="filters-grid">
                <label className="filter-field search">
                Rechercher
                <input
                  className="filter-input"
                  type="text"
                  placeholder="N° facture, client, notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                </label>
                <label className="filter-field">
                Statut
                <select
                  className="filter-select"
                  value={statusFilter}
                  onChange={(e) => {
                    const next = new URLSearchParams(searchParams);
                    if (e.target.value === "all") next.delete("status");
                    else next.set("status", e.target.value);
                    setSearchParams(next, { replace: true });
                    setStatusFilter(e.target.value);
                  }}
                >
                  <option value="all">Tous les statuts</option>
                  <option value="open">Factures ouvertes</option>
                  <option value="draft">Brouillon</option>
                  <option value="sent">Envoyée</option>
                  <option value="paid">Payée</option>
                  <option value="overdue">En retard</option>
                </select>
                </label>
                <label className="filter-field">
                Client
                <select
                  className="filter-select"
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                >
                  <option value="all">Tous les clients</option>
                  {data.clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.clientType === "company" ? c.company : `${c.firstName} ${c.lastName}`.trim() || c.company}
                    </option>
                  ))}
                </select>
                </label>
              </div>
            </div>

            {isHydrating ? <DataLoadingState label="Chargement des factures…" className="page-loading-state" /> : filteredInvoices.length > 0 ? <div className="panel entity-list-panel"><Table className="entity-list-table invoices-table" columns={["Facture / Client", "Date", "Statut", "Paiement", "Total", "Encaissé", "Reste dû", "Actions"]} rows={filteredInvoices.map((invoice) => [
              <div className="table-primary-cell"><strong>{invoiceDisplayLabel(invoice)}</strong><small>{invoice.client?.clientType === "company" ? invoice.client.company : [invoice.client?.firstName, invoice.client?.lastName].filter(Boolean).join(" ") || invoice.client?.company || "Client"}</small>{(invoice.deliveryNotes || []).map((note) => <small key={note.id} className="document-link-label">BL lié : {note.number}</small>)}</div>,
              formatDate(invoice.issueDate),
              <span className={`badge ${String(invoice.status || "").toLowerCase()}`}>{statusToLabel(invoice.status)}</span>,
              invoicePaymentStatusLabel(invoice),
              <strong>{money(invoice.total, invoice.currency)}</strong>,
              money(invoice.amountPaid ?? 0, invoice.currency),
              money(invoice.balanceDue ?? invoice.total ?? 0, invoice.currency),
              <div className="table-row-actions"><TableAction icon="open" label="Ouvrir" onClick={() => beginEditInvoice(invoice)} /><TableAction icon="payments" label="Paiements" onClick={() => beginManagePayments(invoice)} /><TableAction icon="print" label="Ticket" onClick={() => printThermalTicket(invoice)} />{canDeleteRecords && <TableAction icon="delete" label="Supprimer" danger onClick={() => removeInvoice(invoice.id)} disabled={loading} />}</div>
            ])} /></div> : <div className="empty-card-state">Aucune facture ne correspond à vos critères.</div>}
        </section>
      </div>

        <OverlayDialog
        open={editor.kind === "invoice"}
        title={isEditing ? "Modifier facture" : "Créer facture"}
        onClose={() => {
          closeEditor();
          if (location.state?.invoiceAction) {
            navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
          }
        }}
        topbarActions={
          <>
            <OverlayActionButton
              icon={<OverlayPreviewIcon />}
              className="overlay-preview-button"
              type="button"
              onClick={openInvoicePdf}
              disabled={!hasInvoiceClient}
            >
              Aperçu PDF
            </OverlayActionButton>
            <OverlayActionButton
              icon={loading ? <span className="loading-spinner" /> : <OverlaySaveIcon />}
              className="primary-button overlay-save-button"
              type="submit"
              form="invoice-form"
              disabled={loading || !hasInvoiceClient}
              aria-busy={loading}
            >
              {loading ? (isEditing ? "Enregistrement…" : "Création…") : isEditing ? "Enregistrer" : "Créer facture"}
            </OverlayActionButton>
          </>
        }
        className="invoice-editor-modal"
      >
        <form className="stack-form invoice-form-grid" id="invoice-form" onSubmit={(event) => { event.preventDefault(); saveInvoice(); }}>

          <label className="invoice-form-field">
            Numéro
            <input
              value={forms.invoice.number}
              readOnly={!isEditing}
              onChange={(event) => setForms((current) => ({
                ...current,
                invoice: { ...current.invoice, number: event.target.value }
              }))}
            />
          </label>
          <label className="invoice-form-field">
            Type de client
            <select value={forms.invoice.clientMode || "crm"} onChange={(event) => setForms((current) => ({
              ...current,
              invoice: { ...current.invoice, clientMode: event.target.value }
            }))}>
              <option value="crm">Client enregistré</option>
              {!isEditing && <option value="manual">Client ponctuel</option>}
            </select>
          </label>
          {forms.invoice.clientMode === "manual" && !isEditing ? <>
            <label className="invoice-form-field">Nom du client
              <input required autoComplete="name" value={forms.invoice.manualClientName} onChange={(event) => setForms((current) => ({ ...current, invoice: { ...current.invoice, manualClientName: event.target.value } }))} />
            </label>
            <label className="invoice-form-field">Société (facultatif)
              <input autoComplete="organization" value={forms.invoice.manualClientCompany} onChange={(event) => setForms((current) => ({ ...current, invoice: { ...current.invoice, manualClientCompany: event.target.value } }))} />
            </label>
            <label className="invoice-form-field">E-mail (facultatif)
              <input type="email" autoComplete="email" value={forms.invoice.manualClientEmail} onChange={(event) => setForms((current) => ({ ...current, invoice: { ...current.invoice, manualClientEmail: event.target.value } }))} />
            </label>
          </> : <label className="invoice-form-field">
            Client
            <select required value={forms.invoice.clientId} onChange={(event) => setForms((current) => ({
              ...current,
              invoice: { ...current.invoice, clientId: event.target.value }
            }))}>
              <option value="">Sélectionner</option>
              {data.clients.map((client) => <option key={client.id} value={client.id}>{client.firstName} {client.lastName}{client.company ? ` · ${client.company}` : ""}</option>)}
            </select>
          </label>}
          <label className="invoice-form-field">
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
          <label className="invoice-form-field">
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
          <label className="invoice-form-field">
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
          <label className="invoice-form-field">
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
          <label className="invoice-form-field">
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
          <div className="invoice-lines-editor invoice-form-span-2">
            <div className="invoice-lines-head">
              <div>
                <strong>Lignes de facture</strong>
              </div>
              <button
                className="ghost-button"
                type="button"
                onClick={addInvoiceLine}
                disabled={!canAddInvoiceLine}
              >
                Ajouter une ligne
              </button>
            </div>

            <div className="invoice-lines-table">
              <div className="invoice-lines-row invoice-lines-row-head">
                <span>N°</span>
                <span>Désignation</span>
                <span>Qte</span>
                <span>PU ({selectedCurrency})</span>
                <span>PT ({selectedCurrency})</span>
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
                        placeholder="Ex. Impression de flyers"
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
                        placeholder={`0.00 ${selectedCurrency}`}
                      />
                    </label>
                    <strong className="invoice-line-total">{money(lineTotal, selectedCurrency)}</strong>
                    <button className="ghost-button invoice-line-remove" type="button" onClick={() => removeInvoiceLine(index)}>
                      Supprimer
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="invoice-lines-summary">
              <span>{isVatActive ? "Total HT" : "Montant net"}</span>
              <strong>{money(invoiceTotalHT, selectedCurrency)}</strong>
              {isVatActive && <><span>TVA ({taxRateVal}%)</span><strong>{money(taxAmountVal, selectedCurrency)}</strong></>}
              <span className="invoice-total-label">{isVatActive ? "Total TTC" : "Total net à payer"}</span>
              <strong className="invoice-total-value">{money(invoiceTotalTTC, selectedCurrency)}</strong>
            </div>
          </div>
          <label className="invoice-form-field invoice-form-span-2">
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
        </form>
      </OverlayDialog>

      <OverlayDialog
        open={editor.kind === "payment"}
        title={`Paiements${paymentInvoice ? ` · ${invoiceDisplayLabel(paymentInvoice)}` : ""}`}
        onClose={closeEditor}
        className="payment-editor-modal"
        topbarActions={
          <button className="primary-button overlay-head-button" type="submit" form="payment-form" disabled={loading || !paymentInvoice}>
            {editor.id ? "Enregistrer" : "Ajouter le paiement"}
          </button>
        }
      >
        {paymentInvoice ? (
          <form className="stack-form invoice-form-grid" id="payment-form" onSubmit={(event) => { event.preventDefault(); savePayment(); }}>
            <label className="invoice-form-field">
              Montant
              <input
                type="number"
                min="0"
                step="0.01"
                value={forms.payment.amount}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  payment: { ...current.payment, amount: event.target.value }
                }))}
              />
            </label>

            <label className="invoice-form-field">
              Méthode
              <select
                value={forms.payment.method}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  payment: { ...current.payment, method: event.target.value }
                }))}
              >
                <option value="cash">Espèces</option>
                <option value="card">Carte</option>
                <option value="bank_transfer">Virement</option>
                <option value="mobile_money">Mobile money</option>
                <option value="check">Chèque</option>
                <option value="other">Autre</option>
              </select>
            </label>

            <label className="invoice-form-field">
              Date de paiement
              <input
                type="date"
                value={forms.payment.paidAt}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  payment: { ...current.payment, paidAt: event.target.value }
                }))}
              />
            </label>

            <label className="invoice-form-field">
              Référence
              <input
                value={forms.payment.reference}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  payment: { ...current.payment, reference: event.target.value }
                }))}
              />
            </label>

            <label className="invoice-form-field invoice-form-span-2">
              Notes
              <textarea
                rows="3"
                value={forms.payment.notes}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  payment: { ...current.payment, notes: event.target.value }
                }))}
              />
            </label>

            <div className="invoice-form-span-2">
              <div className="quick-list">
                {paymentRows.length ? (
                  paymentRows.map((payment) => (
                    <article key={payment.id}>
                      <div>
                        <strong>{money(payment.amount, paymentInvoice.currency)}</strong>
                        <span>{paymentMethodLabel(payment.method)} · {formatDate(payment.paidAt)}</span>
                      </div>
                      <div className="entity-actions">
                        <TableAction icon="edit" label="Modifier" onClick={() => beginEditPayment(payment, paymentInvoice)} />
                        {payment.receipt && <TableAction icon="receipt" label="Reçu" onClick={() => printReceipt(payment)} />}
                        {canDeleteRecords && <TableAction icon="delete" label="Supprimer" danger onClick={() => removePayment(payment.id)} />}
                      </div>
                    </article>
                  ))
                ) : (
                  <article>
                    <div>
                      <strong>Aucun paiement</strong>
                    </div>
                  </article>
                )}
              </div>
            </div>
          </form>
        ) : (
          <div className="overlay-hint">
            <strong>Facture introuvable</strong>
            <span>La facture sélectionnée n’est plus disponible.</span>
          </div>
        )}
      </OverlayDialog>
    </div>
  );
}
