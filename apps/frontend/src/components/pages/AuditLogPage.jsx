import { useEffect, useState } from "react";
import { getAuditLogs } from "../../api";
import { useWorkspace } from "../WorkspaceProvider";
import { DataLoadingState, OverlayDialog, SectionHeader, Table } from "../ui";
import { money } from "../../utils/formatters";

function formatTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "medium" }).format(date);
}

function DetailField({ label, children }) {
  if (children === undefined || children === null || children === "") return null;
  return <div className="audit-detail-field"><dt>{label}</dt><dd>{children}</dd></div>;
}

function LogDetails({ record }) {
  const details = record.details || {};
  const currency = details.currency || "EUR";
  const paymentMethods = { cash: "Espèces", card: "Carte bancaire", bank_transfer: "Virement bancaire", mobile_money: "Mobile money", check: "Chèque", other: "Autre" };

  if (!Object.keys(details).length) {
    return <div className="empty-card-state">Les détails de cette ancienne entrée n’étaient pas conservés.{record.entityId ? ` Identifiant : ${record.entityId}` : ""}</div>;
  }

  if (record.entity === "Facture" || record.entity === "Pro forma") {
    return <>
      <dl className="audit-detail-grid">
        <DetailField label={record.entity === "Pro forma" ? "N° de pro forma" : "N° de facture"}>{details.number}</DetailField>
        <DetailField label="Client">{details.client}</DetailField>
        <DetailField label="Statut">{details.status}</DetailField>
        <DetailField label="Émise le">{details.issueDate ? formatTimestamp(details.issueDate) : null}</DetailField>
        <DetailField label="Échéance">{details.dueDate ? formatTimestamp(details.dueDate) : null}</DetailField>
        <DetailField label="Valide jusqu’au">{details.validUntil ? formatTimestamp(details.validUntil) : null}</DetailField>
        <DetailField label="Taux de TVA">{details.taxRate ? `${details.taxRate}%` : null}</DetailField>
        <DetailField label="Total">{money(details.total, currency)}</DetailField>
        <DetailField label="Notes">{details.notes}</DetailField>
      </dl>
      {details.lines?.length > 0 && <div className="audit-lines-wrap">
      <h3>{record.entity === "Pro forma" ? "Lignes de la pro forma" : "Lignes de facture"}</h3>
        <Table className="audit-lines-table" columns={["Description", "Qté", "Prix unitaire", "Total"]} rows={details.lines.map((line) => [
          line.description,
          line.quantity,
          money(line.unitPrice, currency),
          money(line.lineTotal, currency)
        ])} />
      </div>}
    </>;
  }

  if (record.entity === "Sortie de caisse") {
    return <dl className="audit-detail-grid">
      <DetailField label="N° de bon">{details.number}</DetailField>
      <DetailField label="Bénéficiaire">{details.beneficiary}</DetailField>
      <DetailField label="Catégorie">{details.category}</DetailField>
      <DetailField label="Date de sortie">{details.paidAt ? formatTimestamp(details.paidAt) : null}</DetailField>
      <DetailField label="Montant">{money(details.amount, currency)}</DetailField>
      <DetailField label="Motif">{details.reason}</DetailField>
      <DetailField label="Notes">{details.notes}</DetailField>
    </dl>;
  }

  if (record.entity === "Paiement") {
    return <dl className="audit-detail-grid">
      <DetailField label="Montant">{money(details.amount, currency)}</DetailField>
      <DetailField label="Moyen de paiement">{paymentMethods[details.method] || details.method}</DetailField>
      <DetailField label="Date du paiement">{details.paidAt ? formatTimestamp(details.paidAt) : null}</DetailField>
      <DetailField label="Référence">{details.reference}</DetailField>
      <DetailField label="Notes">{details.notes}</DetailField>
    </dl>;
  }

  return <dl className="audit-detail-grid">
    {Object.entries(details).map(([key, value]) => <DetailField key={key} label={key}>
      {typeof value === "object" ? JSON.stringify(value) : String(value)}
    </DetailField>)}
  </dl>;
}

export function AuditLogPage() {
  const { token, user } = useWorkspace();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getAuditLogs(token)
      .then((items) => { if (active) setRecords(items); })
      .catch((requestError) => { if (active) setError(requestError.message || "Chargement du journal impossible."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const columns = isAdmin ? ["Horodatage", "Utilisateur", "Action", "Détail", ""] : ["Horodatage", "Action", "Détail", ""];
  const rows = records.map((record) => {
    const row = [formatTimestamp(record.createdAt)];
    if (isAdmin) row.push(<span title={record.actorEmail}>{record.actorName || record.actorEmail || "Compte supprimé"}</span>);
    row.push(record.action, record.description, <button type="button" className="text-button" onClick={() => setSelectedRecord(record)}>Voir</button>);
    return row;
  });

  return (
    <div className="page-shell audit-log-page">
      <header className="hero list-page-header">
        <div>
          <span className="eyebrow">Traçabilité</span>
          <h1>Journal d’activité</h1>
          <p>{isAdmin ? "Historique des actions de tous les utilisateurs." : "Historique de vos actions dans l’espace de travail."}</p>
        </div>
      </header>
      <div className="page-scroll">
        <section className="panel audit-log-panel">
          <SectionHeader title={isAdmin ? "Toutes les activités" : "Mes activités"} />
          {loading ? <DataLoadingState label="Chargement du journal…" />
            : error ? <div className="empty-card-state text-danger">{error}</div>
              : records.length ? <Table className="entity-list-table audit-log-table" columns={columns} rows={rows} />
                : <div className="empty-card-state">Aucune activité enregistrée pour le moment.</div>}
        </section>
      </div>
      <OverlayDialog open={Boolean(selectedRecord)} title={selectedRecord ? `${selectedRecord.entity} · ${selectedRecord.description}` : "Détails du journal"} onClose={() => setSelectedRecord(null)}>
        {selectedRecord && <div className="audit-detail-content">
          <dl className="audit-detail-grid">
            <DetailField label="Horodatage">{formatTimestamp(selectedRecord.createdAt)}</DetailField>
            <DetailField label="Action">{selectedRecord.action}</DetailField>
            {isAdmin && <DetailField label="Utilisateur">{selectedRecord.actorName} · {selectedRecord.actorEmail}</DetailField>}
          </dl>
          <LogDetails record={selectedRecord} />
        </div>}
      </OverlayDialog>
    </div>
  );
}
