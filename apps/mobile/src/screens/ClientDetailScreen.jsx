import { Pressable, ScrollView, Text, View } from "react-native";
import { useThemeStyles } from "../styles";

export function ClientDetailScreen({ client, onBack }) {
  const styles = useThemeStyles();
  const name = client.company || `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Client";
  return <ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={onBack} style={styles.backButton}><Text style={styles.backText}>‹ Retour aux clients</Text></Pressable>
    <View style={styles.invoiceDetailCard}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text></View>
      <Text style={styles.detailNumber}>{name}</Text>
      <Text style={styles.muted}>{client.clientType === "company" ? "Entreprise" : "Client particulier"}</Text>
    </View>
    <View style={styles.detailSection}>
      <Text style={styles.detailSectionTitle}>Coordonnées</Text>
      <View style={styles.detailGrid}>
        <View style={styles.detailField}><Text style={styles.detailLabel}>E-mail</Text><Text style={styles.detailValue}>{client.email || "—"}</Text></View>
        <View style={styles.detailField}><Text style={styles.detailLabel}>Téléphone</Text><Text style={styles.detailValue}>{client.phone || "—"}</Text></View>
        <View style={styles.detailField}><Text style={styles.detailLabel}>Ville</Text><Text style={styles.detailValue}>{client.city || "—"}</Text></View>
        <View style={styles.detailField}><Text style={styles.detailLabel}>Statut</Text><Text style={styles.detailValue}>{client.status || "—"}</Text></View>
      </View>
    </View>
  </ScrollView>;
}
