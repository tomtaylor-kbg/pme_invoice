import { useEffect, useRef } from "react";
import {
  slug,
  money,
  personLabel,
  clientTypeLabel,
  invoicePaymentStatusLabel,
  invoiceSettlementStatus,
  invoiceDisplayLabel
} from "../utils/formatters";

export function Badge({ value }) {
  return <span className={`badge ${slug(value)}`}>{value}</span>;
}

export function StatCard({ label, value, tone }) {
  return (
    <article className={`stat-card ${tone}`}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
    </article>
  );
}

export function SectionHeader({ title, buttonLabel, onButtonClick }) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
      </div>
      {buttonLabel ? (
        <button className="ghost-button" onClick={onButtonClick} type="button">
          {buttonLabel}
        </button>
      ) : null}
    </div>
  );
}

export function ToastViewport({ toasts, onDismiss }) {
  if (!toasts?.length) {
    return null;
  }

  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <article key={toast.id} className={`toast-item ${toast.tone || "info"}`}>
          <div className="toast-copy">
            <strong>{toast.title}</strong>
            {toast.message ? <p>{toast.message}</p> : null}
          </div>
          <button type="button" className="toast-dismiss" onClick={() => onDismiss(toast.id)} aria-label="Fermer le message">
            ×
          </button>
        </article>
      ))}
    </div>
  );
}

function OverlayActionIcon({ children }) {
  return (
    <svg viewBox="0 0 24 24" className="overlay-action-svg" aria-hidden="true">
      {children}
    </svg>
  );
}

export function OverlayPreviewIcon() {
  return (
    <OverlayActionIcon>
      <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </OverlayActionIcon>
  );
}

export function OverlaySaveIcon() {
  return (
    <OverlayActionIcon>
      <path d="M5 4h10l4 4v12H5z" />
      <path d="M8 4v6h8V4" />
      <path d="M8 15h8" />
    </OverlayActionIcon>
  );
}

export function OverlayCloseIcon() {
  return (
    <OverlayActionIcon>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </OverlayActionIcon>
  );
}

export function OverlayActionButton({ icon, children, className = "", ...props }) {
  return (
    <button type="button" className={`overlay-head-button${className ? ` ${className}` : ""}`} {...props}>
      <span className="overlay-head-button-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="overlay-head-button-label">{children}</span>
    </button>
  );
}

export function DataLoadingState({ label = "Chargement…", className = "" }) {
  return (
    <div className={`data-loading-state${className ? ` ${className}` : ""}`} role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
      <span>{label}</span>
      <span className="loading-track" aria-hidden="true"><span /></span>
    </div>
  );
}

export function OverlayDialog({ title, open, onClose, children, topbarActions, className = "" }) {
  const bodyRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current?.();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const frame = window.requestAnimationFrame(() => {
      const focusable = bodyRef.current?.querySelector(
        'input:not([type="hidden"]):not([readonly]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
      );
      if (focusable && typeof focusable.focus === "function") {
        focusable.focus();
      }
    });
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="overlay-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className={`overlay-panel${className ? ` ${className}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="overlay-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="overlay-head">
          <div>
            <h2 id="overlay-title">{title}</h2>
          </div>
          <div className="overlay-head-actions">
            {topbarActions}
            <button type="button" className="ghost-button overlay-head-button overlay-close-button" onClick={onClose}>
              <span className="overlay-head-button-icon" aria-hidden="true">
                <OverlayCloseIcon />
              </span>
              <span className="overlay-head-button-label">Fermer</span>
            </button>
          </div>
        </div>

        <div className="overlay-body" ref={bodyRef}>{children}</div>
      </div>
    </div>
  );
}

