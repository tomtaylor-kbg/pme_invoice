import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatAmount, request } from "../api";
import { Loading } from "../components/Common";
import { useThemeStyles } from "../styles";

const statusLabels = { pending: "En attente", assigned: "Assignée", processing: "En cours", blocked: "Bloquée", completed: "Terminée", validated: "Validée", delivered: "Livrée", invoiced: "Facturée" };
const progress = [["pending", "En attente"], ["assigned", "Assignée"], ["processing", "En cours"], ["completed", "Terminée"], ["invoiced", "Facturée"]];

function formatDate(value) { if (!value) return "—"; return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value)); }

export function OrderDetailScreen({ apiUrl, token, orderId, onBack }) {
  const styles = useThemeStyles();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    request(apiUrl, `/api/orders/${encodeURIComponent(orderId)}`, { token }).then((result) => active && setOrder(result)).catch((requestError) => active && setError(requestError.message)).finally(() => active && setOrder((current) => current || undefined));
    return () => { active = false; };
  }, [apiUrl, orderId, token]);
  const currentStep = useMemo(() => progress.findIndex(([value]) => value === order?.status), [order?.status]);
  if (!order && !error) return <Loading />;
  if (error) return <ScrollView contentContainerStyle={styles.content}><Pressable onPress={onBack} style={styles.backButton}><Text style={styles.backText}>‹ Retour aux commandes</Text></Pressable><Text style={styles.error}>{error}</Text></ScrollView>;
  const clientName = order.client?.company || order.client?.displayName || "Client ponctuel";
  return <ScrollView contentContainerStyle={styles.content}><View style={styles.invoiceDetailShell}>
    <View style={styles.invoiceDetailHeader}><Pressable onPress={onBack} style={styles.invoiceDetailBack} accessibilityLabel="Retour aux commandes"><Ionicons name="arrow-back" size={21} color="#a3aebf" /></Pressable><Text style={styles.invoiceDetailHeaderTitle}>{order.number || "Commande"}</Text><Pressable style={styles.invoiceDetailMenu} accessibilityLabel="Options de la commande"><Text style={styles.invoiceDetailMenuText}>⋮</Text></Pressable></View>
    <View style={styles.invoiceDetailBody}><View style={styles.orderDetailHeading}><View><Text style={styles.detailNumber}>{order.number || "Commande"}</Text><Text style={styles.muted}>{clientName} · {formatAmount(order.total, order.currency || "USD")}</Text></View><Text style={[styles.statusPill, order.status === "blocked" && styles.orderDetailBlocked]}>{statusLabels[order.status] || order.status || "—"}</Text></View>
      <View style={styles.orderProgress}>{progress.map(([value, label], index) => <View style={styles.orderProgressStep} key={value}><View style={[styles.orderProgressDot, index <= currentStep && styles.orderProgressDotActive, order.status === "blocked" && value === "processing" && styles.orderProgressDotBlocked]} /><Text style={[styles.orderProgressLabel, index === currentStep && styles.orderProgressLabelActive]}>{label}</Text></View>)}</View>
      <View style={styles.detailSection}><Text style={styles.detailSectionTitle}>Résumé</Text><View style={styles.detailGrid}><View style={styles.detailField}><Text style={styles.detailLabel}>Client</Text><Text style={styles.detailValue}>{clientName}</Text></View><View style={styles.detailField}><Text style={styles.detailLabel}>Échéance</Text><Text style={styles.detailValue}>{formatDate(order.dueDate)}</Text></View><View style={styles.detailField}><Text style={styles.detailLabel}>Priorité</Text><Text style={styles.detailValue}>{order.priority === "urgent" ? "Urgente" : "Normale"}</Text></View><View style={styles.detailField}><Text style={styles.detailLabel}>Opérateur</Text><Text style={styles.detailValue}>{order.operator?.name || "Non assigné"}</Text></View></View></View>
      <View style={styles.detailSection}><Text style={styles.detailSectionTitle}>Travail demandé</Text>{order.lines?.length ? order.lines.map((line, index) => <View style={styles.detailLine} key={line.id || `${line.description}-${index}`}><View style={styles.rowBody}><Text style={styles.rowTitle}>{line.description || "Travail"}</Text><Text style={styles.muted}>{line.quantity || 0} × {line.unit || "unité"}</Text></View></View>) : <Text style={styles.muted}>Aucun travail détaillé.</Text>}</View>
      <View style={styles.detailSection}><Text style={styles.detailSectionTitle}>Historique</Text>{order.events?.length ? order.events.map((event) => <View style={styles.detailLine} key={event.id}><View style={styles.rowBody}><Text style={styles.rowTitle}>{event.action || "Mise à jour"}</Text><Text style={styles.muted}>{event.user?.name || "Système"} · {formatDate(event.createdAt)}</Text></View></View>) : <Text style={styles.muted}>Aucun historique disponible.</Text>}</View>
    </View>
  </View></ScrollView>;
}
