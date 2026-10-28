import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { listItems, request, formatAmount } from "../api";
import { ListRow, Loading, SectionTitle } from "../components/Common";
import { useThemeStyles } from "../styles";

const statusLabels = { pending: "En attente", assigned: "Assignée", processing: "En cours", blocked: "Bloquée", completed: "Terminée", validated: "Validée", delivered: "Livrée", invoiced: "Facturée" };

export function OrdersScreen({ apiUrl, token, onOrderPress }) {
  const styles = useThemeStyles();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  async function load(refresh = false) {
    if (refresh) setRefreshing(true); else setLoading(true);
    try { const payload = await request(apiUrl, "/api/orders?page=1&pageSize=25", { token }); setItems(listItems(payload)); setError(""); } catch (requestError) { setError(requestError.message); } finally { setLoading(false); setRefreshing(false); }
  }
  useEffect(() => { load(); }, [apiUrl, token]);
  if (loading) return <Loading />;
  return <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}><SectionTitle title="Commandes" /><Text style={styles.subtitle}>Suivi des commandes en cours</Text>{error ? <Text style={styles.error}>{error}</Text> : items.length ? items.map((order) => <ListRow key={order.id} title={order.number} subtitle={order.client?.displayName || order.client?.company || "Client"} meta={(order.lines || []).map((line) => `${line.quantity} × ${line.description}`).join(" · ")} right={<View><Text style={styles.orderStatus}>{statusLabels[order.status] || order.status}</Text>{order.total !== undefined ? <Text style={styles.rowAmount}>{formatAmount(order.total, order.currency || "USD")}</Text> : null}</View>} onPress={() => onOrderPress?.(order)} />) : <Text style={styles.muted}>Aucune commande à afficher.</Text>}</ScrollView>;
}
