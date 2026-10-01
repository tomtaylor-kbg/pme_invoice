import { useEffect, useState } from "react";
import { addCashMovement, closeCashSession, getActiveCashSession, getDailyCashReport, openCashSession } from "../../api";
import { useWorkspace } from "../WorkspaceProvider";
import { DataLoadingState, OverlayActionButton, OverlayDialog, OverlaySaveIcon } from "../ui";
import { money } from "../../utils/formatters";

const currencies = [["EUR", "Euro"], ["USD", "Dollar américain"], ["CDF", "Franc congolais"]];

export function CashRegisterPage() {
  const { token, workspaceSettings, notifySuccess, notifyError } = useWorkspace();
  const defaultCurrency = workspaceSettings.defaultCurrency || "EUR";
  const [session, setSession] = useState(undefined);
  const [report, setReport] = useState(null);
  const [openingOpen, setOpeningOpen] = useState(false);
  const [closingOpen, setClosingOpen] = useState(false);
  const [opening, setOpening] = useState("");
  const [currency, setCurrency] = useState(currencies.some(([value]) => value === defaultCurrency) ? defaultCurrency : "EUR");
  const [closingBalances, setClosingBalances] = useState({});
  const [movement, setMovement] = useState({ type: "in", currency: defaultCurrency, amount: "", description: "" });
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const [activeSession, dailyReport] = await Promise.all([getActiveCashSession(token), getDailyCashReport(token)]);
      setSession(activeSession);
      setReport(dailyReport);
      if (activeSession) {
        setCurrency(activeSession.currency);
        setClosingBalances(Object.fromEntries(Object.entries(activeSession.expectedBalances || { [activeSession.currency]: activeSession.expectedBalance }).map(([key, amount]) => [key, String(amount)])));
        setMovement((current) => ({ ...current, currency: current.currency || activeSession.currency }));
      }
    } catch (error) {
      notifyError("Caisse indisponible", error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [token]);
  useEffect(() => { if (session === null) setOpeningOpen(true); }, [session]);

  async function openRegister(event) {
    event.preventDefault();
    try {
      await openCashSession(token, { openingBalance: opening, currency });
      setOpeningOpen(false);
      setOpening("");
      await refresh();
      notifySuccess("Caisse ouverte", `Session active en ${currency}.`);
    } catch (error) {
      notifyError("Ouverture impossible", error.message);
    }
  }

  async function closeRegister(event) {
    event.preventDefault();
    try {
      const primaryClosing = closingBalances[session.currency];
      await closeCashSession(token, session.id, { closingBalance: primaryClosing, closingBalances });
      setClosingBalances({});
      setClosingOpen(false);
      await refresh();
      notifySuccess("Caisse clôturée", "Le rapprochement a été enregistré.");
    } catch (error) {
      notifyError("Clôture impossible", error.message);
    }
  }

  async function saveMovement(event) {
    event.preventDefault();
    try {
      await addCashMovement(token, { ...movement, sessionId: session.id });
      setMovement({ type: "in", currency: session.currency, amount: "", description: "" });
      await refresh();
      notifySuccess("Mouvement enregistré", `${money(Number(movement.amount), movement.currency)} · ${movement.type === "in" ? "Encaissement" : "Sortie"}`);
    } catch (error) {
      notifyError("Mouvement non enregistré", error.message);
    }
  }

  if (loading) return <div className="page-shell"><DataLoadingState label="Chargement de la caisse…" /></div>;

  return (
    <div className="page-shell cash-register-page">
      <header className="hero list-page-header">
        <div><span className="eyebrow">Finance</span><h1>Caisse</h1><p>{session ? `Session active en ${session.currency}` : "Aucune session de caisse ouverte"}</p></div>
        <div className="hero-actions">{!session && <button className="primary-button" type="button" onClick={() => setOpeningOpen(true)}>Ouvrir une caisse</button>}</div>
      </header>

      <div className="page-scroll">
        {!session ? <section className="panel cash-register-empty"><div className="cash-register-empty-icon" aria-hidden="true">₿</div><h2>Ouvrir une session de caisse</h2><p>Définissez le fonds de départ et la devise de cette vacation pour commencer les opérations.</p><button className="primary-button" type="button" onClick={() => setOpeningOpen(true)}>Configurer le fonds de départ</button></section> : <section className="cash-register-grid">
          <section className="panel cash-register-summary"><div><span className="eyebrow">Session multi-devise</span><div className="cash-balance-list">{Object.entries(session.expectedBalances || { [session.currency]: session.expectedBalance }).map(([balanceCurrency, amount]) => <strong key={balanceCurrency}>{money(amount, balanceCurrency)}</strong>)}</div><small>Soldes théoriques par devise</small></div><button className="secondary-button" type="button" onClick={() => setClosingOpen(true)}>Clôturer la caisse</button></section>
          <div className="cash-register-workspace">
            <form className="panel stack-form cash-movement-editor" onSubmit={saveMovement}><div className="section-header"><div><span className="eyebrow">Opération</span><h2>Nouveau mouvement</h2></div><span className="cash-currency-chip">Mouvement</span></div><label>Type<select value="in" disabled><option value="in">Encaissement</option></select></label><label>Devise<select value={movement.currency} onChange={(event) => setMovement({ ...movement, currency: event.target.value })}>{currencies.map(([value, label]) => <option key={value} value={value}>{value} — {label}</option>)}</select></label><label>Montant ({movement.currency})<input type="number" min="0.01" step="0.01" required value={movement.amount} onChange={(event) => setMovement({ ...movement, amount: event.target.value })} /></label><label>Description<input required value={movement.description} onChange={(event) => setMovement({ ...movement, description: event.target.value })} placeholder="Ex. Paiement facture FAC-2026-0001" /></label><button className="primary-button" type="submit">Enregistrer le mouvement</button></form>
            <section className="panel cash-movement-history"><div className="section-header"><div><span className="eyebrow">Session active</span><h2>Mouvements récents</h2></div><span className="cash-currency-chip">{session.currency}</span></div>{session.movements.length ? <div className="cash-movement-list">{session.movements.map((item) => <div key={item.id}><span className={item.type === "in" ? "text-success" : "text-danger"}>{item.type === "in" ? "+" : "−"}{money(item.amount, item.currency)}</span><span>{item.description}</span></div>)}</div> : <p className="text-muted">Aucun mouvement dans cette session.</p>}</section>
          </div>
          <section className="panel cash-daily-report"><div className="section-header"><div><span className="eyebrow">Rapport journalier · {report?.date}</span><h2>Synthèse de la journée</h2></div><button className="secondary-button" type="button" onClick={() => window.print()}>Imprimer</button></div><div className="cash-report-totals">{Object.entries(report?.totals || session.expectedBalances || {}).map(([reportCurrency, amount]) => <div key={reportCurrency}><span>{reportCurrency}</span><strong>{money(amount, reportCurrency)}</strong></div>)}</div></section>
        </section>}
      </div>

      <OverlayDialog open={openingOpen} title="Ouvrir une session de caisse" onClose={() => setOpeningOpen(false)} topbarActions={<OverlayActionButton icon={<OverlaySaveIcon />} className="primary-button overlay-save-button" type="submit" form="cash-opening-form">Ouvrir la caisse</OverlayActionButton>}><form id="cash-opening-form" className="stack-form cash-opening-form" onSubmit={openRegister}><div className="cash-opening-intro">Le fonds de départ sera enregistré dans la devise choisie et servira de base au rapprochement de fin de session.</div><label>Devise<select value={currency} onChange={(event) => setCurrency(event.target.value)}>{currencies.map(([value, label]) => <option key={value} value={value}>{value} — {label}</option>)}</select></label><label>Fonds de départ ({currency})<input autoFocus type="number" min="0" step="0.01" required value={opening} onChange={(event) => setOpening(event.target.value)} placeholder="0,00" /></label></form></OverlayDialog>
      <OverlayDialog open={closingOpen} title="Clôturer la caisse" onClose={() => setClosingOpen(false)} topbarActions={<OverlayActionButton icon={<OverlaySaveIcon />} className="primary-button overlay-save-button" type="submit" form="cash-closing-form">Confirmer la clôture</OverlayActionButton>}><form id="cash-closing-form" className="stack-form cash-opening-form" onSubmit={closeRegister}><div className="cash-opening-intro">Saisissez le montant réellement compté pour chaque devise. La session du jour sera définitivement clôturée et le rapport journalier pourra être imprimé.</div>{Object.keys(session.expectedBalances || { [session.currency]: session.expectedBalance }).map((balanceCurrency) => <label key={balanceCurrency}>Fonds final ({balanceCurrency})<input autoFocus={balanceCurrency === session.currency} type="number" min="0" step="0.01" required value={closingBalances[balanceCurrency] || ""} onChange={(event) => setClosingBalances((current) => ({ ...current, [balanceCurrency]: event.target.value }))} /></label>)}</form></OverlayDialog>
    </div>
  );
}
