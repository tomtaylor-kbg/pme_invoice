import { useEffect, useMemo, useRef, useState } from "react";
import { convertOrderToInvoice, createDeliveryNote, createOrder, getOrderOperators, getOrders, updateOrder } from "../../api";
import { useWorkspace } from "../WorkspaceProvider";
import { DataLoadingState, OverlayActionButton, OverlayDialog, OverlaySaveIcon } from "../ui";
import { money, todayISO } from "../../utils/formatters";

const managerColumns = [["pending", "En attente"], ["assigned", "Assignées"], ["processing", "En cours"], ["blocked", "Bloquées"], ["completed", "Terminées"], ["validated", "Validées"], ["delivered", "Livrées"], ["invoiced", "Facturées"]];
const operatorColumns = [["assigned", "À démarrer"], ["processing", "En cours"], ["blocked", "Bloquées"], ["completed", "Terminées"]];
const priorityLabels = { low: "Basse", normal: "Normale", high: "Haute", urgent: "Urgente" };
const statusLabels = { pending: "En attente", assigned: "Affectée", processing: "En cours", blocked: "Bloquée", completed: "Terminée", validated: "Validée", delivered: "Livrée", invoiced: "Facturée", cancelled: "Annulée" };
const actionLabels = { created: "Créée", assigned: "Affectée", started: "Démarrée", blocked: "Bloquée", completed: "Terminée", validated: "Validée", delivered: "Livrée", invoiced: "Facturée", cancelled: "Annulée", status_changed: "Statut modifié", updated: "Modifiée" };
const currencies = ["EUR", "USD", "CDF"];
function blankLine() { return { description: "", quantity: "1", unit: "unité", unitPrice: "" }; }

