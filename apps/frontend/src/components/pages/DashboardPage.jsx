import { useNavigate } from "react-router-dom";
import { useWorkspace } from "../WorkspaceProvider";
import { InvoiceCard, SectionHeader, StatCard } from "../ui";
import { buildClientPerformanceSeries, buildMonthlyRevenueSeries, money } from "../../utils/formatters";

export function DashboardPage() {
  const navigate = useNavigate();
  const { data, refresh, beginCreateInvoiceWithPreset, beginCreateClient, beginCreateReceipt } = useWorkspace();

  const summaryCards = [
    { label: "Factures", value: data.metrics?.invoices ?? 0, detail: "Total enregistré", tone: "accent" },
    { label: "Contacts", value: data.metrics?.clients ?? 0, detail: "Personnes suivies", tone: "neutral" },
    { label: "Reçus", value: data.metrics?.receipts ?? 0, detail: "Modèles thermiques", tone: "neutral" },
    { label: "En retard", value: data.metrics?.overdueInvoices ?? 0, detail: "Factures à relancer", tone: "warning" },
    { label: "Utilisateurs", value: data.metrics?.users ?? 0, detail: "Comptes internes", tone: "neutral" },
    { label: "CA", value: money(data.metrics?.turnover ?? 0), detail: "Somme des factures", tone: "success" }
  ];

  const monthlySeries = buildMonthlyRevenueSeries(data.invoices, 12);
  const topClients = buildClientPerformanceSeries(data.invoices, 5);
  const maxMonthlyValue = Math.max(...monthlySeries.map((point) => point.value), 1);
  const recent = data.recentInvoices.length ? data.recentInvoices : data.invoices.slice(0, 5);

  return (
    <>
      <header className="hero">
        <div>
          <span className="eyebrow">Pilotage</span>
          <h1>Vue d’ensemble</h1>
          <p>Activité, contacts, reçus et factures récentes.</p>
        </div>
        <div className="hero-actions">
          <button className="secondary-button" type="button" onClick={refresh}>
            Rafraîchir
          </button>
          <button className="secondary-button" type="button" onClick={() => navigate("/tools")}>
            Outils
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              beginCreateInvoiceWithPreset({ templateType: "professional" });
              navigate("/invoices");
            }}
          >
            Nouvelle facture
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              beginCreateClient();
              navigate("/clients");
            }}
          >
            Nouveau contact
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              beginCreateReceipt();
              navigate("/receipts");
            }}
          >
            Nouveau reçu
          </button>
        </div>
      </header>

      <section className="stats-grid">
        {summaryCards.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </section>

      <section className="content-grid dashboard-analytics">
        <div className="panel">
          <SectionHeader title="Revenu mensuel" action="Évolution du chiffre d'affaires sur les 12 derniers mois." />
          <div className="analytics-chart">
            <div className="analytics-chart-bars">
              {monthlySeries.map((point) => {
                const height = Math.max((point.value / maxMonthlyValue) * 100, 4);

                return (
                  <div className="analytics-bar" key={point.key}>
                    <div className="analytics-bar-track">
                      <span style={{ height: `${height}%` }} />
                    </div>
                    <strong>{money(point.value)}</strong>
                    <span>{point.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="panel">
          <SectionHeader title="Performance client" action="Les clients qui génèrent le plus de revenus." />
          <div className="performance-list">
            {topClients.length > 0 ? (
              topClients.map((client, index) => {
                const total = topClients[0]?.value || 1;
                const width = Math.max((client.value / total) * 100, 6);

                return (
                  <article className="performance-row" key={client.key}>
                    <div className="performance-row-head">
                      <span className="performance-rank">{index + 1}</span>
                      <div>
                        <strong>{client.label}</strong>
                        <p>Revenus cumulés sur les factures enregistrées.</p>
                      </div>
                      <strong>{money(client.value)}</strong>
                    </div>
                    <div className="performance-meter">
                      <span style={{ width: `${width}%` }} />
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="empty-state">Aucune donnée client disponible pour le moment.</div>
            )}
          </div>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <SectionHeader title="Factures récentes" action="Derniers documents enregistrés." />
          <div className="card-grid invoices-grid">
            {recent.map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} tone="compact" />
            ))}
          </div>
        </div>

        <div className="panel panel-side">
          <SectionHeader title="Raccourcis" action="Accès direct aux actions les plus utilisées." />
          <div className="quick-list">
            <article>
              <strong>Créer une facture</strong>
              <p>Ouvrir le formulaire avec le prochain numéro.</p>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  beginCreateInvoiceWithPreset({ templateType: "professional" });
                  navigate("/invoices");
                }}
              >
                Ouvrir
              </button>
            </article>
            <article>
              <strong>Créer un contact</strong>
              <p>Ajouter une personne liée à une entreprise ou non.</p>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  beginCreateClient();
                  navigate("/clients");
                }}
              >
                Ouvrir
              </button>
            </article>
            <article>
              <strong>Créer un reçu</strong>
              <p>Préparer un modèle compact pour imprimante thermique.</p>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  beginCreateReceipt();
                  navigate("/receipts");
                }}
              >
                Ouvrir
              </button>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
