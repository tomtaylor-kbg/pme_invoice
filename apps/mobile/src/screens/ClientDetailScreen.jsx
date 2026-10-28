import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStyles } from "../styles";

export function ClientDetailScreen({ client, onBack }) {
  const styles = useThemeStyles();
  const name = client.company || `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Client";
  return <ScrollView contentContainerStyle={styles.content}><View style={styles.invoiceDetailShell}>
    <View style={styles.invoiceDetailHeader}><Pressable onPress={onBack} style={styles.invoiceDetailBack} accessibilityLabel="Retour aux clients"><Ionicons name="arrow-back" size={21} color="#a3aebf" /></Pressable><Text style={styles.invoiceDetailHeaderTitle}>Fiche client</Text><Pressable style={styles.invoiceDetailMenu} accessibilityLabel="Options du client"><Text style={styles.invoiceDetailMenuText}>⋮</Text></Pressable></View>
    <View style={styles.invoiceDetailBody}><View style={{ alignItems: "center", flexDirection: "row", gap: 12, paddingBottom: 2 }}><View style={styles.avatar}><Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text></View><View><Text style={styles.detailNumber}>{name}</Text><Text style={styles.muted}>{client.clientType === "company" ? "Entreprise" : "Client particulier"}</Text></View></View>
    <View style={styles.detailSection}>
      <Text style={styles.detailSectionTitle}>Coordonnées</Text>
      <View style={styles.detailGrid}>
        <View style={styles.detailField}><Text style={styles.detailLabel}>E-mail</Text><Text style={styles.detailValue}>{client.email && !String(client.email).endsWith("local.invalid") ? client.email : "—"}</Text></View>
        <View style={styles.detailField}><Text style={styles.detailLabel}>Téléphone</Text><Text style={styles.detailValue}>{client.phone || "—"}</Text></View>
        <View style={styles.detailField}><Text style={styles.detailLabel}>Ville</Text><Text style={styles.detailValue}>{client.city || "—"}</Text></View>
        <View style={styles.detailField}><Text style={styles.detailLabel}>Statut</Text><Text style={styles.detailValue}>{client.status || "—"}</Text></View>
      </View>
    </View></View></View></ScrollView>;
}
