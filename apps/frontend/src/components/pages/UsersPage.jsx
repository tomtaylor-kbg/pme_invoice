import { useWorkspace } from "../WorkspaceProvider";
import { OverlayActionButton, OverlayDialog, OverlaySaveIcon, SectionHeader } from "../ui";

const roleLabels = { admin: "Administrateur", director: "Directeur", receptionist: "Réceptionniste", accountant: "Comptable", order_manager: "Gestionnaire des commandes", order_operator: "Opérateur de commande" };
const statusLabels = { active: "Actif", inactive: "Inactif" };

export function UsersPage() {
  const { data, forms, setForms, editor, beginCreateUser, beginEditUser, saveUser, removeUser, loading, closeEditor } = useWorkspace();

  const isEditing = editor.kind === "user" && Boolean(editor.id);

  return (
    <div className="page-shell users-page">
      <header className="hero list-page-header">
        <div>
          <span className="eyebrow">Administration</span>
          <h1>Utilisateurs</h1>
          <p>Gérez les accès et les rôles de l’espace de travail.</p>
        </div>
        <div className="hero-actions">
          <button className="primary-button" type="button" onClick={beginCreateUser}>
            Nouvel utilisateur
          </button>
        </div>
      </header>

      <div className="page-scroll">
        <section className="panel users-panel">
          <SectionHeader title="Utilisateurs de l’espace" />
          <div className="users-grid">
            {data.users.length ? data.users.map((item) => (
              <article className="user-card" key={item.id}>
                <div className="user-card-head">
                  <span className="user-avatar" aria-hidden="true">{String(item.name || item.email || "U").trim().slice(0, 1).toUpperCase()}</span>
                  <div className="user-card-copy">
                    <strong>{item.name || "Utilisateur"}</strong>
                    <span>Identifiant : {item.username}</span>
                    <span>{item.email}</span>
                  </div>
                </div>
                <span className={`user-role role-${item.role}`}>{roleLabels[item.role] || roleLabels.order_operator}</span>
                <span className={`user-status user-status-${item.status === "inactive" ? "inactive" : "active"}`}>{statusLabels[item.status] || statusLabels.active}</span>
                <div className="user-card-actions">
                  <button type="button" className="text-button" onClick={() => beginEditUser(item)}>Modifier</button>
                  <button type="button" className="text-button danger" onClick={() => removeUser(item.id)} disabled={loading}>Supprimer</button>
                </div>
              </article>
            )) : <div className="empty-state">Aucun utilisateur enregistré.</div>}
          </div>
        </section>
      </div>

      <OverlayDialog
        open={editor.kind === "user"}
        title={isEditing ? "Modifier utilisateur" : "Créer utilisateur"}
        onClose={closeEditor}
        topbarActions={
          <OverlayActionButton
            icon={<OverlaySaveIcon />}
            className="primary-button overlay-save-button"
            type="submit"
            form="user-form"
            disabled={loading}
          >
            {isEditing ? "Enregistrer" : "Créer utilisateur"}
          </OverlayActionButton>
        }
        >
        <form id="user-form" className="stack-form" onSubmit={(event) => { event.preventDefault(); saveUser(); }}>
          <label>
            Nom d’utilisateur (identifiant de connexion)
            <input
              autoComplete="username"
              value={forms.user.username}
              onChange={(event) => setForms((current) => ({
                ...current,
                user: { ...current.user, username: event.target.value }
              }))}
            />
          </label>
          <label>
            Nom et prénom
            <input
              value={forms.user.name}
              onChange={(event) => setForms((current) => ({
                ...current,
                user: { ...current.user, name: event.target.value }
              }))}
            />
          </label>
          <label>
            Email <span className="field-hint">facultatif</span>
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
              <option value="order_manager">Gestionnaire des commandes</option>
              <option value="order_operator">Opérateur de commande</option>
              <option value="admin">Administrateur</option>
              <option value="director">Directeur</option>
              <option value="receptionist">Réceptionniste</option>
              <option value="accountant">Comptable</option>
            </select>
          </label>
          <label>
            Statut
            <select
              value={forms.user.status}
              onChange={(event) => setForms((current) => ({
                ...current,
                user: { ...current.user, status: event.target.value }
              }))}
            >
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
            </select>
          </label>
          <label>
            Mot de passe
            <input
              type="password"
              autoComplete={isEditing ? "new-password" : "new-password"}
              value={forms.user.passwordHash}
              onChange={(event) => setForms((current) => ({
                ...current,
                user: { ...current.user, passwordHash: event.target.value }
              }))}
            />
          </label>
        </form>
      </OverlayDialog>
    </div>
  );
}
