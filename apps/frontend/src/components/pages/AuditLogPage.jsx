import { useEffect, useState } from "react";
import { getAuditLogs } from "../../api";
import { useWorkspace } from "../WorkspaceProvider";
import { SectionHeader, Table } from "../ui";

function formatTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

export function AuditLogPage() {
  const { token, user } = useWorkspace();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

  const columns = isAdmin ? ["Date et heure", "Utilisateur", "Action", "Élément", "Détail"] : ["Date et heure", "Action", "Élément", "Détail"];
  const rows = records.map((record) => {
    const row = [formatTimestamp(record.createdAt)];
    if (isAdmin) row.push(<span title={record.actorEmail}>{record.actorName || record.actorEmail || "Compte supprimé"}</span>);
    row.push(record.action, record.entity, record.description);
    return row;
  });

  return (
    <div className="page-shell audit-log-page">
      <header className="hero">
        <div>
          <span className="eyebrow">Traçabilité</span>
          <h1>Journal d’activité</h1>
          <p>{isAdmin ? "Historique des actions de tous les utilisateurs." : "Historique de vos actions dans l’espace de travail."}</p>
        </div>
      </header>
      <div className="page-scroll">
        <section className="panel audit-log-panel">
          <SectionHeader title={isAdmin ? "Toutes les activités" : "Mes activités"} />
          {loading ? <div className="empty-card-state">Chargement du journal…</div>
            : error ? <div className="empty-card-state text-danger">{error}</div>
              : records.length ? <Table className="entity-list-table audit-log-table" columns={columns} rows={rows} />
                : <div className="empty-card-state">Aucune activité enregistrée pour le moment.</div>}
        </section>
      </div>
    </div>
  );
}
