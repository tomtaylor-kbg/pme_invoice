import { slug, money, formatDate, personLabel, receiptWidthLabel, receiptTone, statusToLabel } from "../utils/formatters";

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
        {badge ? <span className="entity-badge">{badge}</span> : null}
      </div>
      {meta ? <div className="entity-meta">{meta}</div> : null}
      {children}
      {actions ? <div className="entity-actions">{actions}</div> : null}
    </article>
  );
}

export function InvoiceCard({ invoice, onEdit, onDelete, loading, tone = "invoice" }) {
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
    <EntityCard
      title={invoice.number}
      subtitle={personLabel(invoice.client) || invoice.client?.displayName || invoice.client?.company || "-"}
      badge={statusToLabel(invoice.status)}
      meta={
        <>
          <span>{money(invoice.total)}</span>
          <span>{formatDate(invoice.dueDate)}</span>
        </>
      }
      actions={actions}
      tone={tone}
    >
      <p className="entity-note">{invoice.notes || "Aucune note."}</p>
    </EntityCard>
  );
}

export function ClientCard({ client, onEdit, onDelete, loading }) {
  return (
    <EntityCard
      title={personLabel(client) || "Client"}
      subtitle={client.company || "Client particulier"}
      badge={statusToLabel(client.status)}
      meta={
        <>
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
      badge={`${receiptWidthLabel(receipt.paperWidthMm)} · ${statusToLabel(receipt.status)}`}
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
