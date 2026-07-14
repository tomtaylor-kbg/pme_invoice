import { useNavigate } from "react-router-dom";
import { useWorkspace } from "../WorkspaceProvider";
import { InvoiceCard, SectionHeader, StatCard } from "../ui";
import { buildClientPerformanceSeries, buildMonthlyRevenueSeries, money } from "../../utils/formatters";

export function DashboardPage() {
  const navigate = useNavigate();
  const { data, refresh, beginCreateInvoiceWithPreset, beginCreateClient, beginCreateReceipt } = useWorkspace();

  const summaryCards = [
    { label: "Factures", value: data.metrics?.invoices ?? 0, tone: "accent" },
    { label: "Contacts", value: data.metrics?.clients ?? 0, tone: "neutral" },
    { label: "Reçus", value: data.metrics?.receipts ?? 0, tone: "neutral" },
    { label: "Encaissements", value: data.metrics?.payments ?? 0, tone: "success" },
    { label: "En retard", value: data.metrics?.overdueInvoices ?? 0, tone: "warning" },
    { label: "Utilisateurs", value: data.metrics?.users ?? 0, tone: "neutral" },
    { label: "CA", value: money(data.metrics?.turnover ?? 0), tone: "success" },
    { label: "Reçu", value: money(data.metrics?.collectedAmount ?? 0), tone: "accent" }
  ];

  const monthlySeries = buildMonthlyRevenueSeries(data.invoices, 12);
  const topClients = buildClientPerformanceSeries(data.invoices, 5);
  const maxMonthlyValue = Math.max(...monthlySeries.map((point) => point.value), 1);
  const recent = data.recentInvoices.length ? data.recentInvoices : data.invoices.slice(0, 5);

  return (
    <div className="page-shell dashboard-page">
      <header className="hero">
        <div>
          <span className="eyebrow">Pilotage</span>
          <h1>Vue d’ensemble</h1>
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

      <div className="page-scroll">
        <section className="stats-grid">
          {summaryCards.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </section>

        <section className="content-grid dashboard-analytics">
          <div className="panel">
            <SectionHeader title="Revenu mensuel" />
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
            <SectionHeader title="Performance client" />
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
            <SectionHeader title="Factures récentes" />
            <div className="card-grid invoices-grid">
              {recent.map((invoice) => (
                <InvoiceCard key={invoice.id} invoice={invoice} tone="compact" />
              ))}
            </div>
          </div>

          <div className="panel panel-side">
            <SectionHeader title="Raccourcis" />
            <div className="quick-list">
              <article>
                <strong>Créer une facture</strong>
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
      </div>
    </div>
  );
}
