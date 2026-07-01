import { useEffect } from "react";
import { useWorkspace } from "../WorkspaceProvider";
import { ClientCard, SectionHeader } from "../ui";

export function ClientsPage() {
  const { data, forms, setForms, editor, beginCreateClient, beginEditClient, saveClient, removeClient, loading } = useWorkspace();

  useEffect(() => {
    if (editor.kind !== "client") {
      beginCreateClient();
    }
  }, [beginCreateClient, editor.kind]);

  const isEditing = editor.kind === "client" && Boolean(editor.id);

  return (
    <>
      <header className="hero">
        <div>
          <span className="eyebrow">CRM</span>
          <h1>Clients</h1>
          <p>Gestion des personnes, de leurs coordonnées et de leur société éventuelle.</p>
        </div>
        <div className="hero-actions">
          <button className="secondary-button" type="button" onClick={beginCreateClient}>
            Nouveau contact
          </button>
        </div>
      </header>

      <section className="content-grid clients-layout">
        <div className="panel">
          <SectionHeader title="Contacts" action="Chaque carte met la personne au premier plan." />
          <div className="card-grid">
            {data.clients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                loading={loading}
                onEdit={() => beginEditClient(client)}
                onDelete={() => removeClient(client.id)}
              />
            ))}
          </div>
        </div>

        <div className="panel panel-side">
          <SectionHeader title={isEditing ? "Modifier contact" : "Créer contact"} action="Saisie courte et orientée personne." />
          <form className="stack-form" onSubmit={(event) => { event.preventDefault(); saveClient(); }}>
            <label>
              Prénom
              <input
                value={forms.client.firstName}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  client: { ...current.client, firstName: event.target.value }
                }))}
              />
            </label>
            <label>
              Nom
              <input
                value={forms.client.lastName}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  client: { ...current.client, lastName: event.target.value }
                }))}
              />
            </label>
            <label>
              Société
              <input
                value={forms.client.company}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  client: { ...current.client, company: event.target.value }
                }))}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={forms.client.email}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  client: { ...current.client, email: event.target.value }
                }))}
              />
            </label>
            <label>
              Ville
              <input
                value={forms.client.city}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  client: { ...current.client, city: event.target.value }
                }))}
              />
            </label>
            <label>
              Téléphone
              <input
                value={forms.client.phone}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  client: { ...current.client, phone: event.target.value }
                }))}
              />
            </label>
            <label>
              Statut
              <select
                value={forms.client.status}
                onChange={(event) => setForms((current) => ({
                  ...current,
                  client: { ...current.client, status: event.target.value }
                }))}
              >
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </label>
            <button className="primary-button" type="submit" disabled={loading}>
              {isEditing ? "Enregistrer" : "Créer contact"}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
