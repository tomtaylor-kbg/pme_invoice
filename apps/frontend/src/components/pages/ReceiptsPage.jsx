import { useWorkspace } from "../WorkspaceProvider";
import { ReceiptCard, ReceiptPreview, OverlayActionButton, OverlayDialog, OverlaySaveIcon, SectionHeader } from "../ui";

export function ReceiptsPage() {
  const { data, forms, setForms, editor, beginCreateReceipt, beginEditReceipt, saveReceipt, removeReceipt, loading, closeEditor } = useWorkspace();

  const isEditing = editor.kind === "receipt" && Boolean(editor.id);

  return (
    <div className="page-shell receipts-page">
      <header className="hero">
        <div>
          <span className="eyebrow">Thermique</span>
          <h1>Reçus</h1>
        </div>
        <div className="hero-actions">
          <button className="secondary-button" type="button" onClick={beginCreateReceipt}>
            Nouveau modèle
          </button>
        </div>
      </header>

      <div className="page-scroll">
        <section className="content-grid receipts-layout">
          <div className="panel">
            <SectionHeader title="Modèles" />
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
        </section>
      </div>

      <OverlayDialog
        open={editor.kind === "receipt"}
        title={isEditing ? "Modifier modèle" : "Créer modèle"}
        onClose={closeEditor}
        topbarActions={
          <OverlayActionButton
            icon={<OverlaySaveIcon />}
            className="primary-button overlay-save-button"
            type="submit"
            form="receipt-form"
            disabled={loading}
          >
            {isEditing ? "Enregistrer" : "Créer modèle"}
          </OverlayActionButton>
        }
        >
        <form className="stack-form" id="receipt-form" onSubmit={(event) => { event.preventDefault(); saveReceipt(); }}>
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

          <div className="receipt-live">
            <ReceiptPreview receipt={forms.receipt} />
          </div>
        </form>
      </OverlayDialog>
    </div>
  );
}
