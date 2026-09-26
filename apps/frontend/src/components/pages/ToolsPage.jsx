import { useState, useRef, useEffect } from "react";
import { useWorkspace } from "../WorkspaceProvider";
import { OverlayDialog } from "../ui";
import { todayISO, formatISODate, money, suggestInvoiceNumber } from "../../utils/formatters";
import { formatWorkspaceAddress, formatWorkspaceContact, formatWorkspaceLegalInfo } from "../../utils/print/invoicePrintShared";

const TABS = [
  {
    id: "company",
    label: "Profil & Identité",
    icon: (
      <svg viewBox="0 0 24 24" className="tools-tab-icon" aria-hidden="true">
        <path d="M3 21h18M3 7v14M21 7v14M6 21V3h12v18M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    id: "contact",
    label: "Coordonnées & Adresse",
    icon: (
      <svg viewBox="0 0 24 24" className="tools-tab-icon" aria-hidden="true">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="10" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  },
  {
    id: "billing",
    label: "Règles de Facturation",
    icon: (
      <svg viewBox="0 0 24 24" className="tools-tab-icon" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="14 2 14 8 20 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="10" y1="9" x2="8" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
];

const CURRENCIES = [
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "USD", symbol: "$", label: "Dollar américain" },
  { code: "CDF", symbol: "FC", label: "Franc congolais" }
];

function calculateDueDate(issueDateIso, termDays) {
  try {
    const days = parseInt(termDays, 10);
    if (isNaN(days) || days <= 0) return issueDateIso;
    const date = new Date(issueDateIso);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  } catch {
    return issueDateIso;
  }
}

export function ToolsPage() {
  const { user, workspaceSettings, setWorkspaceSettings, resetWorkspaceSettings, data } = useWorkspace();
  const [activeTab, setActiveTab] = useState("company");
  const [previewFormat, setPreviewFormat] = useState("a4"); // "a4" | "thermal"
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [saveStatus, setSaveStatus] = useState("saved");
  const saveTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastActiveVatRef = useRef(workspaceSettings.vatRate && Number(workspaceSettings.vatRate) > 0 ? workspaceSettings.vatRate : "20");

  const canReset = user?.role === "admin" || user?.role === "finance";
  const today = todayISO();

  function updateSetting(field, value) {
    setWorkspaceSettings((current) => ({ ...current, [field]: value }));
    setSaveStatus("saving");
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus("saved");
    }, 600);
  }

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  function processLogoFile(file) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 400 * 1024) {
      setLogoError("Choisissez une image PNG, JPEG ou WebP de 400 Ko maximum.");
      return;
    }
    setLogoError("");
    const reader = new FileReader();
    reader.onload = () => updateSetting("logoDataUrl", String(reader.result || ""));
    reader.onerror = () => setLogoError("Le fichier n’a pas pu être lu.");
    reader.readAsDataURL(file);
  }

  function handleLogoChange(event) {
    const file = event.target.files?.[0];
    if (file) processLogoFile(file);
    event.target.value = "";
  }

  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processLogoFile(file);
  }

  // Preview derivations
  const previewInvoiceNumber = suggestInvoiceNumber(
    data.invoices || [],
    workspaceSettings.invoicePrefix || "FAC",
    today
  );
  const previewDueDate = calculateDueDate(today, workspaceSettings.paymentTermsDays || 30);
  const formattedAddress = formatWorkspaceAddress(workspaceSettings);
  const formattedContact = formatWorkspaceContact(workspaceSettings);
  const formattedLegal = formatWorkspaceLegalInfo(workspaceSettings);
  const vatRateNumber = workspaceSettings.vatRate !== undefined && workspaceSettings.vatRate !== "" ? Number(workspaceSettings.vatRate) : 0;
  const isVatActive = vatRateNumber > 0;
  const sampleSubtotalHT = 100;
  const sampleTax = isVatActive ? sampleSubtotalHT * (vatRateNumber / 100) : 0;
  const sampleTotalTTC = sampleSubtotalHT + sampleTax;
  const currentCurrency = workspaceSettings.defaultCurrency || "EUR";

  return (
    <div className="page-shell tools-page">
      <header className="hero settings-header list-page-header">
        <div>
          <span className="eyebrow">Configuration · Paramètres</span>
          <h1>Paramètres de l’entreprise</h1>
          <p>Identité visuelle, coordonnées légales et règles par défaut de vos factures.</p>
        </div>
        <div className="hero-actions">
          <div className={`tools-sync-badge ${saveStatus}`} title="Synchronisation automatique avec le serveur">
            <span className="sync-dot" aria-hidden="true" />
            <span>{saveStatus === "saving" ? "Enregistrement..." : "Enregistré automatiquement"}</span>
          </div>
          {canReset && (
            <button
              className="secondary-button"
              type="button"
              onClick={() => setResetDialogOpen(true)}
            >
              Réinitialiser
            </button>
          )}
        </div>
      </header>

      <div className="page-scroll">
        <div className="tools-layout">
          {/* Left Column: Form and Navigation */}
          <div className="tools-main">
            <nav className="tools-tabs" aria-label="Sections des paramètres">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`tools-tab-btn ${activeTab === tab.id ? "active" : ""}`}
                  aria-current={activeTab === tab.id ? "page" : undefined}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>

            {/* TAB 1: Profil & Identité */}
            {activeTab === "company" && (
              <div className="tools-tab-content">
                {/* Logo Card */}
                <article className="tools-card">
                  <div className="tools-card-head">
                    <div>
                      <h3>Logo officiel de l’entreprise</h3>
                      <p>Affiché en haut de vos factures, devis et tickets thermiques.</p>
                    </div>
                  </div>

                  <div className="tools-logo-upload-wrap">
                    <div
                      className={`tools-dropzone ${isDragging ? "dragging" : ""} ${workspaceSettings.logoDataUrl ? "has-logo" : ""}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => !workspaceSettings.logoDataUrl && fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="tools-file-input"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleLogoChange}
                      />

                      {workspaceSettings.logoDataUrl ? (
                        <div className="tools-logo-preview-box">
                          <img
                            src={workspaceSettings.logoDataUrl}
                            alt={`Logo ${workspaceSettings.companyName || "Entreprise"}`}
                            className="tools-logo-img"
                          />
                          <div className="tools-logo-overlay-actions">
                            <button
                              type="button"
                              className="secondary-button small"
                              onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                              }}
                            >
                              Changer
                            </button>
                            <button
                              type="button"
                              className="text-button danger small"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateSetting("logoDataUrl", "");
                              }}
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="tools-dropzone-prompt">
                          <div className="tools-upload-icon-circle">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                          <strong>Glissez votre logo ici ou cliquez pour parcourir</strong>
                          <span>PNG, JPEG ou WebP · 400 Ko maximum</span>
                        </div>
                      )}
                    </div>

                    {logoError && (
                      <div className="tools-logo-error-alert" role="alert">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                        <span>{logoError}</span>
                      </div>
                    )}
                  </div>
                </article>

                {/* Identity Card */}
                <article className="tools-card">
                  <div className="tools-card-head">
                    <div>
                      <h3>Identité de l’entreprise</h3>
                      <p>Dénomination commerciale et secteur d’activité principal.</p>
                    </div>
                  </div>

                  <div className="tools-form-grid">
                    <label>
                      <span>Nom de l’entreprise <span className="required">*</span></span>
                      <input
                        type="text"
                        value={workspaceSettings.companyName}
                        onChange={(e) => updateSetting("companyName", e.target.value)}
                        placeholder=""
                        autoComplete="organization"
                      />
                    </label>

                    <label>
                      Sigle de l’entreprise
                      <input
                        type="text"
                        value={workspaceSettings.companyAcronym}
                        onChange={(e) => updateSetting("companyAcronym", e.target.value.toUpperCase())}
                        placeholder=""
                        maxLength={24}
                        autoComplete="organization-title"
                      />
                      <small>Utilisé comme nom de l’application dans l’onglet du navigateur.</small>
                    </label>

                    <label>
                      Secteur d’activité
                      <input
                        type="text"
                        value={workspaceSettings.businessSector}
                        onChange={(e) => updateSetting("businessSector", e.target.value)}
                        placeholder="Ex. Imprimerie & Sérigraphie"
                      />
                    </label>
                  </div>
                </article>

                {/* Legal Mentions Card */}
                <article className="tools-card">
                  <div className="tools-card-head">
                    <div>
                      <h3>Mentions légales & Numéros fiscaux</h3>
                      <p>Identifiants officiels obligatoires imprimés au bas de vos factures.</p>
                    </div>
                  </div>

                  <div className="tools-form-grid">
                    <label>
                      RCCM
                      <input
                        type="text"
                        value={workspaceSettings.rccm}
                        onChange={(e) => updateSetting("rccm", e.target.value)}
                        placeholder="Ex. CD/KIN/RCCM/14-B-0000"
                      />
                      <small>Registre du Commerce et du Crédit Mobilier</small>
                    </label>

                    <label>
                      Id.Nat
                      <input
                        type="text"
                        value={workspaceSettings.idNat}
                        onChange={(e) => updateSetting("idNat", e.target.value)}
                        placeholder="Ex. 01-93-N00000X"
                      />
                      <small>Numéro d’Identification Nationale</small>
                    </label>

                    <label className="tools-form-wide">
                      Numéro d’impôt (NIF / Fiscal)
                      <input
                        type="text"
                        value={workspaceSettings.taxNumber}
                        onChange={(e) => updateSetting("taxNumber", e.target.value)}
                        placeholder="Ex. A0000000Z"
                      />
                      <small>Numéro fiscal pour la traçabilité de vos factures</small>
                    </label>
                  </div>
                </article>
              </div>
            )}

            {/* TAB 2: Coordonnées & Adresse */}
            {activeTab === "contact" && (
              <div className="tools-tab-content">
                {/* Physical Address Card */}
                <article className="tools-card">
                  <div className="tools-card-head">
                    <div>
                      <h3>Adresse de l’établissement</h3>
                      <p>Siège ou adresse d’exploitation figurant sur vos en-têtes.</p>
                    </div>
                  </div>

                  <div className="tools-form-grid">
                    <label className="tools-form-wide">
                      Adresse principale
                      <input
                        type="text"
                        value={workspaceSettings.addressLine1}
                        onChange={(e) => updateSetting("addressLine1", e.target.value)}
                        placeholder="Ex. 14, Avenue du Commerce"
                        autoComplete="street-address"
                      />
                    </label>

                    <label className="tools-form-wide">
                      Complément d’adresse
                      <input
                        type="text"
                        value={workspaceSettings.addressLine2}
                        onChange={(e) => updateSetting("addressLine2", e.target.value)}
                        placeholder="Ex. Bâtiment B, 2ème étage"
                      />
                    </label>

                    <label>
                      Code postal
                      <input
                        type="text"
                        value={workspaceSettings.postalCode}
                        onChange={(e) => updateSetting("postalCode", e.target.value)}
                        placeholder="Ex. B.P. 1234"
                        autoComplete="postal-code"
                      />
                    </label>

                    <label>
                      Ville
                      <input
                        type="text"
                        value={workspaceSettings.city}
                        onChange={(e) => updateSetting("city", e.target.value)}
                        placeholder="Ex. Kinshasa"
                        autoComplete="address-level2"
                      />
                    </label>

                    <label className="tools-form-wide">
                      Pays
                      <input
                        type="text"
                        value={workspaceSettings.country}
                        onChange={(e) => updateSetting("country", e.target.value)}
                        placeholder="Ex. RD Congo"
                        autoComplete="country-name"
                      />
                    </label>
                  </div>
                </article>

                {/* Contact Channels Card */}
                <article className="tools-card">
                  <div className="tools-card-head">
                    <div>
                      <h3>Canaux de contact</h3>
                      <p>Permet à vos clients de vous joindre pour les paiements et questions.</p>
                    </div>
                  </div>

                  <div className="tools-form-grid">
                    <label>
                      Téléphone principal
                      <input
                        type="tel"
                        value={workspaceSettings.phone}
                        onChange={(e) => updateSetting("phone", e.target.value)}
                        placeholder="+243 ..."
                        autoComplete="tel"
                      />
                    </label>

                    <label>
                      Téléphone secondaire
                      <input
                        type="tel"
                        value={workspaceSettings.phone2}
                        onChange={(e) => updateSetting("phone2", e.target.value)}
                        placeholder="+243 ..."
                        autoComplete="tel"
                      />
                    </label>

                    <label>
                      Email de contact
                      <input
                        type="email"
                        value={workspaceSettings.email}
                        onChange={(e) => updateSetting("email", e.target.value)}
                        placeholder="contact@entreprise.com"
                        autoComplete="email"
                      />
                    </label>

                    <label>
                      Site internet
                      <input
                        type="url"
                        value={workspaceSettings.website}
                        onChange={(e) => updateSetting("website", e.target.value)}
                        placeholder="https://www.entreprise.com"
                        autoComplete="url"
                      />
                    </label>
                  </div>
                </article>
              </div>
            )}

            {/* TAB 3: Règles de Facturation */}
            {activeTab === "billing" && (
              <div className="tools-tab-content">
                {/* Financial Defaults Card */}
                <article className="tools-card">
                  <div className="tools-card-head">
                    <div>
                      <h3>Valeurs par défaut des factures</h3>
                      <p>Paramètres pré-remplis lors de la création d’un nouveau document.</p>
                    </div>
                  </div>

                  <div className="tools-form-grid">
                    <label className="tools-form-wide">
                      Devise par défaut
                      <div className="tools-currency-selector">
                        {CURRENCIES.map((curr) => {
                          const isSelected = workspaceSettings.defaultCurrency === curr.code;
                          return (
                            <button
                              key={curr.code}
                              type="button"
                              className={`tools-currency-pill ${isSelected ? "selected" : ""}`}
                              onClick={() => updateSetting("defaultCurrency", curr.code)}
                            >
                              <span className="curr-sym">{curr.symbol}</span>
                              <span className="curr-code">{curr.code}</span>
                              <span className="curr-name">{curr.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      <small>La devise sélectionnée par défaut pour vos nouvelles factures.</small>
                    </label>

                    <div className="tools-form-wide">
                      <div className="tools-vat-toggle-card">
                        <div className="tools-vat-toggle-head">
                          <div>
                            <span className="tools-vat-toggle-title">Ligne TVA sur les factures et tickets</span>
                            <p className="tools-vat-toggle-desc">
                              Activez ou désactivez l’affichage et le calcul de la TVA sur vos documents.
                            </p>
                          </div>
                          <div className="tools-toggle-buttons">
                            <button
                              type="button"
                              className={`tools-toggle-btn ${isVatActive ? "active" : ""}`}
                              onClick={() => {
                                if (!isVatActive) {
                                  updateSetting("vatRate", lastActiveVatRef.current || "20");
                                }
                              }}
                            >
                              Active
                            </button>
                            <button
                              type="button"
                              className={`tools-toggle-btn ${!isVatActive ? "active" : ""}`}
                              onClick={() => {
                                if (isVatActive) {
                                  lastActiveVatRef.current = workspaceSettings.vatRate;
                                  updateSetting("vatRate", "0");
                                }
                              }}
                            >
                              Inactive
                            </button>
                          </div>
                        </div>

                        {isVatActive ? (
                          <div className="tools-vat-active-row">
                            <label>
                              Taux de TVA standard (%)
                              <div className="tools-input-suffix-wrap">
                                <input
                                  type="number"
                                  min="0.1"
                                  max="100"
                                  step="0.1"
                                  value={workspaceSettings.vatRate}
                                  onChange={(e) => updateSetting("vatRate", e.target.value)}
                                  placeholder="20"
                                />
                                <span className="tools-input-suffix">%</span>
                              </div>
                              <small>Exemple : 16% (RDC) ou 20% (France). La ligne TVA sera visible sur les factures et tickets.</small>
                            </label>
                          </div>
                        ) : (
                          <div className="tools-vat-inactive-note">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                            <span>La ligne TVA est désactivée. Les factures et tickets afficheront directement le montant net total sans le détail de TVA.</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <label>
                      Préfixe de numérotation
                      <input
                        type="text"
                        value={workspaceSettings.invoicePrefix}
                        onChange={(e) => updateSetting("invoicePrefix", e.target.value.toUpperCase())}
                        maxLength={10}
                        placeholder="FAC"
                      />
                      <small>Ex. FAC donne : {workspaceSettings.invoicePrefix || "FAC"}-{new Date().getFullYear()}-0001</small>
                    </label>

                    <label className="tools-form-wide">
                      Délai de paiement (jours)
                      <div className="tools-input-suffix-wrap">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={workspaceSettings.paymentTermsDays}
                          onChange={(e) => updateSetting("paymentTermsDays", e.target.value)}
                          placeholder="30"
                        />
                        <span className="tools-input-suffix">jours</span>
                      </div>
                      <small>Définit automatiquement la date d’échéance après la date d’émission.</small>
                    </label>
                  </div>
                </article>

                {/* Recap Card */}
                <article className="tools-card tools-card-highlight">
                  <div className="tools-card-head">
                    <div>
                      <h3>Synthèse de la configuration</h3>
                      <p>Aperçu des règles appliquées aux futures créations de documents.</p>
                    </div>
                  </div>
                  <div className="tools-summary-grid">
                    <div className="summary-item">
                      <span>Prochain numéro estimé</span>
                      <strong>{previewInvoiceNumber}</strong>
                    </div>
                    <div className="summary-item">
                      <span>Devise active</span>
                      <strong>{workspaceSettings.defaultCurrency} ({CURRENCIES.find((c) => c.code === workspaceSettings.defaultCurrency)?.symbol || ""})</strong>
                    </div>
                    <div className="summary-item">
                      <span>Taxe par défaut</span>
                      <strong>{isVatActive ? `TVA ${workspaceSettings.vatRate}% · active` : "TVA inactive"}</strong>
                    </div>
                    <div className="summary-item">
                      <span>Condition d’échéance</span>
                      <strong>
                        {Number(workspaceSettings.paymentTermsDays || 0) === 0
                          ? "Comptant (à réception)"
                          : `${workspaceSettings.paymentTermsDays} jours nets`}
                      </strong>
                    </div>
                  </div>
                </article>
              </div>
            )}
          </div>

          {/* Right Column: Live Document Preview */}
          <aside className="tools-preview-sidebar">
            <div className="tools-preview-panel">
              <div className="tools-preview-panel-head">
                <div className="preview-title-row">
                  <span className="live-pill">
                    <span className="live-pill-dot" aria-hidden="true" />
                    En direct
                  </span>
                  <h3>Aperçu des documents</h3>
                </div>

                <div className="preview-format-switcher" role="tablist" aria-label="Format du document">
                  <button
                    type="button"
                    className={`format-btn ${previewFormat === "a4" ? "active" : ""}`}
                    onClick={() => setPreviewFormat("a4")}
                    aria-selected={previewFormat === "a4"}
                  >
                    Facture A4
                  </button>
                  <button
                    type="button"
                    className={`format-btn ${previewFormat === "thermal" ? "active" : ""}`}
                    onClick={() => setPreviewFormat("thermal")}
                    aria-selected={previewFormat === "thermal"}
                  >
                    Ticket 80mm
                  </button>
                </div>
              </div>

              {/* A4 Invoice Preview */}
              {previewFormat === "a4" && (
                <div className="preview-sheet preview-sheet-a4">
                  <div className="a4-header-top">
                    <div className="a4-brand">
                      {workspaceSettings.logoDataUrl ? (
                        <img
                          src={workspaceSettings.logoDataUrl}
                          alt="Logo entreprise"
                          className="a4-logo"
                        />
                      ) : (
                        <div className="a4-logo-placeholder">
                          <span>{(workspaceSettings.companyName || "ME").slice(0, 2).toUpperCase()}</span>
                        </div>
                      )}
                      <div>
                        <h4 className="a4-company-name">{workspaceSettings.companyName || "Nom de l’entreprise"}</h4>
                        {workspaceSettings.businessSector && (
                          <span className="a4-company-sector">{workspaceSettings.businessSector}</span>
                        )}
                      </div>
                    </div>

                    <div className="a4-invoice-meta">
                      <span className="a4-meta-badge">FACTURE</span>
                      <strong>{previewInvoiceNumber}</strong>
                      <span className="a4-meta-date">Date : {formatISODate(today)}</span>
                      <span className="a4-meta-due">Échéance : {formatISODate(previewDueDate)}</span>
                    </div>
                  </div>

                  <div className="a4-divider" />

                  <div className="a4-header-details">
                    <div className="a4-details-block">
                      <span className="a4-detail-label">Émetteur</span>
                      <p className="a4-detail-value">{formattedAddress || "Adresse non renseignée"}</p>
                      {formattedContact && <p className="a4-detail-sub">{formattedContact}</p>}
                    </div>
                    <div className="a4-details-block right">
                      <span className="a4-detail-label">Client (exemple)</span>
                      <p className="a4-detail-value">Client Démo S.A.</p>
                      <p className="a4-detail-sub">Kinshasa · RD Congo</p>
                    </div>
                  </div>

                  {/* Sample items snippet */}
                  <div className="a4-sample-items">
                    <div className="a4-table-head">
                      <span>Description</span>
                      <span className="text-right">Total HT</span>
                    </div>
                    <div className="a4-table-row">
                      <span>Prestation de service (modèle)</span>
                      <span className="text-right">{money(sampleSubtotalHT, currentCurrency)}</span>
                    </div>
                  </div>

                  <div className="a4-totals-box">
                    {isVatActive ? <>
                      <div className="a4-total-row"><span>Sous-total HT</span><strong>{money(sampleSubtotalHT, currentCurrency)}</strong></div>
                      <div className="a4-total-row"><span>TVA ({workspaceSettings.vatRate}%)</span><strong>{money(sampleTax, currentCurrency)}</strong></div>
                      <div className="a4-total-row grand-total"><span>Total TTC</span><strong>{money(sampleTotalTTC, currentCurrency)}</strong></div>
                    </> : <div className="a4-total-row grand-total"><span>Total net à payer</span><strong>{money(sampleSubtotalHT, currentCurrency)}</strong></div>}
                  </div>

                  {formattedLegal && (
                    <div className="a4-footer-legal">
                      <span>{formattedLegal}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Thermal Ticket Preview */}
              {previewFormat === "thermal" && (
                <div className="preview-sheet preview-sheet-thermal">
                  <div className="thermal-brand">
                    {workspaceSettings.logoDataUrl && (
                      <img
                        src={workspaceSettings.logoDataUrl}
                        alt="Logo entreprise"
                        className="thermal-logo"
                      />
                    )}
                    <h4 className="thermal-name">{workspaceSettings.companyName || "NOM ENTREPRISE"}</h4>
                    {workspaceSettings.businessSector && (
                      <span className="thermal-sub">{workspaceSettings.businessSector}</span>
                    )}
                    {formattedAddress && <p className="thermal-info">{formattedAddress}</p>}
                    {formattedContact && <p className="thermal-info">{formattedContact}</p>}
                  </div>

                  <div className="thermal-dashed-divider" />

                  <div className="thermal-meta">
                    <div className="thermal-meta-line">
                      <span>DOC : FACTURE</span>
                      <span>{previewInvoiceNumber}</span>
                    </div>
                    <div className="thermal-meta-line">
                      <span>DATE</span>
                      <span>{formatISODate(today)}</span>
                    </div>
                    <div className="thermal-meta-line">
                      <span>CAISSE</span>
                      <span>PRINCIPALE</span>
                    </div>
                  </div>

                  <div className="thermal-dashed-divider" />

                  <div className="thermal-items">
                    <div className="thermal-item-row">
                      <span>Prestation comptoir x1</span>
                      <span>{money(sampleSubtotalHT, currentCurrency)}</span>
                    </div>
                  </div>

                  <div className="thermal-dashed-divider" />

                  <div className="thermal-totals">
                    {isVatActive ? <>
                      <div className="thermal-total-line"><span>TOTAL HT</span><span>{money(sampleSubtotalHT, currentCurrency)}</span></div>
                      <div className="thermal-total-line"><span>TVA ({workspaceSettings.vatRate}%)</span><span>{money(sampleTax, currentCurrency)}</span></div>
                      <div className="thermal-total-line highlight"><strong>TOTAL TTC</strong><strong>{money(sampleTotalTTC, currentCurrency)}</strong></div>
                    </> : <div className="thermal-total-line highlight"><strong>TOTAL NET À PAYER</strong><strong>{money(sampleSubtotalHT, currentCurrency)}</strong></div>}
                  </div>

                  {formattedLegal && (
                    <>
                      <div className="thermal-dashed-divider" />
                      <div className="thermal-legal">
                        <p>{formattedLegal}</p>
                        <p className="thermal-thanks">Merci pour votre confiance !</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              <p className="preview-note">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                Cet aperçu dynamique reflète en temps réel vos données officielles telles qu’elles apparaîtront lors de l’impression ou du téléchargement PDF.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {canReset && (
        <OverlayDialog
          title="Réinitialiser les paramètres"
          open={resetDialogOpen}
          onClose={() => setResetDialogOpen(false)}
        >
          <div className="stack-form">
            <p>
              Les coordonnées de l’entreprise, le logo et les paramètres de facturation par défaut
              seront remis à leurs valeurs d’origine.
            </p>
            <p className="dialog-note">
              <strong>Remarque :</strong> Vos factures existantes, vos clients et vos utilisateurs ne seront pas modifiés.
            </p>
            <div className="hero-actions tool-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setResetDialogOpen(false)}
              >
                Annuler
              </button>
              <button
                className="primary-button danger"
                type="button"
                onClick={() => {
                  resetWorkspaceSettings();
                  setResetDialogOpen(false);
                }}
              >
                Confirmer la réinitialisation
              </button>
            </div>
          </div>
        </OverlayDialog>
      )}
    </div>
  );
}
