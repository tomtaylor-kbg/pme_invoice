import { useEffect, useRef } from "react";
import {
  slug,
  money,
  personLabel,
  clientTypeLabel,
  clientProfileLabel,
  receiptWidthLabel,
  receiptTone,
  statusToLabel,
  invoiceTemplateLabel,
  invoicePaymentStatusLabel
} from "../utils/formatters";

export function Badge({ value }) {
  return <span className={`badge ${slug(value)}`}>{value}</span>;
}

export function StatCard({ label, value, detail, tone }) {
  return (
    <article className={`stat-card ${tone}`}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      <span className="stat-detail">{detail}</span>
    </article>
  );
}

export function SectionHeader({ title, action, buttonLabel, onButtonClick }) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        <p>{action}</p>
      </div>
      {buttonLabel ? (
        <button className="ghost-button" onClick={onButtonClick} type="button">
          {buttonLabel}
        </button>
      ) : null}
    </div>
  );
}

export function OverlayDialog({ title, description, open, onClose, children, footer }) {
  const bodyRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => {
      const focusable = bodyRef.current?.querySelector("input, select, textarea, button");
      if (focusable && typeof focusable.focus === "function") {
        focusable.focus();
      }
    });
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="overlay-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="overlay-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="overlay-title"
        aria-describedby={description ? "overlay-description" : undefined}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="overlay-head">
          <div>
            <h2 id="overlay-title">{title}</h2>
            {description ? (
              <p id="overlay-description">{description}</p>
            ) : null}
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            Fermer
          </button>
        </div>

        <div className="overlay-body" ref={bodyRef}>{children}</div>

        {footer ? <div className="overlay-footer">{footer}</div> : null}
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
          <h3>{invoice.number}</h3>
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

      <div className="invoice-card-note">
        <span className="invoice-card-note-label">Notes</span>
        <p className="entity-note">{invoice.notes || "Aucune note."}</p>
        <div className="invoice-card-note-meta">
          <strong>{invoiceTemplateLabel(invoice.templateType)}</strong>
          <span>{invoice.creator?.name || invoice.creator?.email || "session courante"}</span>
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
      subtitle={client.company || clientProfileLabel(client)}
      badge={clientTypeLabel(client.clientType)}
      meta={
        <>
          <span>{statusToLabel(client.status)}</span>
          <span>{client.email}</span>
          <span>{client.phone || "Téléphone non renseigné"}</span>
          <span>{client.city || "Ville non renseignée"}</span>
        </>
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
      tone="client"
    >
      <p className="entity-note">{client.invoicesCount ?? 0} facture(s) liée(s)</p>
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
      subtitle={receipt.title}
      badge={
        <div className="receipt-badge-stack">
          <span>{receiptWidthLabel(receipt.paperWidthMm)}</span>
          <span>{statusToLabel(receipt.status)}</span>
        </div>
      }
      meta={
        <>
          <span>{receipt.showLogo ? "Logo affiché" : "Sans logo"}</span>
          <span>{receipt.showTax ? "TVA active" : "TVA masquée"}</span>
        </>
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
