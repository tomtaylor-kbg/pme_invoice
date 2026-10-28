import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatAmount, request } from "../api";
import { invoiceStatusLabels, Loading } from "../components/Common";
import { useThemeStyles } from "../styles";

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
}

function DetailField({ label, value }) {
  const styles = useThemeStyles();
  return <View style={styles.detailField}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value || "—"}</Text></View>;
}

export function InvoiceDetailScreen({ apiUrl, token, invoiceId, onBack }) {
  const styles = useThemeStyles();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    if (!invoiceId) {
      setError("Identifiant de facture manquant.");
      return () => { active = false; };
    }
    request(apiUrl, `/api/invoices/${encodeURIComponent(invoiceId)}`, { token })
      .then((result) => active && setInvoice(result))
      .catch((requestError) => active && setError(requestError.message))
      .finally(() => active && setInvoice((current) => current || undefined));
    return () => { active = false; };
  }, [apiUrl, invoiceId, token]);

  if (!invoice && !error) return <Loading />;
  if (error) return <ScrollView contentContainerStyle={styles.content}><Pressable onPress={onBack} style={styles.backButton}><Text style={styles.backText}>‹ Retour</Text></Pressable><Text style={styles.error}>{error}</Text></ScrollView>;
  const clientName = invoice.client?.displayName || invoice.client?.company || "Client non renseigné";
  const status = invoiceStatusLabels[invoice.status] || invoice.status || "—";
  const paid = invoice.status === "paid" || Number(invoice.balanceDue || 0) === 0;
  return <ScrollView contentContainerStyle={styles.content}>
    <View style={styles.invoiceDetailShell}>
      <View style={styles.invoiceDetailHeader}><Pressable onPress={onBack} style={styles.invoiceDetailBack} accessibilityLabel="Retour aux factures"><Ionicons name="arrow-back" size={21} color="#a3aebf" /></Pressable><Text style={styles.invoiceDetailHeaderTitle}>{invoice.number || "Facture"}</Text><Pressable style={styles.invoiceDetailMenu} accessibilityLabel="Options de la facture"><Text style={styles.invoiceDetailMenuText}>⋮</Text></Pressable></View>
      <View style={styles.invoiceDetailBody}>
        <View style={styles.detailTopline}><Text style={styles.statusPill}>{status}</Text></View>
        <Text style={styles.detailTotal}>{formatAmount(invoice.total, invoice.currency || "USD")}</Text>
        <Text style={styles.muted}>{paid ? `Émise le ${formatDate(invoice.issueDate)}` : `${formatAmount(invoice.balanceDue || 0, invoice.currency || "USD")} restant dû`}</Text>
        <View style={styles.detailSection}><View style={styles.detailGrid}><DetailField label="Client" value={clientName} /><DetailField label={paid ? "Solde dû" : "Échéance"} value={paid ? formatAmount(invoice.balanceDue, invoice.currency || "USD") : formatDate(invoice.dueDate)} /></View></View>
        <View style={styles.detailSection}><Text style={styles.detailSectionTitle}>Lignes</Text>{invoice.lines?.length ? invoice.lines.map((line, index) => <View style={styles.detailLine} key={line.id || `${line.description}-${index}`}><View style={styles.rowBody}><Text style={styles.rowTitle}>{line.description || "Article"}</Text><Text style={styles.muted}>{line.quantity || 0} × {formatAmount(line.unitPrice, invoice.currency || "USD")}</Text></View><Text style={styles.rowAmount}>{formatAmount(line.lineTotal, invoice.currency || "USD")}</Text></View>) : <Text style={styles.muted}>Aucune ligne détaillée.</Text>}</View>
        {invoice.payments?.length ? <View style={styles.detailSection}><Text style={styles.detailSectionTitle}>Paiements</Text>{invoice.payments.map((payment) => <View style={styles.detailLine} key={payment.id}><View style={styles.rowBody}><Text style={styles.rowTitle}>{payment.method || "Paiement"}</Text><Text style={styles.muted}>{formatDate(payment.paidAt)}</Text></View><Text style={styles.rowAmount}>{formatAmount(payment.amount, invoice.currency || "USD")}</Text></View>)}</View> : null}
      </View>
      <View style={styles.invoiceDetailFooter}><Pressable style={styles.detailActionSecondary}><Text style={styles.detailActionSecondaryText}>{paid ? "Partager" : "Ticket"}</Text></Pressable><Pressable style={styles.detailActionPrimary}><Text style={styles.detailActionPrimaryText}>{paid ? "Imprimer le ticket" : "Enregistrer un paiement"}</Text></Pressable></View>
    </View>
  </ScrollView>;
}
