import { useEffect, useState } from "react";
import { useWorkspace } from "../WorkspaceProvider";
import { OverlayDialog, Table, TableAction } from "../ui";
import { buildClientsCsv, downloadTextFile, localDateStamp } from "../../utils/formatters";
import { buildClientPrintHtml } from "../../utils/print/clientPrintA4";
import { getOrders } from "../../api";

export function ClientsPage() {
  const { token, data, forms, setForms, editor, beginCreateClient, beginEditClient, saveClient, removeClient, loading, closeEditor, user, workspaceSettings } = useWorkspace();
  const canEditRecords = ["admin", "director"].includes(user?.role);
  const canDeleteRecords = ["admin", "director"].includes(user?.role);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [orders, setOrders] = useState([]);
  const [fullNameDraft, setFullNameDraft] = useState("");
  const [clientAction, setClientAction] = useState(null);
  const [showCompanyContact, setShowCompanyContact] = useState(false);

  const isEditing = editor.kind === "client" && Boolean(editor.id);
  const isCompany = forms.client.clientType === "company";
  useEffect(() => {
    if (editor.kind === "client") {
      setFullNameDraft(`${forms.client.firstName || ""}${forms.client.lastName ? ` ${forms.client.lastName}` : ""}`);
    }
  }, [editor.kind, editor.id]);

  useEffect(() => {
    if (editor.kind === "client") setShowCompanyContact(Boolean(forms.client.firstName || forms.client.lastName || forms.client.email || forms.client.phone));
  }, [editor.kind, editor.id]);

  function updateFullName(value) {
    const normalizedValue = value.replace(/\s+/g, " ");
    const separatorIndex = normalizedValue.indexOf(" ");
    const firstName = separatorIndex === -1 ? normalizedValue : normalizedValue.slice(0, separatorIndex);
    const lastName = separatorIndex === -1 ? "" : normalizedValue.slice(separatorIndex + 1).trimStart();
    setFullNameDraft(normalizedValue);
    setForms((current) => ({ ...current, client: { ...current.client, firstName, lastName } }));
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
    if (typeFilter !== "all" && client.clientType !== typeFilter) return false;
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

  function requestClientAction(client) {
    const linked = Number(client.invoicesCount || 0) > 0 || Number(client.ordersCount || 0) > 0;
    setClientAction({ client, mode: linked ? "archive" : "delete" });
  }

  async function confirmClientAction() {
    if (!clientAction) return;
    const id = clientAction.client.id;
    setClientAction(null);
    await removeClient(id);
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
      <header className="clients-page-header">
        <div>
          <h1>Clients</h1>
          <p>{data.clients.filter((client) => client.status === "active").length} clients actifs</p>
        </div>
        <div className="hero-actions">
          <button className="secondary-button" type="button" onClick={exportClientsCsv}>
            Exporter en CSV
          </button>
          <button className="primary-button list-action-button" type="button" onClick={beginCreateClient}>+ Nouveau client</button>
        </div>
      </header>

      <div className="page-scroll">
        <section className="list-view-content">
            <div className="filters-panel list-filters">
              <div className="filters-grid clients">
                <label className="filter-field search">
                <span className="sr-only">Rechercher client</span>
                <input
                  className="filter-input"
                  type="text"
                  placeholder="Nom, société, ville, email"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                </label>
                <select className="filter-select" aria-label="Filtrer par type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option value="all">Type</option><option value="individual">Personne</option><option value="company">Entité</option></select>
                <select
                  className="filter-select"
                  aria-label="Filtrer par statut"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                <option value="all">Statut</option>
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                </select>
              </div>
            </div>

            {filteredClients.length > 0 ? <div className="panel entity-list-panel"><Table className="entity-list-table clients-table" columns={["Client", "Contact", "Ville", "Statut", ""]} rows={filteredClients.map((client) => [
              <button className="client-clickable-cell" type="button" onClick={() => openClientSheet(client)}><span className={`client-type-icon ${client.clientType}`} aria-hidden="true">{client.clientType === "company" ? "▦" : "◯"}</span><span><strong>{client.clientType === "company" ? client.company || "Entité" : `${client.firstName} ${client.lastName}`.trim() || "Client"}</strong><small>{client.clientType === "company" && (client.firstName || client.lastName) ? `Contact : ${[client.firstName, client.lastName].filter(Boolean).join(" ")}` : client.clientType === "individual" ? "Personne" : "Entité"}</small></span></button>,
              client.email || client.phone || "—",
              client.city || "—",
              client.status === "inactive" ? <span className="badge inactif">Inactif</span> : null,
              <div className="client-actions-menu"><details><summary aria-label={`Actions pour ${client.company || client.displayName || "ce client"}`}>⋮</summary><div><button type="button" onClick={() => beginEditClient(client)} disabled={!canEditRecords}>Modifier</button>{canDeleteRecords && <button type="button" className="danger" onClick={() => requestClientAction(client)}>{Number(client.invoicesCount || 0) || Number(client.ordersCount || 0) ? "Archiver" : "Supprimer"}</button>}</div></details></div>
            ])} /></div> : <div className="empty-card-state">Aucun client ne correspond à vos critères.</div>}
        </section>
      </div>

      <OverlayDialog
        open={editor.kind === "client"}
        title={isEditing ? "Modifier client" : "Créer un client"}
        onClose={closeEditor}
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
            <button className="client-contact-toggle client-form-span-2" type="button" onClick={() => setShowCompanyContact((current) => !current)}>{showCompanyContact ? "Masquer la personne de contact" : "+ Ajouter une personne de contact"}</button>
            {showCompanyContact && <><label className="client-form-field">Prénom du contact<input value={forms.client.firstName} onChange={(event) => setForms((current) => ({ ...current, client: { ...current.client, firstName: event.target.value } }))} /></label><label className="client-form-field">Nom du contact<input value={forms.client.lastName} onChange={(event) => setForms((current) => ({ ...current, client: { ...current.client, lastName: event.target.value } }))} /></label></>}
          </> : <label className="client-form-field client-form-span-2">
            Nom complet
            <input required value={fullNameDraft} onChange={(event) => updateFullName(event.target.value)} placeholder="" />
          </label>}
          {(!isCompany || showCompanyContact) && <label className="client-form-field">
            Téléphone
            <input
              value={forms.client.phone}
              onChange={(event) => setForms((current) => ({
                ...current,
                client: { ...current.client, phone: event.target.value }
              }))}
            />
          </label>}
          {(!isCompany || showCompanyContact) && <label className="client-form-field">
            {isCompany ? "Email du contact" : "Email"}
            <input type="email"
              value={forms.client.email}
              onChange={(event) => setForms((current) => ({
                ...current,
                client: { ...current.client, email: event.target.value }
              }))}
            />
          </label>}
          <label className="client-form-field client-form-span-2">Ville<input value={forms.client.city} onChange={(event) => setForms((current) => ({ ...current, client: { ...current.client, city: event.target.value } }))} /></label>
          {isEditing && <label className="client-form-field client-form-span-2">Statut<select value={forms.client.status} onChange={(event) => setForms((current) => ({ ...current, client: { ...current.client, status: event.target.value } }))}><option value="active">Actif</option><option value="inactive">Inactif</option></select></label>}
          <div className="client-form-actions client-form-span-2"><button type="button" className="secondary-button" onClick={closeEditor}>Fermer</button><button type="submit" className="primary-button" disabled={loading}>{loading ? "Enregistrement…" : isEditing ? "Enregistrer" : "Créer le client"}</button></div>
        </form>
      </OverlayDialog>
      <OverlayDialog open={Boolean(clientAction)} title={clientAction?.mode === "archive" ? "Archiver le client" : "Supprimer le client"} onClose={() => setClientAction(null)}>
        {clientAction && <div className="client-confirmation"><p>{clientAction.mode === "archive" ? "Ce client possède des factures ou des commandes. Il sera archivé et restera disponible dans l’historique." : "Cette action est définitive. Le client sera supprimé."}</p><div className="client-confirmation-summary"><strong>{clientAction.client.company || clientAction.client.displayName || `${clientAction.client.firstName || ""} ${clientAction.client.lastName || ""}`.trim()}</strong><span>{Number(clientAction.client.invoicesCount || 0)} facture(s) · {Number(clientAction.client.ordersCount || 0)} commande(s)</span></div><div className="client-confirmation-actions"><button type="button" className="secondary-button" onClick={() => setClientAction(null)}>Garder</button><button type="button" className="danger-button" onClick={confirmClientAction} disabled={loading}>{clientAction.mode === "archive" ? "Archiver le client" : "Supprimer le client"}</button></div></div>}
      </OverlayDialog>
    </div>
  );
}
