import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "../WorkspaceProvider";
import { DataLoadingState, OverlayActionButton, OverlayDialog, OverlaySaveIcon, SectionHeader, Table } from "../ui";
import { buildMonthlyRevenueSeries, formatDate, money } from "../../utils/formatters";
import { getActiveCashSession, openCashSession } from "../../api";

function clientName(invoice) {
  const client = invoice.client || {};
  return client.company || [client.firstName, client.lastName].filter(Boolean).join(" ") || "Client";
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
  const activityInvoices = data.recentInvoices?.length ? data.recentInvoices : invoices;
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
  const netAfterDisbursements = billedAmount - disbursedAmount;
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
  return (
    <div className="page-shell dashboard-page">
      <header className="hero activity-header">
        <div>
          <h1>Tableau de bord</h1>
          <p>{new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</p>
        </div>
        <div className="hero-actions">
          <div className="dashboard-currency-switch" role="group" aria-label="Devise du tableau de bord">{["USD", "CDF"].map((item) => <button key={item} type="button" className={currency === item ? "active" : ""} onClick={() => setCurrency(item)}>{item}</button>)}</div>
          <button className="secondary-button" type="button" onClick={refresh}>Rafraîchir</button>
          <button className="primary-button" type="button" onClick={() => { beginCreateInvoiceWithPreset(); navigate("/invoices"); }}>Nouvelle facture</button>
        </div>
      </header>

      <div className="page-scroll">
        {isHydrating ? <DataLoadingState label="Chargement du tableau de bord…" className="page-loading-state" /> : <>
        <section className="panel dashboard-financial-summary" aria-label="Synthèse financière">
          <div className="dashboard-summary-top"><div><span>Total facturé, {new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date())}</span><strong>{money(billedAmount, currency)}</strong></div><div className="dashboard-summary-net"><span>Net après sorties</span><strong>{money(netAfterDisbursements, currency)}</strong></div></div>
          <div className="dashboard-summary-progress"><span style={{ width: `${Math.min(100, Math.max(0, receivedShareExact))}%` }} /></div>
          <div className="dashboard-summary-breakdown"><div><span>Encaissé</span><strong>{money(receivedAmount, currency)}</strong></div><div><span>En cours</span><strong>{money(currentOutstandingAmount, currency)}</strong></div><div><span>Impayé en retard</span><strong>{money(overdueAmount, currency)}</strong></div></div>
        </section>
        <section className="activity-priorities" aria-label="Priorités financières">
          <button type="button" className="activity-priority outstanding" onClick={() => navigate("/invoices?status=open")}>
            <span>Encours à encaisser</span><strong className="financial-outstanding">{money(receivable, currency)}</strong><small>{currentInvoices.length} facture{currentInvoices.length > 1 ? "s" : ""} à suivre</small>
          </button>
          <button type="button" className="activity-priority outstanding" onClick={() => navigate("/invoices?status=open")}>
            <span>Factures ouvertes</span><strong className="financial-outstanding">{openInvoices.length}</strong><small>À suivre</small>
          </button>
          <button type="button" className="activity-priority overdue" onClick={() => navigate("/invoices?status=unpaid")}>
            <span>Factures impayées</span><strong className={unpaidAmount ? "financial-overdue" : ""}>{money(unpaidAmount, currency)}</strong><small>{openInvoices.length ? `${openInvoices.length} facture${openInvoices.length > 1 ? "s" : ""} en retard` : "Aucun retard"}</small>
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

          <div className="panel dashboard-action-panel">
            <SectionHeader title="À traiter" />
            <div className="dashboard-action-stack">
              <div className="dashboard-action-card"><strong>{openInvoices.length ? `${openInvoices.length} facture${openInvoices.length > 1 ? "s" : ""} en attente` : "Aucune facture en attente"}</strong><p>{openInvoices.length ? `Montant restant : ${money(receivable, currency)}` : "Tous les paiements sont reçus. Créez une facture pour la prochaine vente."}</p><button className="primary-button" type="button" onClick={() => openInvoices.length ? navigate("/invoices?status=open") : (beginCreateInvoiceWithPreset(), navigate("/invoices"))}>{openInvoices.length ? "Voir les factures" : "Nouvelle facture"}</button></div>
              {canManageCash && <div className="dashboard-action-card"><strong>Caisse</strong><p>Ouvrez la caisse pour enregistrer les encaissements et les sorties du jour.</p><button className="secondary-button" type="button" onClick={() => navigate("/cash-register")}>Ouvrir la caisse</button></div>}
            </div>
          </div>
        </section>

        {overdueInvoices.length > 0 && <section className="activity-alert">
          <div><strong>{overdueInvoices.length} facture{overdueInvoices.length > 1 ? "s" : ""} en retard</strong><span>Montant restant : {money(overdueInvoices.reduce((sum, invoice) => sum + Number(invoice.balanceDue ?? invoice.total ?? 0), 0), currency)}</span></div>
          <button className="text-button" type="button" onClick={() => navigate("/invoices?status=unpaid", { state: { invoiceAction: { id: overdueInvoices[0].id, mode: "payments" } } })}>Ouvrir une facture impayée</button>
        </section>}

        <section className="panel entity-list-panel dashboard-invoices-panel">
          <SectionHeader title="Dernières factures" buttonLabel="Voir toutes les factures" onButtonClick={() => navigate("/invoices")} />
          {activityInvoices.filter((invoice) => (invoice.currency || "EUR") === currency).length ? <Table className="entity-list-table dashboard-invoices-table" columns={["Numéro", "Client", "Date", "Statut", "Montant"]} rows={activityInvoices.filter((invoice) => (invoice.currency || "EUR") === currency).slice(0, 5).map((invoice) => [invoice.number, clientName(invoice), formatDate(invoice.issueDate || invoice.createdAt), <span className="badge status-paid">{invoice.status === "paid" || Number(invoice.balanceDue || 0) <= 0 ? "Payée" : "À suivre"}</span>, <strong>{money(invoice.total, currency)}</strong>])} /> : <div className="empty-state">Aucune facture dans cette devise.</div>}
          <small className="dashboard-example-note">Lignes de la liste fournies à titre d’exemple pour la maquette.</small>
        </section>
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