export function Table({ columns, rows, className = "" }) {
  return (
    <div className={`table-shell ${className}`.trim()}>
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const tableActionPaths = {
  open: <><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
  edit: <><path d="m4 16-.8 4.8L8 20l10.8-10.8a2.2 2.2 0 0 0-3.1-3.1L4 16Z" /><path d="m14.5 7.5 2 2" /></>,
  print: <><path d="M6 9V4h12v5" /><path d="M6 17H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v6H6z" /></>,
  invoice: <><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 12h7M9 16h5" /></>,
  payments: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" /></>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
  play: <><path d="m8 5 11 7-11 7V5Z" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  block: <><circle cx="12" cy="12" r="8.5" /><path d="m6 6 12 12" /></>,
  delete: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" /></>
};

export function TableAction({ label, icon = "open", danger = false, className = "", ...props }) {
  return <button {...props} type="button" className={`table-icon-action${danger ? " danger" : ""}${className ? ` ${className}` : ""}`} aria-label={label} title={label}>
    <svg viewBox="0 0 24 24" aria-hidden="true">{tableActionPaths[icon] || tableActionPaths.open}</svg><span>{label}</span>
  </button>;
}

export function EntityCard({ title, subtitle, badge, meta, children, actions, tone = "neutral" }) {
  return (
    <article className={`entity-card ${tone}`}>
      <div className="entity-card-head">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {badge ? <div className="entity-badge">{badge}</div> : null}
      </div>
      {meta ? <div className="entity-meta">{meta}</div> : null}
      {children}
      {actions ? <div className="entity-actions">{actions}</div> : null}
    </article>
  );
}

export function InvoiceCard({ invoice, onEdit, onDelete, onPayments, onPrint, loading, tone = "invoice" }) {
  const paymentStatus = invoicePaymentStatusLabel(invoice);
  const actions = onEdit || onDelete ? (
    <>
      {onEdit ? (
        <button type="button" className="text-button" onClick={onEdit}>
          Ouvrir
        </button>
      ) : null}
      {onDelete ? (
        <button type="button" className="text-button danger" onClick={onDelete} disabled={loading}>
          Supprimer
        </button>
      ) : null}
    </>
  ) : null;

  return (
    <article className={`entity-card invoice ${tone}`}>
      <div className="entity-card-head invoice-card-head">
        <div className="invoice-card-title">
          <h3>{invoiceDisplayLabel(invoice)}</h3>
          <p>{personLabel(invoice.client) || invoice.client?.displayName || invoice.client?.company || "-"}</p>
        </div>
        <span className="entity-badge invoice-badge-stack">
          <span className={invoiceSettlementStatus(invoice)}>{invoicePaymentStatusLabel(invoice)}</span>
          <span>{paymentStatus}</span>
        </span>
      </div>

      <div className="invoice-card-summary">
        <div>
          <span>Créée par</span>
          <strong>Directeur</strong>
        </div>
        <div>
          <span>Montant</span>
          <strong>{money(invoice.total, invoice.currency)}</strong>
        </div>
        <div>
          <span>Payé</span>
          <strong>{money(invoice.amountPaid ?? 0, invoice.currency)}</strong>
        </div>
        <div>
          <span>Reste</span>
          <strong>{money(invoice.balanceDue ?? invoice.total ?? 0, invoice.currency)}</strong>
        </div>
      </div>

      {onPayments || onPrint ? (
        <div className="entity-actions">
          {onPayments && <button type="button" className="text-button" onClick={onPayments}>Paiements</button>}
          {onPrint && <button type="button" className="text-button" onClick={onPrint}>Imprimer ticket</button>}
        </div>
      ) : null}

      {actions ? <div className="entity-actions">{actions}</div> : null}
    </article>
  );
}

export function ClientCard({ client, onEdit, onDelete, loading }) {
  return (
    <EntityCard
      title={client.clientType === "company" ? client.company || "Entité" : personLabel(client) || "Client"}
      badge={clientTypeLabel(client.clientType)}
      actions={
        <>
          <button type="button" className="text-button" onClick={onEdit}>
            Modifier
          </button>
          <button type="button" className="text-button danger" onClick={onDelete} disabled={loading}>
            Supprimer
          </button>
        </>
      }
      tone="client"
    >
    </EntityCard>
  );
}
