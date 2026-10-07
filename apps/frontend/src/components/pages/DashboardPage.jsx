import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "../WorkspaceProvider";
import { DataLoadingState, OverlayActionButton, OverlayDialog, OverlaySaveIcon, SectionHeader, Table } from "../ui";
import { buildMonthlyRevenueSeries, formatDate, money } from "../../utils/formatters";
import { getActiveCashSession, openCashSession } from "../../api";

function clientName(invoice) {
  const client = invoice.client || {};
  return client.company || [client.firstName, client.lastName].filter(Boolean).join(" ") || "Client";
}

function invoiceFinancialTone(invoice) {
  if (!invoice || invoice.status === "draft") return "";
  if (invoice.status === "overdue") return "overdue";
  return Number(invoice.balanceDue ?? 0) > 0 ? "outstanding" : "received";
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { token, data, refresh, beginCreateInvoiceWithPreset, workspaceSettings, user, isHydrating } = useWorkspace();
  const canManageCash = ["admin", "director", "receptionist"].includes(user?.role);
  const isReceptionist = user?.role === "receptionist";
  const invoices = data.invoices || [];
  const currencies = [...new Set([workspaceSettings.defaultCurrency, "USD", "CDF", ...invoices.map((invoice) => invoice.currency)].filter(Boolean))];
  const [currency, setCurrency] = useState(workspaceSettings.defaultCurrency || currencies[0] || "EUR");
  const [cashPromptOpen, setCashPromptOpen] = useState(false);
  const [cashOpeningOpen, setCashOpeningOpen] = useState(false);
  const [cashOpening, setCashOpening] = useState("");
  const [cashCurrency, setCashCurrency] = useState(workspaceSettings.defaultCurrency || "EUR");
  const [cashSaving, setCashSaving] = useState(false);
  const disbursements = data.cashDisbursements || [];
  const matchingInvoices = invoices.filter((invoice) => (invoice.currency || "EUR") === currency);
  const matchingDisbursements = disbursements.filter((record) => (record.currency || "EUR") === currency);
  const recentDisbursements = [...matchingDisbursements].slice(0, 5);
  const disbursedAmount = matchingDisbursements.reduce((sum, record) => sum + Number(record.amount || 0), 0);
  const monthlyRevenue = buildMonthlyRevenueSeries(matchingInvoices, 12);
  const maxRevenue = Math.max(...monthlyRevenue.map((point) => point.value), 1);
  const chartPoints = monthlyRevenue.map((point, index) => ({
    ...point,
    x: monthlyRevenue.length === 1 ? 50 : index / (monthlyRevenue.length - 1) * 100,
    y: 92 - point.value / maxRevenue * 78
  }));
  const openInvoices = matchingInvoices.filter((invoice) => Number(invoice.balanceDue ?? invoice.total) > 0 && invoice.status !== "draft");
  const overdueInvoices = openInvoices.filter((invoice) => invoice.status === "overdue");
  const currentInvoices = openInvoices.filter((invoice) => invoice.status !== "overdue");
  const receivable = currentInvoices.reduce((sum, invoice) => sum + Number(invoice.balanceDue ?? invoice.total ?? 0), 0);
  const overdueBalance = overdueInvoices.reduce((sum, invoice) => sum + Number(invoice.balanceDue ?? invoice.total ?? 0), 0);
  const finalizedInvoices = matchingInvoices.filter((invoice) => invoice.status !== "draft");
  const billedAmount = finalizedInvoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
  const receivedAmount = finalizedInvoices.reduce((sum, invoice) => {
    const total = Number(invoice.total || 0);
    const balance = Number(invoice.balanceDue ?? total);
    return sum + Math.min(total, Math.max(0, Number(invoice.amountPaid ?? total - balance)));
  }, 0);
  const unpaidAmount = Math.max(0, billedAmount - receivedAmount);
  const overdueAmount = Math.min(unpaidAmount, overdueBalance);
  const currentOutstandingAmount = Math.max(0, unpaidAmount - overdueAmount);
  const receivedShare = billedAmount > 0 ? Math.round(receivedAmount / billedAmount * 100) : 0;
  const receivedShareExact = billedAmount > 0 ? receivedAmount / billedAmount * 100 : 0;
  const currentOutstandingShare = billedAmount > 0 ? currentOutstandingAmount / billedAmount * 100 : 0;
  useEffect(() => {
    if (!isReceptionist || !user?.id || isHydrating) return undefined;
    let cancelled = false;
    getActiveCashSession(token).then((activeSession) => {
      if (!cancelled && !activeSession) setCashPromptOpen(true);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [isReceptionist, user?.id, isHydrating, token]);

  async function confirmCashOpening(event) {
    event.preventDefault();
    if (cashSaving) return;
    setCashSaving(true);
    try {
      await openCashSession(token, { openingBalance: cashOpening, currency: cashCurrency });
      setCashOpeningOpen(false);
      setCashOpening("");
    } finally {
      setCashSaving(false);
    }
  }
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
  }).filter((event) => (event.invoice?.currency || "EUR") === currency)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 8), [invoices, currency]);

  return (
    <div className="page-shell dashboard-page">
      <header className="hero activity-header">
        <div>
          <span className="eyebrow">Activité</span>
          <h1>Tableau de bord</h1>
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
        <section className="dashboard-shortcuts" aria-label="Raccourcis des tâches récurrentes">
          <div><span className="eyebrow">Actions rapides</span><h2>Tâches récurrentes</h2></div>
          <div className="dashboard-shortcuts-list">
            <button className="primary-button" type="button" onClick={() => { beginCreateInvoiceWithPreset(); navigate("/invoices"); }}>Nouvelle facture</button>
            <button className="secondary-button" type="button" onClick={() => navigate("/clients")}>Nouveau client</button>
            <button className="secondary-button" type="button" onClick={() => navigate("/orders")}>Commandes</button>
            {canManageCash && <button className="secondary-button" type="button" onClick={() => navigate("/cash-register")}>Ouvrir la caisse</button>}
            {canManageCash && <button className="secondary-button" type="button" onClick={() => navigate("/cash")}>Bon de sortie</button>}
          </div>
        </section>
        {isHydrating ? <DataLoadingState label="Chargement du tableau de bord…" className="page-loading-state" /> : <>
        <section className="activity-priorities" aria-label="Priorités financières">
          <button type="button" className="activity-priority outstanding" onClick={() => navigate("/invoices?status=open")}>
            <span>Encours à encaisser</span><strong className="financial-outstanding">{money(receivable, currency)}</strong><small>{currentInvoices.length} facture{currentInvoices.length > 1 ? "s" : ""} à suivre</small>
          </button>
          <button type="button" className="activity-priority outstanding" onClick={() => navigate("/invoices?status=open")}>
            <span>Factures ouvertes</span><strong className="financial-outstanding">{openInvoices.length}</strong><small>À suivre</small>
          </button>
          <button type="button" className="activity-priority overdue" onClick={() => navigate("/invoices?status=unpaid")}>
            <span>Factures impayées</span><strong className={unpaidAmount ? "financial-overdue" : ""}>{openInvoices.length}</strong><small>{openInvoices.length ? money(unpaidAmount, currency) : "Aucune facture impayée"}</small>
          </button>
          {canManageCash && <button type="button" className="activity-priority" onClick={() => navigate("/cash")}>
            <span>Sorties / décaissements</span><strong>{money(disbursedAmount, currency)}</strong><small>{matchingDisbursements.length} sortie{matchingDisbursements.length > 1 ? "s" : ""} en {currency}</small>
          </button>}
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
                <div className="activity-donut" style={{ "--received-share": `${receivedShareExact}%`, "--current-outstanding-share": `${currentOutstandingShare}%` }} role="img" aria-label={`${receivedShare}% encaissé, ${money(currentOutstandingAmount, currency)} en encours, ${money(overdueAmount, currency)} impayés en retard`}>
                  <div><strong>{receivedShare}%</strong><span>encaissé</span></div>
                </div>
                <div className="activity-donut-legend">
                  <div><span className="activity-legend-dot received" /><span>Encaissé</span><strong>{money(receivedAmount, currency)}</strong></div>
                  <div><span className="activity-legend-dot outstanding" /><span>En cours</span><strong>{money(currentOutstandingAmount, currency)}</strong></div>
                  <div><span className="activity-legend-dot overdue" /><span>Impayé en retard</span><strong>{money(overdueAmount, currency)}</strong></div>
                  <div className="activity-donut-total"><span>Total facturé</span><strong>{money(billedAmount, currency)}</strong></div>
                </div>
              </div>
            </> : <div className="empty-state">Aucune facture à analyser dans cette devise.</div>}
          </div>
        </section>

        {overdueInvoices.length > 0 && <section className="activity-alert">
          <div><strong>{overdueInvoices.length} facture{overdueInvoices.length > 1 ? "s" : ""} en retard</strong><span>Montant restant : {money(overdueInvoices.reduce((sum, invoice) => sum + Number(invoice.balanceDue ?? invoice.total ?? 0), 0), currency)}</span></div>
          <button className="text-button" type="button" onClick={() => navigate("/invoices?status=unpaid", { state: { invoiceAction: { id: overdueInvoices[0].id, mode: "payments" } } })}>Ouvrir une facture impayée</button>
        </section>}

        <div className="dashboard-lists-grid">
          <section className="panel entity-list-panel dashboard-disbursements-panel">
            <SectionHeader title="Bons de sortie récents" buttonLabel={canManageCash ? "Voir tous" : undefined} onButtonClick={() => navigate("/cash")} />
            {recentDisbursements.length ? <Table className="entity-list-table dashboard-disbursements-table" columns={["N° de bon", "Date", "Bénéficiaire / motif", "Montant"]} rows={recentDisbursements.map((record) => [
              record.number,
              formatDate(record.paidAt || record.createdAt),
              <div className="table-primary-cell"><strong>{record.beneficiary}</strong><small className="dashboard-disbursement-reason" title={record.reason}>{record.reason}</small></div>,
              <strong>{money(record.amount, record.currency || currency)}</strong>
            ])} /> : <div className="empty-state">Aucun bon de sortie dans cette devise.</div>}
          </section>

          <section className="panel activity-feed-panel">
            <SectionHeader title="Factures et paiements récents" buttonLabel="Voir tout" onButtonClick={() => navigate("/invoices")} />
            <div className="activity-feed">
              {activity.length ? activity.map((event) => <button className="activity-event" type="button" key={event.key} onClick={() => navigate("/invoices", { state: { invoiceAction: { id: event.invoice.id, mode: event.type === "payment" ? "payments" : "edit" } } })}>
                <span className={`activity-event-dot ${event.type} ${invoiceFinancialTone(event.invoice)}`} />
                <span className="activity-event-copy"><strong>{event.title}</strong><small>{event.detail}</small></span>
                <span className="activity-event-date">{formatDate(event.date)}</span>
                <strong className={`activity-event-amount${event.type === "payment" ? " received" : ""}`}>{money(event.amount, event.invoice?.currency || event.currency || currency)}</strong>
              </button>) : <div className="empty-state">Aucune activité pour le moment.</div>}
            </div>
          </section>
        </div>
        </>}
      </div>
      <OverlayDialog open={cashPromptOpen} title="Session de caisse" onClose={() => setCashPromptOpen(false)} topbarActions={<><button className="secondary-button" type="button" onClick={() => setCashPromptOpen(false)}>Non</button><button className="primary-button" type="button" onClick={() => { setCashPromptOpen(false); setCashOpeningOpen(true); }}>Oui, ouvrir</button></>}>
        <div className="cash-opening-intro">Aucune session de caisse n’est ouverte pour votre journée. Voulez-vous ouvrir la caisse maintenant ?</div>
      </OverlayDialog>
      <OverlayDialog open={cashOpeningOpen} title="Ouvrir une session de caisse" onClose={() => setCashOpeningOpen(false)} topbarActions={<OverlayActionButton icon={<OverlaySaveIcon />} className="primary-button overlay-save-button" type="submit" form="dashboard-cash-opening-form" disabled={cashSaving}>Ouvrir la caisse</OverlayActionButton>}>
        <form id="dashboard-cash-opening-form" className="stack-form cash-opening-form" onSubmit={confirmCashOpening}>
          <div className="cash-opening-intro">Définissez le fonds de départ et la devise de la session.</div>
          <label>Devise<select value={cashCurrency} onChange={(event) => setCashCurrency(event.target.value)}><option value="EUR">EUR — Euro</option><option value="USD">USD — Dollar américain</option><option value="CDF">CDF — Franc congolais</option></select></label>
          <label>Fonds de départ ({cashCurrency})<input autoFocus type="number" min="0" step="0.01" required value={cashOpening} onChange={(event) => setCashOpening(event.target.value)} /></label>
        </form>
      </OverlayDialog>
    </div>
  );
}
