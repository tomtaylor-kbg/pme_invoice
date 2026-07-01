import { useEffect } from "react";
import { useWorkspace } from "../WorkspaceProvider";
import { ReceiptCard, ReceiptPreview, SectionHeader } from "../ui";

export function ReceiptsPage() {
  const { data, forms, setForms, editor, beginCreateReceipt, beginEditReceipt, saveReceipt, removeReceipt, loading } = useWorkspace();

  useEffect(() => {
    if (editor.kind !== "receipt") {
      beginCreateReceipt();
    }
  }, [beginCreateReceipt, editor.kind]);

  const isEditing = editor.kind === "receipt" && Boolean(editor.id);

  return (
    <>
      <header className="hero">
        <div>
          <span className="eyebrow">Thermique</span>
          <h1>Reçus</h1>
          <p>Modèles compacts pour imprimantes thermiques en 58 mm et 80 mm.</p>
        </div>
        <div className="hero-actions">
          <button className="secondary-button" type="button" onClick={beginCreateReceipt}>
            Nouveau modèle
          </button>
        </div>
      </header>

      <section className="content-grid receipts-layout">
        <div className="panel">
          <SectionHeader title="Modèles" action="Cartes de rendu prêtes pour les tickets thermiques." />
          <div className="card-grid receipts-grid">
            {data.receipts.map((receipt) => (
              <ReceiptCard
                key={receipt.id}
                receipt={receipt}
                loading={loading}
                onEdit={() => beginEditReceipt(receipt)}
                onDelete={() => removeReceipt(receipt.id)}
              />
            ))}
          </div>
        </div>

        <div className="panel panel-side">
          <SectionHeader title={isEditing ? "Modifier modèle" : "Créer modèle"} action="Paramètres imprimables et aperçu du ticket." />
          <form className="stack-form" onSubmit={(event) => { event.preventDefault(); saveReceipt(); }}>
            <label>
              Nom du modèle
              <input
                value={forms.receipt.name}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  receipt: { ...current.receipt, name: event.target.value }
                }))}
              />
            </label>
            <label>
              Titre
              <input
                value={forms.receipt.title}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  receipt: { ...current.receipt, title: event.target.value }
                }))}
              />
            </label>
            <label>
              Sous-titre
              <input
                value={forms.receipt.subtitle}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  receipt: { ...current.receipt, subtitle: event.target.value }
                }))}
              />
            </label>
            <label>
              Largeur papier
              <select
                value={forms.receipt.paperWidthMm}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  receipt: { ...current.receipt, paperWidthMm: Number(event.target.value) }
                }))}
              >
                <option value={58}>58 mm</option>
                <option value={80}>80 mm</option>
              </select>
            </label>
            <label>
              Pied de ticket
              <input
                value={forms.receipt.footerText}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  receipt: { ...current.receipt, footerText: event.target.value }
                }))}
              />
            </label>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={forms.receipt.showTax}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  receipt: { ...current.receipt, showTax: event.target.checked }
                }))}
              />
              TVA affichée
            </label>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={forms.receipt.showLogo}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  receipt: { ...current.receipt, showLogo: event.target.checked }
                }))}
              />
              Logo affiché
            </label>
            <label>
              Statut
              <select
                value={forms.receipt.status}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  receipt: { ...current.receipt, status: event.target.value }
                }))}
              >
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </label>
            <button className="primary-button" type="submit" disabled={loading}>
              {isEditing ? "Enregistrer" : "Créer modèle"}
            </button>
          </form>

          <div className="receipt-live">
            <SectionHeader title="Aperçu" action="Rendu de travail à partir du formulaire courant." />
            <ReceiptPreview receipt={forms.receipt} />
          </div>
        </div>
      </section>
    </>
  );
}
