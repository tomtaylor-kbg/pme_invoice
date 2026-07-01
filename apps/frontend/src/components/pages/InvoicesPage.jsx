import { useEffect } from "react";
import { useWorkspace } from "../WorkspaceProvider";
import { InvoiceCard, SectionHeader } from "../ui";

export function InvoicesPage() {
  const { data, forms, setForms, editor, beginCreateInvoice, beginEditInvoice, saveInvoice, removeInvoice, loading } = useWorkspace();

  useEffect(() => {
    if (editor.kind !== "invoice") {
      beginCreateInvoice();
    }
  }, [beginCreateInvoice, editor.kind]);

  const isEditing = editor.kind === "invoice" && Boolean(editor.id);

  return (
    <>
      <header className="hero">
        <div>
          <span className="eyebrow">Facturation</span>
          <h1>Factures</h1>
          <p>Création, édition et suivi des documents de facturation sous forme de cartes.</p>
        </div>
        <div className="hero-actions">
          <button className="secondary-button" type="button" onClick={beginCreateInvoice}>
            Nouvelle facture
          </button>
        </div>
      </header>

      <section className="content-grid invoices-layout">
        <div className="panel">
          <SectionHeader title="Cartes factures" action="Une carte par document pour accélérer le scan visuel." />
          <div className="card-grid invoices-grid">
            {data.invoices.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                loading={loading}
                onEdit={() => beginEditInvoice(invoice)}
                onDelete={() => removeInvoice(invoice.id)}
              />
            ))}
          </div>
        </div>

        <div className="panel panel-side">
          <SectionHeader title={isEditing ? "Modifier facture" : "Créer facture"} action="Enregistrer un document de facturation." />
          <form className="stack-form" onSubmit={(event) => { event.preventDefault(); saveInvoice(); }}>
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
              Utilisateur
              <select
                value={forms.invoice.userId}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  invoice: { ...current.invoice, userId: event.target.value }
                }))}
              >
                <option value="">Aucun</option>
                {data.users.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
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
            <label>
              Total
              <input
                type="number"
                min="0"
                step="0.01"
                value={forms.invoice.total}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  invoice: { ...current.invoice, total: event.target.value }
                }))}
              />
            </label>
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
            <button className="primary-button" type="submit" disabled={loading || !forms.invoice.clientId}>
              {isEditing ? "Enregistrer" : "Créer facture"}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
