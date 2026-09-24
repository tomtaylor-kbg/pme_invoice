import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "../WorkspaceProvider";
import { SectionHeader } from "../ui";
import { buildMonthlyRevenueSeries, formatDate, money } from "../../utils/formatters";

function clientName(invoice) {
  const client = invoice.client || {};
  return client.company || [client.firstName, client.lastName].filter(Boolean).join(" ") || "Client";
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { data, refresh, beginCreateInvoiceWithPreset, beginManagePayments, beginEditInvoice, workspaceSettings } = useWorkspace();
  const invoices = data.invoices || [];
  const currencies = [...new Set([workspaceSettings.defaultCurrency, "USD", "CDF", ...invoices.map((invoice) => invoice.currency)].filter(Boolean))];
  const [currency, setCurrency] = useState(workspaceSettings.defaultCurrency || currencies[0] || "EUR");
  const disbursements = data.cashDisbursements || [];
  const matchingInvoices = invoices.filter((invoice) => (invoice.currency || "EUR") === currency);
  const matchingDisbursements = disbursements.filter((record) => (record.currency || "EUR") === currency);
  const disbursedAmount = matchingDisbursements.reduce((sum, record) => sum + Number(record.amount || 0), 0);
  const monthlyRevenue = buildMonthlyRevenueSeries(matchingInvoices, 12);
  const maxRevenue = Math.max(...monthlyRevenue.map((point) => point.value), 1);
  const chartPoints = monthlyRevenue.map((point, index) => ({
    ...point,
    x: monthlyRevenue.length === 1 ? 50 : index / (monthlyRevenue.length - 1) * 100,
    y: 92 - point.value / maxRevenue * 78
  }));
  const openInvoices = matchingInvoices.filter((invoice) => Number(invoice.balanceDue ?? invoice.total) > 0 && invoice.status !== "draft");
  const overdueInvoices = matchingInvoices.filter((invoice) => invoice.status === "overdue");
  const receivable = openInvoices.reduce((sum, invoice) => sum + Number(invoice.balanceDue ?? invoice.total ?? 0), 0);
  const finalizedInvoices = matchingInvoices.filter((invoice) => invoice.status !== "draft");
  const billedAmount = finalizedInvoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
  const receivedAmount = finalizedInvoices.reduce((sum, invoice) => {
    const total = Number(invoice.total || 0);
    const balance = Number(invoice.balanceDue ?? total);
    return sum + Math.min(total, Math.max(0, Number(invoice.amountPaid ?? total - balance)));
  }, 0);
  const receivedShare = billedAmount > 0 ? Math.round(receivedAmount / billedAmount * 100) : 0;
  const activity = useMemo(() => invoices.flatMap((invoice) => {
    const events = [{
      key: `invoice-${invoice.id}`,
      type: "invoice",
      date: invoice.createdAt || invoice.issueDate,
      title: "Facture créée",
      detail: `${invoice.number} · ${clientName(invoice)}`,
      amount: invoice.total,
      invoice
    }];
    return events.concat((invoice.payments || []).map((payment) => ({
      key: `payment-${payment.id}`,
      type: "payment",
      date: payment.paidAt || payment.createdAt,
      title: "Paiement reçu",
      detail: `${invoice.number} · ${clientName(invoice)}`,
      amount: payment.amount,
      invoice
    })));
  }).concat(disbursements.map((record) => ({
    key: `disbursement-${record.id}`,
    type: "disbursement",
    date: record.paidAt || record.createdAt,
    title: "Sortie de caisse",
    detail: `${record.number} · ${record.beneficiary}`,
    amount: record.amount,
    currency: record.currency || "EUR"
  }))).filter((event) => (event.invoice?.currency || event.currency || "EUR") === currency)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 8), [invoices, disbursements, currency]);

  return (
    <div className="page-shell dashboard-page">
      <header className="hero activity-header">
        <div>
          <span className="eyebrow">Activité</span>
          <h1>Bonjour, voici votre activité</h1>
          <p>{new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</p>
        </div>
        <div className="hero-actions">
          <label className="dashboard-currency">Devise
            <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
              {(currencies.length ? currencies : ["EUR"]).map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <button className="secondary-button" type="button" onClick={refresh}>Rafraîchir</button>
          <button className="primary-button" type="button" onClick={() => { beginCreateInvoiceWithPreset(); navigate("/invoices"); }}>Nouvelle facture</button>
        </div>
      </header>

      <div className="page-scroll">
        <section className="activity-priorities" aria-label="Priorités financières">
          <button type="button" className="activity-priority" onClick={() => navigate("/invoices")}>
            <span>À encaisser</span><strong>{money(receivable, currency)}</strong><small>{openInvoices.length} facture{openInvoices.length > 1 ? "s" : ""} ouverte{openInvoices.length > 1 ? "s" : ""}</small>
          </button>
          <button type="button" className="activity-priority" onClick={() => navigate("/invoices")}>
            <span>Factures ouvertes</span><strong>{openInvoices.length}</strong><small>À suivre</small>
          </button>
          <button type="button" className="activity-priority" onClick={() => navigate("/invoices")}>
            <span>En retard</span><strong className={overdueInvoices.length ? "text-danger" : ""}>{overdueInvoices.length}</strong><small>{overdueInvoices.length ? "Action requise" : "Aucune échéance dépassée"}</small>
          </button>
          <button type="button" className="activity-priority" onClick={() => navigate("/cash")}>
            <span>Sorties / décaissements</span><strong>{money(disbursedAmount, currency)}</strong><small>{matchingDisbursements.length} sortie{matchingDisbursements.length > 1 ? "s" : ""} en {currency}</small>
          </button>
        </section>

        <section className="activity-charts" aria-label="Analyse financière">
          <div className="panel activity-revenue-panel">
            <SectionHeader title="Chiffre d’affaires mensuel" />
            <div className="activity-revenue-chart">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`Chiffre d’affaires mensuel en ${currency}`}>
                <line x1="0" y1="92" x2="100" y2="92" className="revenue-axis" />
                <line x1="0" y1="53" x2="100" y2="53" className="revenue-grid-line" />
                <line x1="0" y1="14" x2="100" y2="14" className="revenue-grid-line" />
                <polyline points={chartPoints.map((point) => `${point.x},${point.y}`).join(" ")} className="revenue-line" />
                {chartPoints.map((point) => <circle key={point.key} cx={point.x} cy={point.y} r="1.4" className="revenue-point"><title>{`${point.label}: ${money(point.value, currency)}`}</title></circle>)}
              </svg>
              <div className="activity-revenue-labels">
                {chartPoints.map((point) => <span key={point.key} title={money(point.value, currency)}>{point.label}</span>)}
              </div>
            </div>
          </div>

          <div className="panel activity-breakdown-panel">
            <SectionHeader title="Facturé : encaissé / restant" />
            {billedAmount > 0 ? <>
              <div className="activity-donut-layout">
                <div className="activity-donut" style={{ "--received-share": `${receivedShare}%` }} role="img" aria-label={`${receivedShare}% encaissé, ${100 - receivedShare}% restant à encaisser`}>
                  <div><strong>{receivedShare}%</strong><span>encaissé</span></div>
                </div>
                <div className="activity-donut-legend">
                  <div><span className="activity-legend-dot received" /><span>Encaissé</span><strong>{money(receivedAmount, currency)}</strong></div>
                  <div><span className="activity-legend-dot outstanding" /><span>Restant à encaisser</span><strong>{money(Math.max(0, billedAmount - receivedAmount), currency)}</strong></div>
                  <div className="activity-donut-total"><span>Total facturé</span><strong>{money(billedAmount, currency)}</strong></div>
                </div>
              </div>
            </> : <div className="empty-state">Aucune facture à analyser dans cette devise.</div>}
          </div>
        </section>

        {overdueInvoices.length > 0 && <section className="activity-alert">
          <div><strong>{overdueInvoices.length} facture{overdueInvoices.length > 1 ? "s" : ""} en retard</strong><span>Montant restant : {money(overdueInvoices.reduce((sum, invoice) => sum + Number(invoice.balanceDue ?? invoice.total ?? 0), 0), currency)}</span></div>
          <button className="text-button" type="button" onClick={() => beginManagePayments(overdueInvoices[0])}>Voir la première facture</button>
        </section>}

        <section className="panel activity-feed-panel">
          <SectionHeader title="Activité récente" />
          <div className="activity-feed">
            {activity.length ? activity.map((event) => <button className="activity-event" type="button" key={event.key} onClick={() => event.type === "payment" ? beginManagePayments(event.invoice) : event.type === "disbursement" ? navigate("/cash") : beginEditInvoice(event.invoice)}>
              <span className={`activity-event-dot ${event.type}`} />
              <span className="activity-event-copy"><strong>{event.title}</strong><small>{event.detail}</small></span>
              <span className="activity-event-date">{formatDate(event.date)}</span>
              <strong className="activity-event-amount">{money(event.amount, event.invoice?.currency || event.currency || currency)}</strong>
            </button>) : <div className="empty-state">Aucune activité pour le moment.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
