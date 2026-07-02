import { useWorkspace } from "../WorkspaceProvider";
import { OverlayDialog, SectionHeader, Table } from "../ui";

export function UsersPage() {
  const { data, forms, setForms, editor, beginCreateUser, beginEditUser, saveUser, removeUser, loading, closeEditor } = useWorkspace();

  const rows = data.users.map((item) => [
    item.name,
    item.email,
    item.role,
    <div key={`${item.id}-actions`} className="row-actions">
      <button type="button" className="text-button" onClick={() => beginEditUser(item)}>
        Modifier
      </button>
      <button type="button" className="text-button danger" onClick={() => removeUser(item.id)} disabled={loading}>
        Supprimer
      </button>
    </div>
  ]);

  const isEditing = editor.kind === "user" && Boolean(editor.id);

  return (
    <>
      <header className="hero">
        <div>
          <span className="eyebrow">Administration</span>
          <h1>Utilisateurs</h1>
          <p>Gestion des comptes internes et des rôles applicatifs.</p>
        </div>
        <div className="hero-actions">
          <button className="secondary-button" type="button" onClick={beginCreateUser}>
            Nouvel utilisateur
          </button>
        </div>
      </header>

      <section className="content-grid">
        <div className="panel">
          <SectionHeader title="Liste utilisateurs" action="Comptes connectés à l’instance interne." />
          <Table columns={["Nom", "Email", "Rôle", "Actions"]} rows={rows} />
        </div>
      </section>

      <OverlayDialog
        open={editor.kind === "user"}
        title={isEditing ? "Modifier utilisateur" : "Créer utilisateur"}
        description="Définir l’identité et les droits."
        onClose={closeEditor}
        footer={
          <button className="primary-button" type="submit" form="user-form" disabled={loading}>
            {isEditing ? "Enregistrer" : "Créer utilisateur"}
          </button>
        }
      >
        <form id="user-form" className="stack-form" onSubmit={(event) => { event.preventDefault(); saveUser(); }}>
          <label>
            Nom
            <input
              value={forms.user.name}
              onChange={(event) => setForms((current) => ({
                ...current,
                user: { ...current.user, name: event.target.value }
              }))}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={forms.user.email}
              onChange={(event) => setForms((current) => ({
                ...current,
                user: { ...current.user, email: event.target.value }
              }))}
            />
          </label>
          <label>
            Rôle
            <select
              value={forms.user.role}
              onChange={(event) => setForms((current) => ({
                ...current,
                user: { ...current.user, role: event.target.value }
              }))}
            >
              <option value="user">Utilisateur</option>
              <option value="admin">Administrateur</option>
              <option value="finance">Finance</option>
              <option value="sales">Ventes</option>
            </select>
          </label>
          <label>
            Mot de passe
            <input
              value={forms.user.passwordHash}
              onChange={(event) => setForms((current) => ({
                ...current,
                user: { ...current.user, passwordHash: event.target.value }
              }))}
            />
          </label>
        </form>
      </OverlayDialog>
    </>
  );
}
