import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addCashMovement, closeCashSession, deleteCashMovement, getActiveCashSession, getCashCarryForward, getDailyCashReport, openCashSession, resetCashRegister } from "../../api";
import { useWorkspace } from "../WorkspaceProvider";
import { DataLoadingState, OverlayActionButton, OverlayDialog, OverlaySaveIcon } from "../ui";
import { money } from "../../utils/formatters";
import { buildCashDailyReportPrintHtml } from "../../utils/print/cashDailyReportPrint";

const currencies = [["EUR", "Euro"], ["USD", "Dollar américain"], ["CDF", "Franc congolais"]];

export function CashRegisterPage() {
  const { token, data, user, workspaceSettings, notifySuccess, notifyError } = useWorkspace();
  const navigate = useNavigate();
  const defaultCurrency = workspaceSettings.defaultCurrency || "EUR";
  const [session, setSession] = useState(undefined);
  const [report, setReport] = useState(null);
  const [carryForward, setCarryForward] = useState(null);
  const [openingOpen, setOpeningOpen] = useState(false);
  const [closingOpen, setClosingOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);
  const [opening, setOpening] = useState("");
  const [openingBalances, setOpeningBalances] = useState({});
  const [currency, setCurrency] = useState(currencies.some(([value]) => value === defaultCurrency) ? defaultCurrency : "EUR");
  const [closingBalances, setClosingBalances] = useState({});
  const [movement, setMovement] = useState({ type: "in", currency: defaultCurrency, amount: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [resetting, setResetting] = useState(false);
  const [movementFilter, setMovementFilter] = useState("all");

  async function refresh() {
    setLoading(true);
    setLoadError("");
    try {
      const [activeSession, dailyReport, previousClosing] = await Promise.all([getActiveCashSession(token), getDailyCashReport(token), getCashCarryForward(token)]);
      setSession(activeSession);
      setReport(dailyReport);
      setCarryForward(previousClosing);
      if (!activeSession && previousClosing?.balances) {
        setOpeningBalances(Object.fromEntries(Object.entries(previousClosing.balances).map(([key, amount]) => [key, String(amount)])));
      }
      if (activeSession) {
        setCurrency(activeSession.currency);
        setClosingBalances(Object.fromEntries(Object.entries(activeSession.expectedBalances || { [activeSession.currency]: activeSession.expectedBalance }).map(([key, amount]) => [key, String(amount)])));
        setMovement((current) => ({ ...current, currency: current.currency || activeSession.currency }));
      }
    } catch (error) {
      setLoadError(error.message || "La caisse est momentanément indisponible.");
      notifyError("Caisse indisponible", error.message || "La caisse est momentanément indisponible.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [token]);
  useEffect(() => { if (session === null) setOpeningOpen(true); }, [session]);

  async function openRegister(event) {
    event.preventDefault();
    try {
      await openCashSession(token, { openingBalance: openingBalances[currency] || opening || 0, openingBalances, currency });
      setOpeningOpen(false);
      setOpening("");
      setOpeningBalances({});
      await refresh();
      notifySuccess("Caisse ouverte", `Session active en ${currency}.`);
    } catch (error) {
      notifyError("Ouverture impossible", error.message || "La session de caisse n’a pas pu être ouverte.");
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
      notifyError("Clôture impossible", error.message || "La session de caisse n’a pas pu être clôturée.");
    }
  }

  async function saveMovement(event) {
    event.preventDefault();
    if (movement.type === "out") {
      navigate("/cash");
      return;
    }
    try {
      await addCashMovement(token, { ...movement, sessionId: session.id });
      setMovement({ type: "in", currency: session.currency, amount: "", description: "" });
      setMovementOpen(false);
      await refresh();
      notifySuccess("Mouvement enregistré", `${money(Number(movement.amount), movement.currency)} · ${movement.type === "in" ? "Encaissement" : "Sortie"}`);
    } catch (error) {
      notifyError("Mouvement non enregistré", error.message || "Le mouvement n’a pas pu être enregistré.");
    }
  }

  async function removeMovement(item) {
    if (!window.confirm(`Supprimer le mouvement « ${readableMovementDescription(item)} » ?`)) return;
    try {
      await deleteCashMovement(token, item.id);
      await refresh();
      notifySuccess("Mouvement supprimé", "Le solde théorique a été recalculé.");
    } catch (error) {
      notifyError("Suppression impossible", error.message || "Le mouvement n’a pas pu être supprimé.");
    }
  }

  async function resetRegister(event) {
    event.preventDefault();
    if (resetting || resetConfirmation !== "SUPPRIMER CAISSE") return;
    setResetting(true);
    try {
      const result = await resetCashRegister(token, resetConfirmation);
      setResetOpen(false);
      setResetConfirmation("");
      await refresh();
      notifySuccess("Caisse réinitialisée", `${Object.values(result.deleted || {}).reduce((sum, count) => sum + Number(count || 0), 0)} élément(s) supprimé(s). Les clients, factures et paiements ont été conservés.`);
    } catch (error) {
      notifyError("Réinitialisation impossible", error.message || "Les données de caisse n’ont pas pu être supprimées.");
    } finally {
      setResetting(false);
    }
  }

  function printDailyReport() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(buildCashDailyReportPrintHtml({ report, settings: workspaceSettings }));
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => { if (!printWindow.closed) printWindow.print(); }, 250);
  }

  function readableMovementDescription(item) {
    const description = String(item.description || "—");
    const match = description.match(/^(.*?facture\s+)([^\s]+)$/i);
    if (!match) return description;
    const invoice = (data.invoices || []).find((candidate) => candidate.id === match[2]);
    return invoice?.number ? `${match[1]}${invoice.number}` : description;
  }

  const balanceEntries = Object.entries(session?.expectedBalances || (session ? { [session.currency]: session.expectedBalance } : {}));
  const displayedMovements = (session?.movements || []).filter((item) => movementFilter === "all" || item.currency === movementFilter);
  const sessionDate = report?.date || session?.businessDate || new Date().toISOString().slice(0, 10);
  const formattedSessionDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${sessionDate}T00:00:00`));

  if (loading) return <div className="page-shell"><DataLoadingState label="Chargement de la caisse…" /></div>;

  return (
    <div className="page-shell cash-register-page">
      {loadError && <section className="panel empty-card-state text-danger" role="alert"><h2>Caisse indisponible</h2><p>{loadError}</p><button className="secondary-button" type="button" onClick={refresh}>Réessayer</button></section>}
      {["admin", "director"].includes(user?.role) && <div className="cash-reset-toolbar"><button className="text-button danger" type="button" onClick={() => setResetOpen(true)}>Réinitialiser les données de caisse</button></div>}
      {!session ? <section className="panel cash-register-empty"><div className="cash-register-empty-icon" aria-hidden="true">₿</div><h2>Ouvrir une session de caisse</h2><p>Définissez le fonds de départ et la devise de cette vacation pour commencer les opérations.</p><button className="primary-button" type="button" onClick={() => setOpeningOpen(true)}>Configurer le fonds de départ</button></section> : <>
        <section className="panel cash-register-card">
          <header className="cash-register-card-header"><div><h1>Caisse du {formattedSessionDate}</h1><p>Session ouverte, soldes théoriques par devise</p></div><div className="cash-register-card-actions"><button className="secondary-button" type="button" onClick={printDailyReport}>Imprimer le rapport</button><button className="secondary-button" type="button" onClick={() => setClosingOpen(true)}>Clôturer la caisse</button><button className="primary-button" type="button" onClick={() => setMovementOpen(true)}>Nouveau mouvement</button></div></header>
          <div className="cash-register-balances">{balanceEntries.map(([balanceCurrency, amount]) => <div className="cash-register-balance" key={balanceCurrency}><span>Solde {balanceCurrency}</span><strong>{money(amount, balanceCurrency)}</strong></div>)}</div>
          <section className="cash-register-movements"><div className="cash-register-movements-header"><h2>Mouvements récents</h2><div className="cash-movement-filter" role="group" aria-label="Filtrer les mouvements par devise">{[["all", "Tous"], ...balanceEntries.map(([value]) => [value, value])].map(([value, label]) => <button key={value} type="button" className={movementFilter === value ? "active" : ""} onClick={() => setMovementFilter(value)}>{label}</button>)}</div></div>{displayedMovements.length ? <div className="cash-movement-list">{displayedMovements.map((item) => <div key={item.id}><span className={item.type === "in" ? "text-success" : "text-danger"}>{item.type === "in" ? "+" : "−"}{money(item.amount, item.currency)}</span><span className="cash-movement-description">{readableMovementDescription(item)}</span><span className="cash-movement-currency">{item.currency}</span>{["admin", "director"].includes(user?.role) && !item.payment && !item.cashDisbursement && !item.cashDeposit && !item.invoiceId && <button className="text-button danger" type="button" onClick={() => removeMovement(item)} aria-label="Supprimer ce mouvement">Supprimer</button>}</div>)}</div> : <p className="text-muted">Aucun mouvement pour cette devise.</p>}</section>
        </section>
      </>}

      <OverlayDialog open={openingOpen} title="Ouvrir une session de caisse" onClose={() => setOpeningOpen(false)} topbarActions={<OverlayActionButton icon={<OverlaySaveIcon />} className="primary-button overlay-save-button" type="submit" form="cash-opening-form">Ouvrir la caisse</OverlayActionButton>}><form id="cash-opening-form" className="stack-form cash-opening-form" onSubmit={openRegister}><div className="cash-opening-intro">{carryForward?.sourceDate ? `Report de la clôture du ${carryForward.sourceDate} repris automatiquement par devise. Vérifiez ou ajustez les fonds de départ.` : "Aucun report précédent trouvé. Saisissez les fonds de départ par devise."}</div><label>Devise principale<select value={currency} onChange={(event) => setCurrency(event.target.value)}>{currencies.map(([value, label]) => <option key={value} value={value}>{value} — {label}</option>)}</select></label>{currencies.map(([value]) => <label key={value}>Report / fonds de départ ({value})<input autoFocus={value === currency} type="number" min="0" step="0.01" value={openingBalances[value] ?? (value === currency ? opening : "0")} onChange={(event) => setOpeningBalances((current) => ({ ...current, [value]: event.target.value }))} placeholder="0,00" /></label>)}</form></OverlayDialog>
      <OverlayDialog open={movementOpen && Boolean(session)} title="Nouveau mouvement de caisse" onClose={() => setMovementOpen(false)} topbarActions={<OverlayActionButton icon={<OverlaySaveIcon />} className="primary-button overlay-save-button" type="submit" form="cash-movement-form">{movement.type === "out" ? "Créer un bon de sortie" : "Enregistrer le mouvement"}</OverlayActionButton>}>{session && <form id="cash-movement-form" className="stack-form cash-opening-form" onSubmit={saveMovement}><div className="cash-opening-intro">Enregistrez un encaissement directement dans la session active. Les décaissements sont gérés via un bon de sortie pour rester liés à la caisse.</div><label>Type<select value={movement.type} onChange={(event) => setMovement({ ...movement, type: event.target.value })}><option value="in">Encaissement</option><option value="out">Décaissement</option></select></label>{movement.type === "out" && <p className="field-hint">Vous serez redirigé vers la création d’un bon de sortie.</p>}<label>Devise<select value={movement.currency} onChange={(event) => setMovement({ ...movement, currency: event.target.value })}>{currencies.map(([value, label]) => <option key={value} value={value}>{value} — {label}</option>)}</select></label><label>Montant ({movement.currency})<input autoFocus type="number" min="0.01" step="0.01" required value={movement.amount} onChange={(event) => setMovement({ ...movement, amount: event.target.value })} /></label><label>Description<input required value={movement.description} onChange={(event) => setMovement({ ...movement, description: event.target.value })} placeholder="Ex. Paiement facture FAC-2026-0001" /></label></form>}</OverlayDialog>
      <OverlayDialog open={closingOpen && Boolean(session)} title="Clôturer la caisse" onClose={() => setClosingOpen(false)} topbarActions={<OverlayActionButton icon={<OverlaySaveIcon />} className="primary-button overlay-save-button" type="submit" form="cash-closing-form">Confirmer la clôture</OverlayActionButton>}>{session && <form id="cash-closing-form" className="stack-form cash-opening-form" onSubmit={closeRegister}><div className="cash-opening-intro">Saisissez le montant réellement compté pour chaque devise. La session du jour sera définitivement clôturée et le rapport journalier pourra être imprimé.</div>{Object.keys(session.expectedBalances || { [session.currency]: session.expectedBalance }).map((balanceCurrency) => <label key={balanceCurrency}>Fonds final ({balanceCurrency})<input autoFocus={balanceCurrency === session.currency} type="number" min="0" step="0.01" required value={closingBalances[balanceCurrency] || ""} onChange={(event) => setClosingBalances((current) => ({ ...current, [balanceCurrency]: event.target.value }))} /></label>)}</form>}</OverlayDialog>
      <OverlayDialog open={resetOpen} title="Réinitialiser les données de caisse" onClose={() => { if (!resetting) { setResetOpen(false); setResetConfirmation(""); } }} topbarActions={<><button className="secondary-button" type="button" onClick={() => { setResetOpen(false); setResetConfirmation(""); }} disabled={resetting}>Annuler</button><button className="danger-button" type="submit" form="cash-reset-form" disabled={resetting || resetConfirmation !== "SUPPRIMER CAISSE"}>{resetting ? "Suppression…" : "Supprimer définitivement"}</button></>}><form id="cash-reset-form" className="stack-form cash-opening-form" onSubmit={resetRegister}><div className="cash-reset-warning"><strong>Action irréversible</strong><p>Cette opération supprimera les sessions, mouvements, décaissements, versements et rapports de caisse.</p><p>Les clients, factures et paiements seront conservés.</p></div><label>Saisissez <strong>SUPPRIMER CAISSE</strong> pour confirmer<input autoFocus value={resetConfirmation} onChange={(event) => setResetConfirmation(event.target.value)} autoCapitalize="characters" autoCorrect={false} /></label></form></OverlayDialog>
    </div>
  );
}