export function OrdersPage() {
  const { token, data, user, workspaceSettings, notifySuccess, notifyError } = useWorkspace();
  const isManager = ["admin", "receptionist", "order_manager"].includes(user?.role);
  const isOperator = user?.role === "order_operator";
  const canViewOrderAmount = ["admin", "receptionist"].includes(user?.role);
  const columns = isManager ? managerColumns : operatorColumns;
  const [orders, setOrders] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterOperator, setFilterOperator] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const loadedKey = useRef("");
  const [form, setForm] = useState({ clientId: "", issueDate: todayISO(), dueDate: todayISO(), priority: "normal", currency: currencies.includes(workspaceSettings.defaultCurrency) ? workspaceSettings.defaultCurrency : "EUR", notes: "", lines: [blankLine()] });

  function replaceOrder(updated) {
    if (!updated?.id) return;
    setOrders((current) => current.some((order) => order.id === updated.id)
      ? current.map((order) => order.id === updated.id ? updated : order)
      : [updated, ...current]);
    setSelectedOrder((current) => current?.id === updated.id ? updated : current);
  }
  async function refresh(force = false) {
    const key = `${token}:${user?.role || ""}`;
    if (!force && loadedKey.current === key) return;
    loadedKey.current = key;
    setLoading(true);
    try {
      const requests = [getOrders(token)];
      if (isManager) requests.push(getOrderOperators(token));
      const [loadedOrders, loadedOperators = []] = await Promise.all(requests);
      setOrders(loadedOrders);
      setOperators(loadedOperators);
    } catch (error) {
      loadedKey.current = "";
      notifyError("Commandes indisponibles", error.message);
    } finally { setLoading(false); }
  }
  useEffect(() => { refresh(); if (!isManager) setOperators([]); }, [token, user?.role]);
  const filteredOrders = useMemo(() => orders.filter((order) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [order.number, order.client?.displayName, order.client?.company, ...order.lines.map((line) => line.description)].some((value) => String(value || "").toLowerCase().includes(query));
    return matchesSearch && (filterStatus === "all" || order.status === filterStatus) && (filterPriority === "all" || order.priority === filterPriority) && (filterOperator === "all" || order.operator?.id === filterOperator);
  }), [orders, search, filterStatus, filterPriority, filterOperator]);
  const grouped = useMemo(() => Object.fromEntries(columns.map(([status]) => [status, filteredOrders.filter((order) => order.status === status)])), [columns, filteredOrders]);
  function updateLine(index, key, value) { setForm((current) => ({ ...current, lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, [key]: value } : line) })); }
  async function save(event) { event.preventDefault(); if (saving) return; setSaving(true); try { const created = await createOrder(token, { ...form, lines: form.lines, managerId: user?.id }); replaceOrder(created); setOpen(false); notifySuccess("Commande créée", "La commande est en attente d’affectation."); } catch (error) { notifyError("Commande non enregistrée", error.message); } finally { setSaving(false); } }
  async function changeStatus(order, status, extra = {}) { try { replaceOrder(await updateOrder(token, order.id, { status, ...extra })); } catch (error) { notifyError("Statut non modifié", error.message); } }
  async function assignOperator(order, operatorId) { try { replaceOrder(await updateOrder(token, order.id, { operatorId: operatorId || null })); } catch (error) { notifyError("Affectation impossible", error.message); } }
  async function blockOrder(order) { const blockedReason = window.prompt("Motif du blocage :", order.blockedReason || ""); if (blockedReason === null || !blockedReason.trim()) return; await changeStatus(order, "blocked", { blockedReason: blockedReason.trim() }); }
  async function convert(order) { try { const invoice = await convertOrderToInvoice(token, order.id); replaceOrder({ ...order, status: "invoiced", convertedInvoice: { id: invoice.id, number: invoice.number } }); notifySuccess("Facture créée", invoice.number); } catch (error) { notifyError("Facturation impossible", error.message); } }
  async function deliver(order) {
    try {
      await createDeliveryNote(token, { clientId: order.clientId, orderId: order.id, issueDate: todayISO(), orderReference: order.number, notes: `Commande ${order.number}`, lines: order.lines.map((line) => ({ description: line.description, quantity: line.quantity, unit: line.unit, unitPrice: line.unitPrice })) });
      replaceOrder(await updateOrder(token, order.id, { status: "delivered" }));
      notifySuccess("Commande livrée", `Le bon de livraison de ${order.number} a été créé.`);
    } catch (error) { notifyError("Livraison impossible", error.message); }
  }

  function renderActions(order) {
    if (isOperator) {
      if (order.status === "assigned") return <button className="primary-button small" type="button" onClick={() => changeStatus(order, "processing")}>Commencer</button>;
      if (order.status === "processing") return <><button className="primary-button small" type="button" onClick={() => changeStatus(order, "completed")}>Terminer</button><button className="secondary-button small" type="button" onClick={() => blockOrder(order)}>Signaler un problème</button></>;
      if (order.status === "blocked") return <button className="primary-button small" type="button" onClick={() => changeStatus(order, "processing", { blockedReason: null })}>Reprendre</button>;
      return null;
    }
    if (order.status === "completed") return <button className="primary-button small" type="button" onClick={() => changeStatus(order, "validated")}>Valider le travail</button>;
    if (order.status === "validated") return <><button className="secondary-button small" type="button" onClick={() => deliver(order)}>Créer le BL et livrer</button><button className="primary-button small" type="button" onClick={() => convert(order)}>Générer la facture</button></>;
    if (order.status === "delivered") return <button className="primary-button small" type="button" onClick={() => convert(order)}>Générer la facture</button>;
    return null;
  }

  return <div className="page-shell workspace-page">
    <header className="hero list-page-header"><div><span className="eyebrow">Atelier</span><h1>{isOperator ? "Mes commandes" : "Commandes"}</h1><p>{isOperator ? "Consultez et faites avancer les commandes qui vous sont affectées." : "Pilotez les commandes de la réception jusqu’à la facturation."}</p></div>{isManager && <div className="hero-actions"><button className="primary-button" type="button" onClick={() => setOpen(true)}>Nouvelle commande</button></div>}</header>
    <div className="page-scroll"><div className="filters-panel list-filters order-filters"><div className="filters-grid"><label className="filter-field search">Rechercher<input className="filter-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="N° commande, client, travail…" /></label><label className="filter-field">Statut<select className="filter-select" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}><option value="all">Tous les statuts</option>{columns.map(([status, label]) => <option key={status} value={status}>{label}</option>)}</select></label><label className="filter-field">Priorité<select className="filter-select" value={filterPriority} onChange={(event) => setFilterPriority(event.target.value)}><option value="all">Toutes</option>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{isManager && <label className="filter-field">Opérateur<select className="filter-select" value={filterOperator} onChange={(event) => setFilterOperator(event.target.value)}><option value="all">Tous</option>{operators.map((operator) => <option key={operator.id} value={operator.id}>{operator.name || operator.email}</option>)}</select></label>}</div></div><section className="kanban-board">{columns.map(([status, label]) => <div className="kanban-column" key={status}><div className="section-header"><h2>{label}</h2><span className="badge">{grouped[status].length}</span></div>{loading ? <DataLoadingState label="Chargement…" /> : grouped[status].map((order) => <article className="kanban-card" key={order.id}><div className="kanban-card-head"><strong>{order.number}</strong><span>{order.client?.company || order.client?.displayName || "Client"}</span></div><div className="order-card-meta"><span className={`badge priority-${order.priority || "normal"}`}>{priorityLabels[order.priority] || "Normale"}</span><span>{order.dueDate ? `Échéance : ${order.dueDate.slice(0, 10)}` : "Sans échéance"}</span></div>{isManager && <label className="kanban-operator">Opérateur<select value={order.operator?.id || ""} onChange={(event) => assignOperator(order, event.target.value)}><option value="">Non attribué</option>{operators.map((operator) => <option key={operator.id} value={operator.id}>{operator.name || operator.email}</option>)}</select></label>}<p>{order.lines.map((line) => `${line.quantity} × ${line.description}`).join(" · ")}</p>{order.status === "blocked" && <p className="order-blocked-reason">Blocage : {order.blockedReason || "Motif non renseigné"}</p>}{canViewOrderAmount && <div className="kanban-card-total">{money(order.total, order.currency)}</div>}<div className="kanban-card-actions"><button className="text-button" type="button" onClick={() => setSelectedOrder(order)}>Détail</button>{renderActions(order)}</div></article>)}</div>)}</section></div>
    <OverlayDialog open={open} title="Nouvelle commande" onClose={() => setOpen(false)} topbarActions={<OverlayActionButton icon={<OverlaySaveIcon />} className="primary-button overlay-save-button" type="submit" form="order-form" disabled={saving}>Créer la commande</OverlayActionButton>}>
      <form id="order-form" className="stack-form invoice-form-grid" onSubmit={save}><label className="invoice-form-field">Client<select required value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })}><option value="">Choisir un client</option>{data.clients.map((client) => <option key={client.id} value={client.id}>{client.company || client.displayName || `${client.firstName} ${client.lastName}`}</option>)}</select></label><label className="invoice-form-field">Date de création<input type="date" required value={form.issueDate} onChange={(event) => setForm({ ...form, issueDate: event.target.value })} /></label><label className="invoice-form-field">Date prévue<input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label><label className="invoice-form-field">Devise<select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })}>{currencies.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label className="invoice-form-field">Priorité<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="low">Basse</option><option value="normal">Normale</option><option value="high">Haute</option><option value="urgent">Urgente</option></select></label><div className="proforma-lines invoice-form-wide"><div className="section-header"><h3>Travail demandé</h3><button className="text-button" type="button" onClick={() => setForm((current) => ({ ...current, lines: [...current.lines, blankLine()] }))}>+ Ajouter</button></div>{form.lines.map((line, index) => <div className="proforma-line" key={index}><label>Description<input required value={line.description} onChange={(event) => updateLine(index, "description", event.target.value)} /></label><label>Qté<input required type="number" min="1" value={line.quantity} onChange={(event) => updateLine(index, "quantity", event.target.value)} /></label><label>Prix unitaire<input required type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => updateLine(index, "unitPrice", event.target.value)} /></label></div>)}</div><label className="invoice-form-field invoice-form-wide">Notes<textarea rows="3" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label></form>
    </OverlayDialog>
    <OverlayDialog open={Boolean(selectedOrder)} title={selectedOrder ? `Commande ${selectedOrder.number}` : "Détail de la commande"} onClose={() => setSelectedOrder(null)}>
      {selectedOrder && <div className="order-detail-panel"><div className="order-detail-grid"><div><span className="eyebrow">Client</span><strong>{selectedOrder.client?.company || selectedOrder.client?.displayName || "Client"}</strong></div><div><span className="eyebrow">État</span><strong>{statusLabels[selectedOrder.status] || selectedOrder.status}</strong></div><div><span className="eyebrow">Échéance</span><strong>{selectedOrder.dueDate ? selectedOrder.dueDate.slice(0, 10) : "—"}</strong></div><div><span className="eyebrow">Priorité</span><strong>{priorityLabels[selectedOrder.priority] || "Normale"}</strong></div><div><span className="eyebrow">Opérateur</span><strong>{selectedOrder.operator?.name || "Non affecté"}</strong></div>{canViewOrderAmount && <div><span className="eyebrow">Montant</span><strong>{money(selectedOrder.total, selectedOrder.currency)}</strong></div>}</div><h3>Travail demandé</h3><ul>{selectedOrder.lines.map((line) => <li key={line.id}>{line.quantity} × {line.description}</li>)}</ul>{selectedOrder.blockedReason && <p className="order-blocked-reason">Blocage : {selectedOrder.blockedReason}</p>}<h3>Historique</h3><div className="order-history">{selectedOrder.events?.length ? selectedOrder.events.map((event) => <div className="order-history-item" key={event.id}><strong>{actionLabels[event.action] || event.action}</strong><span>{event.user?.name || "Système"} · {new Date(event.createdAt).toLocaleString("fr-FR")}</span>{event.note && <small>{event.note}</small>}</div>) : <p className="text-muted">Aucun historique disponible.</p>}</div></div>}
    </OverlayDialog>
  </div>;
}
