import { useEffect, useRef } from "react";
import {
  slug,
  money,
  personLabel,
  clientTypeLabel,
  receiptWidthLabel,
  receiptTone,
  statusToLabel,
  invoiceTemplateLabel,
  invoicePaymentStatusLabel,
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

export function OverlayDialog({ title, open, onClose, children, topbarActions, className = "" }) {
  const bodyRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const frame = window.requestAnimationFrame(() => {
      const focusable = bodyRef.current?.querySelector("input, select, textarea, button");
      if (focusable && typeof focusable.focus === "function") {
        focusable.focus();
      }
    });
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

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

export function Table({ columns, rows }) {
  return (
    <div className="table-shell">
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

export function InvoiceCard({ invoice, onEdit, onDelete, onPayments, loading, tone = "invoice" }) {
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
          <span>{invoiceTemplateLabel(invoice.templateType)}</span>
        </div>
        <span className="entity-badge invoice-badge-stack">
          <span>{statusToLabel(invoice.status)}</span>
          <span>{paymentStatus}</span>
        </span>
      </div>

      <div className="invoice-card-summary">
        <div>
          <span>Créée par</span>
          <strong>{invoice.creator?.name || invoice.creator?.email || "session courante"}</strong>
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

      {onPayments ? (
        <div className="entity-actions">
          <button type="button" className="text-button" onClick={onPayments}>
            Paiements
          </button>
        </div>
      ) : null}

      {actions ? <div className="entity-actions">{actions}</div> : null}
    </article>
  );
}

export function ClientCard({ client, onEdit, onDelete, loading }) {
  return (
    <EntityCard
      title={personLabel(client) || "Client"}
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

export function ReceiptPreview({ receipt }) {
  const width = Number(receipt.paperWidthMm || 58);
  const sampleItems = [
    { label: "Article A", total: 12.0 },
    { label: "Article B", total: 8.5 },
    { label: "Article C", total: 4.5 }
  ];
  const subtotal = sampleItems.reduce((sum, item) => sum + item.total, 0);
  const tax = receipt.showTax ? subtotal * 0.18 : 0;
  const total = subtotal + tax;

  return (
    <div className={`receipt-preview ${receiptTone(width)}`}>
      <div className="receipt-preview-top">
        <strong>{receipt.title}</strong>
        {receipt.subtitle ? <span>{receipt.subtitle}</span> : null}
        <span>{receiptWidthLabel(width)}</span>
      </div>
      <div className="receipt-lines">
        {sampleItems.map((item) => (
          <div key={item.label} className="receipt-line">
            <span>{item.label}</span>
            <strong>{money(item.total)}</strong>
          </div>
        ))}
      </div>
      <div className="receipt-totals">
        <div>
          <span>Sous-total</span>
          <strong>{money(subtotal)}</strong>
        </div>
        {receipt.showTax ? (
          <div>
            <span>TVA</span>
            <strong>{money(tax)}</strong>
          </div>
        ) : null}
        <div className="receipt-grand-total">
          <span>Total</span>
          <strong>{money(total)}</strong>
        </div>
      </div>
      {receipt.footerText ? <p className="receipt-footer">{receipt.footerText}</p> : null}
    </div>
  );
}

export function ReceiptCard({ receipt, onEdit, onDelete, loading }) {
  return (
    <EntityCard
      title={receipt.name}
      badge={
        <div className="receipt-badge-stack">
          <span>{receiptWidthLabel(receipt.paperWidthMm)}</span>
          <span>{statusToLabel(receipt.status)}</span>
        </div>
      }
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
      tone="receipt"
    >
      <ReceiptPreview receipt={receipt} />
    </EntityCard>
  );
}
