import { useEffect, useState } from "react";
import { getCashReportHistory, getDailyCashReport, getMonthlyCashReport } from "../../api";
import { useWorkspace } from "../WorkspaceProvider";
import { DataLoadingState } from "../ui";
import { formatISODate, formatMoney } from "../../utils/formatters";
import { buildCashDailyReportPrintHtml } from "../../utils/print/cashDailyReportPrint";

function currentMonth() { return new Date().toISOString().slice(0, 7); }
function currenciesOf(report) { return [...new Set([...Object.keys(report?.inTotals || {}), ...Object.keys(report?.outTotals || {}), ...Object.keys(report?.depositTotals || {}), ...Object.keys(report?.netTotals || {}), ...Object.keys(report?.totals || {})])]; }
function reportOperations(report) { return (report?.sessions || []).flatMap((session) => (session.movements || []).map((movement) => ({ ...movement, operator: session.operator?.name || session.operator?.email || "—" }))).sort((first, second) => new Date(first.createdAt) - new Date(second.createdAt)); }
function totalOut(report, currency) { return Number(report?.outTotals?.[currency] || 0) + Number(report?.depositTotals?.[currency] || 0); }

export function CashReportsPage() {
  const { token, workspaceSettings, notifyError } = useWorkspace();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState(currentMonth());
  const [daily, setDaily] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePeriod, setActivePeriod] = useState("day");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([getDailyCashReport(token, date), getMonthlyCashReport(token, month), getCashReportHistory(token)])
      .then(([dailyReport, monthlyReport, reportHistory]) => { if (active) { setDaily(dailyReport); setMonthly(monthlyReport); setHistory(reportHistory || []); } })
      .catch((error) => { if (active) notifyError("Rapports indisponibles", error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, date, month, refreshKey]);

  function print(report, period) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(buildCashDailyReportPrintHtml({ report: { ...report, date: period === "month" ? `${report.period}-01` : report.date, period }, settings: workspaceSettings }));
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => { if (!printWindow.closed) printWindow.print(); }, 250);
  }

  if (loading && !daily && !monthly) return <div className="page-shell"><DataLoadingState label="Chargement des rapports…" /></div>;
  const report = activePeriod === "day" ? daily : monthly;
  const reportCurrencies = currenciesOf(report);
  const operations = reportOperations(report);
  const sessions = report?.sessions || [];
  const sessionRows = sessions.map((session) => ({ id: session.id, date: formatISODate(session.openedAt), operator: session.operator?.name || session.operator?.email || "—", status: session.status === "closed" ? "Clôturée" : "Ouverte", currency: session.currency || "EUR", balance: session.expectedBalance || 0 }));

  return <div className="page-shell cash-page">
    <header className="hero list-page-header"><div><span className="eyebrow">Finance · Lecture seule</span><h1>Rapports de caisse</h1><p>Analysez les encaissements, sorties et soldes par devise.</p></div><div className="hero-actions"><button className="secondary-button" type="button" onClick={() => setRefreshKey((current) => current + 1)} disabled={loading}>{loading ? "Actualisation…" : "Actualiser"}</button></div></header>
    <div className="page-scroll">
      <section className="panel report-toolbar"><div className="report-period-tabs" role="tablist" aria-label="Période du rapport"><button type="button" className={activePeriod === "day" ? "active" : ""} onClick={() => setActivePeriod("day")}>Journalier</button><button type="button" className={activePeriod === "month" ? "active" : ""} onClick={() => setActivePeriod("month")}>Mensuel</button></div><div className="report-period-fields">{activePeriod === "day" ? <label>Date du rapport<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label> : <label>Mois du rapport<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>}</div></section>
      <section className="panel cash-daily-report"><div className="section-header"><div><span className="eyebrow">Rapport {activePeriod === "day" ? "journalier" : "mensuel"} · {activePeriod === "day" ? daily?.date || formatISODate(date) : monthly?.period || month}</span><h2>Synthèse {activePeriod === "day" ? "de la journée" : "du mois"}</h2></div>{report && <button className="secondary-button" type="button" onClick={() => print(report, activePeriod)}>Imprimer le rapport</button>}</div>{activePeriod === "day" && <div className="report-meta-grid"><div><span>Sessions</span><strong>{sessions.length}</strong></div><div><span>Opérations</span><strong>{operations.length}</strong></div><div><span>Devises</span><strong>{reportCurrencies.length}</strong></div></div>}<div className="cash-report-summary"><div className="cash-report-summary-head"><span>Devise</span><span>Entrées</span><span>Sorties</span><span>Solde</span></div>{reportCurrencies.map((currency) => <div className="cash-report-summary-row" key={currency}><strong>{currency}</strong><span className="text-success">+ {formatMoney(report.inTotals?.[currency] || 0, currency)}</span><span className="text-danger">− {formatMoney(totalOut(report, currency), currency)}</span><strong className="cash-report-balance">{formatMoney(activePeriod === "day" ? report.totals?.[currency] || 0 : report.netTotals?.[currency] || 0, currency)}</strong></div>)}{!reportCurrencies.length && <p className="text-muted">Aucune opération pour cette période.</p>}</div></section>
      <section className="panel report-sessions"><div className="section-header"><div><span className="eyebrow">Journal des opérations</span><h2>Opérations de caisse</h2></div><span className="cash-currency-chip">{operations.length}</span></div>{operations.length ? <div className="report-operation-table"><div className="report-operation-row report-session-head"><span>#</span>{activePeriod === "month" && <span>Date</span>}<span>Opérateur</span><span>Description</span><span>Montant</span></div>{operations.map((operation, index) => <div className="report-operation-row" key={operation.id || `${operation.createdAt}-${index}`}><span>{index + 1}</span>{activePeriod === "month" && <span>{formatISODate(operation.createdAt)}</span>}<span>{operation.operator}</span><span>{operation.description || "—"}</span><strong className={operation.type === "in" ? "text-success" : "text-danger"}>{operation.type === "in" ? "+" : "−"} {formatMoney(operation.amount, operation.currency)}</strong></div>)}</div> : <p className="text-muted">Aucune opération enregistrée pour cette période.</p>}</section>
      <section className="panel report-sessions"><div className="section-header"><div><span className="eyebrow">Détail</span><h2>Sessions concernées</h2></div><span className="cash-currency-chip">{sessionRows.length}</span></div>{sessionRows.length ? <div className="report-session-table"><div className="report-session-row report-session-head"><span>Date</span><span>Opérateur</span><span>Statut</span><span>Solde théorique</span></div>{sessionRows.map((session) => <div className="report-session-row" key={session.id}><span>{session.date}</span><span>{session.operator}</span><span className={session.status === "Clôturée" ? "text-success" : "text-warning"}>{session.status}</span><strong>{formatMoney(session.balance, session.currency)}</strong></div>)}</div> : <p className="text-muted">Aucune session sur cette période.</p>}</section>
      <section className="panel report-sessions"><div className="section-header"><div><span className="eyebrow">Historique</span><h2>Rapports clôturés</h2><small className="report-currency-note">Les rapports sont reconstituables à partir des sessions clôturées.</small></div><span className="cash-currency-chip">{history.length}</span></div>{history.length ? <div className="report-session-table"><div className="report-session-row report-session-head"><span>Date</span><span>Opérateur</span><span>Soldes de clôture</span><span>Action</span></div>{history.map((item) => <div className="report-session-row" key={item.id}><span>{item.date}</span><span>{item.operator?.name || item.operator?.email || "—"}</span><span>{Object.entries(item.closingBalances || {}).map(([currency, amount]) => formatMoney(amount, currency)).join(" · ")}</span><button className="text-button" type="button" onClick={() => { setDate(item.date); setActivePeriod("day"); }}>Ouvrir</button></div>)}</div> : <p className="text-muted">Aucun rapport clôturé disponible.</p>}</section>
    </div>
  </div>;
}
