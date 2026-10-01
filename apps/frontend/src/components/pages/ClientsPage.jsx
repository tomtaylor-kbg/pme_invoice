import { useEffect, useState } from "react";
import { useWorkspace } from "../WorkspaceProvider";
import { OverlayActionButton, OverlayDialog, OverlaySaveIcon, Table, TableAction } from "../ui";
import { buildClientsCsv, clientTypeLabel, downloadTextFile, localDateStamp } from "../../utils/formatters";
import { buildClientPrintHtml } from "../../utils/print/clientPrintA4";
import { getOrders } from "../../api";

export function ClientsPage() {
  const { token, data, forms, setForms, editor, beginCreateClient, beginEditClient, saveClient, removeClient, loading, closeEditor, user, workspaceSettings } = useWorkspace();
  const canEditRecords = user?.role === "admin";
  const canDeleteRecords = user?.role === "admin";

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orders, setOrders] = useState([]);

  const isEditing = editor.kind === "client" && Boolean(editor.id);
  const isCompany = forms.client.clientType === "company";
  const fullName = `${forms.client.firstName || ""} ${forms.client.lastName || ""}`.trim();

  function updateFullName(value) {
    const parts = value.trim().split(/\s+/).filter(Boolean);
    setForms((current) => ({ ...current, client: { ...current.client, firstName: parts.shift() || "", lastName: parts.join(" ") } }));
  }

  useEffect(() => {
    let cancelled = false;
    getOrders(token).then((items) => {
      if (!cancelled) setOrders(items);
    }).catch(() => {
      if (!cancelled) setOrders([]);
    });
    return () => { cancelled = true; };
  }, [token]);

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
      const typeMatch = String(client.clientType || "").toLowerCase().includes(query);
      return nameMatch || companyMatch || emailMatch || phoneMatch || cityMatch || typeMatch;
    }
    return true;
  });

  function exportClientsCsv() {
    const filename = `clients-${localDateStamp()}.csv`;
    downloadTextFile(filename, buildClientsCsv(filteredClients), "text/csv;charset=utf-8");
  }

  function openClientSheet(client) {
    const previewWindow = window.open("", "_blank");
    if (!previewWindow) return;
    previewWindow.document.open();
    previewWindow.document.write(buildClientPrintHtml({ client, settings: workspaceSettings, orders, invoices: data.invoices }));
    previewWindow.document.close();
    previewWindow.focus();
  }

  return (
    <div className="page-shell clients-page">
      <header className="hero list-page-header">
        <div>
          <span className="eyebrow">CRM</span>
          <h1>Clients</h1>
        </div>
        <div className="hero-actions">
          <button className="primary-button list-action-button" type="button" onClick={beginCreateClient}>
            Nouveau client
          </button>
          <button className="secondary-button" type="button" onClick={exportClientsCsv}>
            Export CSV
          </button>
        </div>
      </header>

      <div className="page-scroll">
        <section className="list-view-content">
            <div className="filters-panel list-filters">
              <div className="filters-grid clients">
                <label className="filter-field search">
                Rechercher client
                <input
                  className="filter-input"
                  type="text"
                  placeholder="Nom, société, ville, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                </label>
                <label className="filter-field">
                Statut
                <select
                  className="filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Tous les statuts</option>
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                </select>
                </label>
              </div>
            </div>

            {filteredClients.length > 0 ? <div className="panel entity-list-panel"><Table className="entity-list-table clients-table" columns={["Client", "Type", "Email", "Téléphone", "Ville", "Statut", "Actions"]} rows={filteredClients.map((client) => [
              <div className="table-primary-cell"><strong>{client.clientType === "company" ? client.company || "Entité" : `${client.firstName} ${client.lastName}`.trim() || "Client"}</strong>{client.clientType === "company" && (client.firstName || client.lastName) ? <small>Contact : {[client.firstName, client.lastName].filter(Boolean).join(" ")}</small> : null}</div>,
              clientTypeLabel(client.clientType),
              client.email || "—",
              client.phone || "—",
              client.city || "—",
              <span className={`badge ${client.status === "active" ? "actif" : "inactif"}`}>{client.status === "active" ? "Actif" : "Inactif"}</span>,
              <div className="table-row-actions"><TableAction icon="open" label="Ouvrir la fiche" onClick={() => openClientSheet(client)} />{canEditRecords && <TableAction icon="edit" label="Modifier" onClick={() => beginEditClient(client)} />}{canDeleteRecords && <TableAction icon="delete" label="Supprimer" danger onClick={() => removeClient(client.id)} disabled={loading} />}</div>
            ])} /></div> : <div className="empty-card-state">Aucun client ne correspond à vos critères.</div>}
        </section>
      </div>

      <OverlayDialog
        open={editor.kind === "client"}
        title={isEditing ? "Modifier client" : "Créer un client"}
        onClose={closeEditor}
        topbarActions={
          <OverlayActionButton
            icon={<OverlaySaveIcon />}
            className="primary-button overlay-save-button"
            type="submit"
            form="client-form"
            disabled={loading}
          >
            {isEditing ? "Enregistrer" : "Créer le client"}
          </OverlayActionButton>
        }
        >
        <form id="client-form" className="stack-form client-form-grid" onSubmit={(event) => { event.preventDefault(); saveClient(); }}>
          <fieldset className="client-type-field client-form-span-2">
            <legend>Type de client</legend>
            <div className="client-type-switch" role="group" aria-label="Type de client">
              <button type="button" className={!isCompany ? "active" : ""} aria-pressed={!isCompany} onClick={() => setForms((current) => ({ ...current, client: { ...current.client, clientType: "individual" } }))}>Personne</button>
              <button type="button" className={isCompany ? "active" : ""} aria-pressed={isCompany} onClick={() => setForms((current) => ({ ...current, client: { ...current.client, clientType: "company" } }))}>Entité</button>
            </div>
          </fieldset>
          {isCompany ? <>
            <label className="client-form-field client-form-span-2">
              Nom de l’entité
              <input required value={forms.client.company} onChange={(event) => setForms((current) => ({ ...current, client: { ...current.client, company: event.target.value } }))} />
            </label>
            <div className="client-form-section client-form-span-2">Contact de l’entité <span>Facultatif</span></div>
            <label className="client-form-field">
              Prénom du contact
              <input value={forms.client.firstName} onChange={(event) => setForms((current) => ({ ...current, client: { ...current.client, firstName: event.target.value } }))} />
            </label>
            <label className="client-form-field">
              Nom du contact
              <input value={forms.client.lastName} onChange={(event) => setForms((current) => ({ ...current, client: { ...current.client, lastName: event.target.value } }))} />
            </label>
          </> : <label className="client-form-field client-form-span-2">
            Nom complet
            <input required value={fullName} onChange={(event) => updateFullName(event.target.value)} placeholder="Prénom et nom" />
          </label>}
          <label className="client-form-field">
            {isCompany ? "Email du contact" : "Email"}
            <input
              type="email"
              required={false}
              value={forms.client.email}
              onChange={(event) => setForms((current) => ({
                ...current,
                client: { ...current.client, email: event.target.value }
              }))}
            />
          </label>
          <label className="client-form-field">
            Ville
            <input
              value={forms.client.city}
              onChange={(event) => setForms((current) => ({
                ...current,
                client: { ...current.client, city: event.target.value }
              }))}
            />
          </label>
          <label className="client-form-field">
            Téléphone
            <input
              value={forms.client.phone}
              onChange={(event) => setForms((current) => ({
                ...current,
                client: { ...current.client, phone: event.target.value }
              }))}
            />
          </label>
          <label className="client-form-field client-form-span-2">
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
