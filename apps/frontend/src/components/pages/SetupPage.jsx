import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useWorkspace } from "../WorkspaceProvider";

const CURRENCIES = ["CDF", "USD", "EUR"];

export function SetupPage() {
  const { token, user, workspaceSettings, saveWorkspaceSettingsNow, notifySuccess, logout } = useWorkspace();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formSettings, setFormSettings] = useState(workspaceSettings);
  const navigate = useNavigate();
  const canConfigure = ["admin", "director"].includes(user?.role);

  useEffect(() => {
    if (user && !workspaceSettings.setupCompleted) setFormSettings(workspaceSettings);
  }, [user?.id]);

  if (!token) return <Navigate to="/login" replace />;
  if (workspaceSettings.setupCompleted) return <Navigate to="/dashboard" replace />;

  function update(field, value) {
    setFormSettings((current) => ({ ...current, [field]: value }));
  }

  function loadLogo(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 400 * 1024) {
      setError("Choisissez un logo PNG, JPEG ou WebP de 400 Ko maximum.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update("logoDataUrl", String(reader.result || ""));
    reader.onerror = () => setError("Le logo n’a pas pu être lu.");
    reader.readAsDataURL(file);
  }

  async function submit(event) {
    event.preventDefault();
    if (!formSettings.companyName.trim()) {
      setError("Le nom de l’établissement est obligatoire.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await saveWorkspaceSettingsNow({ ...formSettings, companyName: formSettings.companyName.trim(), setupCompleted: true });
      notifySuccess("Établissement configuré", "Vous pouvez maintenant utiliser l’espace de travail.");
      navigate("/dashboard", { replace: true });
    } catch (saveError) {
      setError(saveError.message || "La configuration n’a pas pu être enregistrée.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;
  if (!canConfigure) {
    return <main className="setup-page"><section className="setup-card"><span className="eyebrow">Configuration requise</span><h1>Établissement à configurer</h1><p>Un administrateur doit terminer la configuration initiale avant l’accès à l’application.</p><button type="button" className="secondary-button" onClick={logout}>Se déconnecter</button></section></main>;
  }

  return <main className="setup-page">
    <section className="setup-card">
      <div className="setup-heading"><span className="eyebrow">Première configuration</span><h1>Configurer l’établissement</h1><p>Ces informations seront utilisées sur les factures, les pro forma et les bons de sortie.</p></div>
      <form className="setup-form" onSubmit={submit}>
        <section className="setup-section">
          <h2>Identité</h2>
          <div className="tools-form-grid">
            <label><span>Nom de l’établissement <span className="required">*</span></span><input autoFocus required maxLength="160" autoComplete="organization" value={formSettings.companyName} onChange={(event) => update("companyName", event.target.value)} placeholder="" /></label>
            <label>Sigle de l’entreprise<input maxLength="24" autoComplete="organization-title" value={formSettings.companyAcronym} onChange={(event) => update("companyAcronym", event.target.value.toUpperCase())} placeholder="" /><small>Nom affiché dans l’onglet du navigateur.</small></label>
            <label>Secteur d’activité<input maxLength="120" value={formSettings.businessSector} onChange={(event) => update("businessSector", event.target.value)} placeholder="" /></label>
            <label className="setup-form-wide">Logo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={loadLogo} /><small>PNG, JPEG ou WebP, 400 Ko maximum.</small>{formSettings.logoDataUrl && <div className="setup-logo-preview"><img src={formSettings.logoDataUrl} alt="Logo de l’établissement" /><button type="button" className="text-button danger" onClick={() => update("logoDataUrl", "")}>Retirer le logo</button></div>}</label>
          </div>
        </section>

        <section className="setup-section">
          <h2>Coordonnées</h2>
          <div className="tools-form-grid">
            <label className="setup-form-wide">Adresse<input autoComplete="street-address" maxLength="200" value={formSettings.addressLine1} onChange={(event) => update("addressLine1", event.target.value)} /></label>
            <label>Code postal / boîte postale<input autoComplete="postal-code" maxLength="40" value={formSettings.postalCode} onChange={(event) => update("postalCode", event.target.value)} /></label>
            <label>Ville<input autoComplete="address-level2" maxLength="100" value={formSettings.city} onChange={(event) => update("city", event.target.value)} /></label>
            <label>Pays<input autoComplete="country-name" maxLength="100" value={formSettings.country} onChange={(event) => update("country", event.target.value)} /></label>
            <label>Téléphone<input type="tel" autoComplete="tel" maxLength="60" value={formSettings.phone} onChange={(event) => update("phone", event.target.value)} /></label>
            <label>E-mail<input type="email" autoComplete="email" maxLength="160" value={formSettings.email} onChange={(event) => update("email", event.target.value)} /></label>
            <label>Site internet<input type="url" autoComplete="url" maxLength="200" value={formSettings.website} onChange={(event) => update("website", event.target.value)} placeholder="https://" /></label>
          </div>
        </section>

        <section className="setup-section">
          <h2>Facturation</h2>
          <div className="tools-form-grid">
            <label>Devise par défaut<select value={formSettings.defaultCurrency} onChange={(event) => update("defaultCurrency", event.target.value)}>{CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></label>
            <label>Taux de TVA par défaut (%)<input type="number" min="0" max="100" step="0.01" value={formSettings.vatRate} onChange={(event) => update("vatRate", event.target.value)} /></label>
            <label>Préfixe des factures<input required maxLength="12" value={formSettings.invoicePrefix} onChange={(event) => update("invoicePrefix", event.target.value.toUpperCase())} /></label>
            <label>Délai de paiement (jours)<input type="number" min="0" max="365" value={formSettings.paymentTermsDays} onChange={(event) => update("paymentTermsDays", event.target.value)} /></label>
            <label>RCCM<input maxLength="100" value={formSettings.rccm} onChange={(event) => update("rccm", event.target.value)} /></label>
            <label>Id.Nat<input maxLength="100" value={formSettings.idNat} onChange={(event) => update("idNat", event.target.value)} /></label>
            <label className="setup-form-wide">Numéro fiscal<input maxLength="100" value={formSettings.taxNumber} onChange={(event) => update("taxNumber", event.target.value)} /></label>
          </div>
        </section>

        <section className="setup-section">
          <h2>Informations bancaires</h2>
          <div className="tools-form-grid">
            <label>Numéro bancaire<input maxLength="100" value={formSettings.bankNumber1} onChange={(event) => update("bankNumber1", event.target.value)} /></label>
            <label>Numéro bancaire complémentaire<input maxLength="100" value={formSettings.bankNumber2} onChange={(event) => update("bankNumber2", event.target.value)} /></label>
          </div>
        </section>

        {error && <div className="empty-card-state text-danger" role="alert">{error}</div>}
        <div className="setup-actions"><button type="submit" className="primary-button" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer et continuer"}</button></div>
      </form>
    </section>
  </main>;
}
