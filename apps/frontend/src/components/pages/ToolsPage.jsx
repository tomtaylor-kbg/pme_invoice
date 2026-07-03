import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useWorkspace } from "../WorkspaceProvider";
import { SectionHeader } from "../ui";
import { addDaysToISODate, calculateToolBreakdown, formatISODate, money, suggestInvoiceNumber, todayISO } from "../../utils/formatters";

export function ToolsPage() {
  const navigate = useNavigate();
  const { data, beginCreateInvoiceWithPreset, setForms } = useWorkspace();
  const [dueDateTool, setDueDateTool] = useState({
    issueDate: todayISO(),
    termDays: 30
  });
  const [invoiceTool, setInvoiceTool] = useState({
    quantity: 1,
    unitPrice: 250,
    discountRate: 0,
    taxRate: 18
  });
  const [numberTool, setNumberTool] = useState({
    prefix: "FAC",
    issueDate: todayISO()
  });

  const dueDate = addDaysToISODate(dueDateTool.issueDate, dueDateTool.termDays);
  const breakdown = calculateToolBreakdown(invoiceTool);
  const nextNumber = suggestInvoiceNumber(data.invoices, numberTool.prefix, numberTool.issueDate);

  return (
    <div className="page-shell tools-page">
      <header className="hero">
        <div>
          <span className="eyebrow">Productivité</span>
          <h1>Outils</h1>
          <p>Utilitaires pour préparer les documents de facturation.</p>
        </div>
      </header>

      <div className="page-scroll">
        <section className="tools-grid">
          <article className="tool-card">
            <SectionHeader title="Calculateur d’échéance" action="Estime la date limite à partir de la date d’émission et du délai de paiement." />
            <div className="tool-form">
              <label>
                Date d’émission
                <input
                  type="date"
                  value={dueDateTool.issueDate}
                  onChange={(event) => setDueDateTool((current) => ({ ...current, issueDate: event.target.value }))}
                />
              </label>
              <label>
                Délai de paiement (jours)
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={dueDateTool.termDays}
                  onChange={(event) => setDueDateTool((current) => ({ ...current, termDays: event.target.value }))}
                />
              </label>
            </div>
            <div className="tool-result">
              <span>Échéance calculée</span>
              <strong>{formatISODate(dueDate)}</strong>
            </div>
          </article>

          <article className="tool-card">
            <SectionHeader title="Générateur de numéro" action="Crée le prochain numéro de facture en fonction du préfixe et de l’année." />
            <div className="tool-form">
              <label>
                Préfixe
                <input
                  value={numberTool.prefix}
                  onChange={(event) => setNumberTool((current) => ({ ...current, prefix: event.target.value }))}
                />
              </label>
              <label>
                Date de référence
                <input
                  type="date"
                  value={numberTool.issueDate}
                  onChange={(event) => setNumberTool((current) => ({ ...current, issueDate: event.target.value }))}
                />
              </label>
            </div>
            <div className="tool-result">
              <span>Numéro proposé</span>
              <strong>{nextNumber}</strong>
            </div>
            <div className="hero-actions tool-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  beginCreateInvoiceWithPreset({
                    templateType: "professional",
                    prefix: numberTool.prefix,
                    issueDate: numberTool.issueDate,
                    number: nextNumber
                  });
                  navigate("/invoices");
                }}
              >
                Utiliser pour une facture
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={() =>
                  setForms((current) => ({
                    ...current,
                    invoice: {
                      ...current.invoice,
                      number: nextNumber
                    }
                  }))
                }
              >
                Remplir le formulaire
              </button>
            </div>
          </article>

          <article className="tool-card">
            <SectionHeader title="Estimateur de facture" action="Calcule le total avec remise et TVA avant saisie dans le formulaire." />
            <div className="tool-form">
              <label>
                Quantité
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={invoiceTool.quantity}
                  onChange={(event) => setInvoiceTool((current) => ({ ...current, quantity: event.target.value }))}
                />
              </label>
              <label>
                Prix unitaire
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={invoiceTool.unitPrice}
                  onChange={(event) => setInvoiceTool((current) => ({ ...current, unitPrice: event.target.value }))}
                />
              </label>
              <label>
                Remise (%)
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={invoiceTool.discountRate}
                  onChange={(event) => setInvoiceTool((current) => ({ ...current, discountRate: event.target.value }))}
                />
              </label>
              <label>
                TVA (%)
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={invoiceTool.taxRate}
                  onChange={(event) => setInvoiceTool((current) => ({ ...current, taxRate: event.target.value }))}
                />
              </label>
            </div>
            <div className="tool-kpis">
              <div>
                <span>Sous-total</span>
                <strong>{money(breakdown.subtotal)}</strong>
              </div>
              <div>
                <span>Remise</span>
                <strong>- {money(breakdown.discountAmount)}</strong>
              </div>
              <div>
                <span>TVA</span>
                <strong>{money(breakdown.taxAmount)}</strong>
              </div>
              <div className="tool-total">
                <span>Total estimé</span>
                <strong>{money(breakdown.total)}</strong>
              </div>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
