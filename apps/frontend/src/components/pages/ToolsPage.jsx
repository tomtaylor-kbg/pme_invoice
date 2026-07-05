import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "../WorkspaceProvider";
import { SectionHeader } from "../ui";
import { addDaysToISODate, calculateToolBreakdown, formatISODate, invoicePrefixForType, money, suggestInvoiceNumber, todayISO } from "../../utils/formatters";

export function ToolsPage() {
  const navigate = useNavigate();
  const { data, beginCreateInvoiceWithPreset, setForms, workspaceSettings, setWorkspaceSettings } = useWorkspace();
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
    prefix: workspaceSettings.invoicePrefix || invoicePrefixForType("professional"),
    issueDate: todayISO()
  });

  useEffect(() => {
    setNumberTool((current) => {
      if (current.prefix && current.prefix !== "FAC") {
        return current;
      }

      return {
        ...current,
        prefix: workspaceSettings.invoicePrefix || invoicePrefixForType("professional")
      };
    });
  }, [workspaceSettings.invoicePrefix]);

  const dueDate = addDaysToISODate(dueDateTool.issueDate, dueDateTool.termDays);
  const breakdown = calculateToolBreakdown(invoiceTool);
  const nextNumber = suggestInvoiceNumber(data.invoices, numberTool.prefix, numberTool.issueDate);
  const serviceList = workspaceSettings.services
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  function updateWorkspaceSetting(field, value) {
    setWorkspaceSettings((current) => ({
      ...current,
      [field]: value
    }));
  }

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
        <section className="settings-grid">
          <article className="tool-card settings-card">
            <SectionHeader title="Établissement" action="Identité et coordonnées utilisées dans l’environnement de travail." />
            <div className="tool-form">
              <label>
                Nom de l'établissement
                <input
                  value={workspaceSettings.companyName}
                  onChange={(event) => updateWorkspaceSetting("companyName", event.target.value)}
                />
              </label>
              <label>
                Adresse
                <input
                  value={workspaceSettings.addressLine1}
                  onChange={(event) => updateWorkspaceSetting("addressLine1", event.target.value)}
                  placeholder="Ligne 1"
                />
              </label>
              <label>
                Complément d'adresse
                <input
                  value={workspaceSettings.addressLine2}
                  onChange={(event) => updateWorkspaceSetting("addressLine2", event.target.value)}
                  placeholder="Ligne 2"
                />
              </label>
              <label>
                Code postal
                <input
                  value={workspaceSettings.postalCode}
                  onChange={(event) => updateWorkspaceSetting("postalCode", event.target.value)}
                />
              </label>
              <label>
                Ville
                <input
                  value={workspaceSettings.city}
                  onChange={(event) => updateWorkspaceSetting("city", event.target.value)}
                />
              </label>
              <label>
                Pays
                <input
                  value={workspaceSettings.country}
                  onChange={(event) => updateWorkspaceSetting("country", event.target.value)}
                />
              </label>
              <label>
                Téléphone
                <input
                  value={workspaceSettings.phone}
                  onChange={(event) => updateWorkspaceSetting("phone", event.target.value)}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={workspaceSettings.email}
                  onChange={(event) => updateWorkspaceSetting("email", event.target.value)}
                />
              </label>
              <label>
                Site web
                <input
                  value={workspaceSettings.website}
                  onChange={(event) => updateWorkspaceSetting("website", event.target.value)}
                />
              </label>
            </div>
          </article>

          <article className="tool-card settings-card">
            <SectionHeader title="Fiscalité" action="Valeurs par défaut appliquées aux nouvelles factures." />
            <div className="tool-form">
              <label>
                TVA par défaut (%)
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={workspaceSettings.vatRate}
                  onChange={(event) => updateWorkspaceSetting("vatRate", event.target.value)}
                />
              </label>
              <label>
                Devise par défaut
                <select
                  value={workspaceSettings.defaultCurrency}
                  onChange={(event) => updateWorkspaceSetting("defaultCurrency", event.target.value)}
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="CDF">CDF</option>
                </select>
              </label>
              <label>
                Préfixe facture
                <input
                  value={workspaceSettings.invoicePrefix}
                  onChange={(event) => updateWorkspaceSetting("invoicePrefix", event.target.value.toUpperCase())}
                />
              </label>
              <label>
                Délai de paiement (jours)
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={workspaceSettings.paymentTermsDays}
                  onChange={(event) => updateWorkspaceSetting("paymentTermsDays", event.target.value)}
                />
              </label>
            </div>
            <div className="tool-result">
              <span>Paramètres actifs</span>
              <strong>{workspaceSettings.defaultCurrency} · TVA {workspaceSettings.vatRate}%</strong>
            </div>
          </article>

          <article className="tool-card settings-card settings-card-wide">
            <SectionHeader title="Services" action="Liste des services ou prestations à retrouver dans les documents et futurs modules." />
            <label className="stack-form">
              Services proposés
              <textarea
                rows="6"
                value={workspaceSettings.services}
                onChange={(event) => updateWorkspaceSetting("services", event.target.value)}
                placeholder={"Conseil\nDéveloppement\nSupport"}
              />
            </label>
            <div className="settings-tags">
              {serviceList.length > 0 ? (
                serviceList.map((service) => <span key={service}>{service}</span>)
              ) : (
                <span className="settings-empty">Aucun service renseigné.</span>
              )}
            </div>
          </article>
        </section>

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
