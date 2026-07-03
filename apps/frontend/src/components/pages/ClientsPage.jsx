import { useState } from "react";
import { useWorkspace } from "../WorkspaceProvider";
import { ClientCard, OverlayDialog, SectionHeader } from "../ui";
import { buildClientsCsv, downloadTextFile } from "../../utils/formatters";

export function ClientsPage() {
  const { data, forms, setForms, editor, beginCreateClient, beginEditClient, saveClient, removeClient, loading, closeEditor } = useWorkspace();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const isEditing = editor.kind === "client" && Boolean(editor.id);

  const filteredClients = data.clients.filter((client) => {
    if (statusFilter !== "all" && client.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const nameMatch = `${client.firstName} ${client.lastName}`.toLowerCase().includes(query);
      const companyMatch = String(client.company || "").toLowerCase().includes(query);
      const emailMatch = String(client.email || "").toLowerCase().includes(query);
      const phoneMatch = String(client.phone || "").toLowerCase().includes(query);
      const cityMatch = String(client.city || "").toLowerCase().includes(query);
      return nameMatch || companyMatch || emailMatch || phoneMatch || cityMatch;
    }
    return true;
  });

  function exportClientsCsv() {
    const filename = `clients-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadTextFile(filename, buildClientsCsv(filteredClients), "text/csv;charset=utf-8");
  }

  return (
    <div className="page-shell clients-page">
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
          <button className="secondary-button" type="button" onClick={exportClientsCsv}>
            Export CSV
          </button>
        </div>
      </header>

      <div className="page-scroll">
        <section className="content-grid clients-layout">
          <div className="panel">
            <SectionHeader title="Contacts" action="Chaque carte met la personne au premier plan." />
            <div className="filter-bar" style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "24px", background: "#f8fafc", padding: "16px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
              <label style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: "600", color: "#475569" }}>
                Rechercher client
                <input
                  type="text"
                  placeholder="Nom, société, ville, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: "normal" }}
                />
              </label>
              <label style={{ flex: "0 1 200px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: "600", color: "#475569" }}>
                Statut
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", fontWeight: "normal", background: "#fff" }}
                >
                  <option value="all">Tous les statuts</option>
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                </select>
              </label>
            </div>

            <div className="card-grid">
              {filteredClients.length > 0 ? (
                filteredClients.map((client) => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    loading={loading}
                    onEdit={() => beginEditClient(client)}
                    onDelete={() => removeClient(client.id)}
                  />
                ))
              ) : (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px 20px", color: "#64748b", background: "#f8fafc", borderRadius: "14px", border: "1px dashed #cbd5e1" }}>
                  Aucun contact ne correspond à vos critères.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <OverlayDialog
        open={editor.kind === "client"}
        title={isEditing ? "Modifier contact" : "Créer contact"}
        description="Saisie courte et orientée personne."
        onClose={closeEditor}
        footer={
          <button className="primary-button" type="submit" form="client-form" disabled={loading}>
            {isEditing ? "Enregistrer" : "Créer contact"}
          </button>
        }
        >
        <form id="client-form" className="stack-form" onSubmit={(event) => { event.preventDefault(); saveClient(); }}>
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
        </form>
      </OverlayDialog>
    </div>
  );
}
