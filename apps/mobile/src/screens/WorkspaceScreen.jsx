import { useEffect, useState } from "react";
import { BackHandler, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { CashScreen } from "./CashScreen";
import { ClientDetailScreen } from "./ClientDetailScreen";
import { ClientsScreen } from "./ClientsScreen";
import { InvoicesScreen } from "./InvoicesScreen";
import { DashboardScreen } from "./DashboardScreen";
import { InvoiceDetailScreen } from "./InvoiceDetailScreen";
import { UserSettingsModal } from "../components/UserSettingsModal";
import { useThemeStyles } from "../styles";

const tabLabels = { dashboard: "Tableau de bord", invoices: "Factures", clients: "Clients", cash: "Caisse" };

export function WorkspaceScreen({ apiUrl, token, user, theme, onThemeChange, onUserChange, onClearCache, onLogout, onChangeApi, appVersion }) {
  const styles = useThemeStyles();
  const [route, setRoute] = useState({ type: "tab", view: "dashboard" });
  const [settingsOpen, setSettingsOpen] = useState(false);
  function openInvoice(invoice) { const invoiceId = invoice?.id || invoice?.invoiceId; if (invoiceId) setRoute({ type: "invoice", invoiceId, returnRoute: route }); }
  function openClient(client) { setRoute({ type: "client", client, returnRoute: route }); }
  function goBack() { setRoute(route.returnRoute || { type: "tab", view: "dashboard" }); }
  useEffect(() => {
    if (route.type === "tab") return undefined;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => { goBack(); return true; });
    return () => subscription.remove();
  }, [route]);
  const view = route.type === "tab" ? route.view : route.returnRoute?.view || "dashboard";
  const content = route.type === "invoice"
    ? <InvoiceDetailScreen apiUrl={apiUrl} token={token} invoiceId={route.invoiceId} onBack={goBack} />
    : route.type === "client"
      ? <ClientDetailScreen client={route.client} onBack={goBack} />
      : { dashboard: <DashboardScreen apiUrl={apiUrl} token={token} onInvoicePress={openInvoice} />, invoices: <InvoicesScreen apiUrl={apiUrl} token={token} onInvoicePress={openInvoice} />, clients: <ClientsScreen apiUrl={apiUrl} token={token} onClientPress={openClient} />, cash: <CashScreen apiUrl={apiUrl} token={token} /> }[view];
  const title = route.type === "invoice" ? "Détail facture" : route.type === "client" ? "Fiche client" : tabLabels[view];
  const tabs = [["dashboard", "Accueil", "home-outline", "home"], ["invoices", "Factures", "receipt-outline", "receipt"], ["clients", "Clients", "people-outline", "people"], ["cash", "Caisse", "wallet-outline", "wallet"]];
  return <SafeAreaView style={styles.safe}><View style={styles.workspace}><View style={styles.workspaceHeader}><View><Text style={styles.workspaceTitle}>{title}</Text><Text style={styles.muted}>{route.type === "tab" ? `Bonjour ${user?.name || user?.username}` : "Informations complètes"}</Text></View><View style={styles.headerActions}><Pressable onPress={() => setSettingsOpen(true)} style={styles.settingsButton} accessibilityLabel="Ouvrir les paramètres utilisateur"><Ionicons name="settings-outline" size={21} color={theme === "dark" ? "#6ee7b7" : "#126f5b"} /></Pressable><Pressable onPress={onLogout}><Text style={styles.link}>Sortir</Text></Pressable></View></View><View style={styles.viewArea}>{content}</View>{route.type === "tab" ? <View style={styles.tabbar}>{tabs.map(([key, label, icon, activeIcon]) => <Pressable key={key} onPress={() => setRoute({ type: "tab", view: key })} style={[styles.tab, view === key && styles.tabActive]} accessibilityRole="tab" accessibilityState={{ selected: view === key }}><Ionicons name={view === key ? activeIcon : icon} size={21} color={view === key ? "#126f5b" : "#718079"} /><Text style={[styles.tabText, view === key && styles.tabTextActive]}>{label}</Text></Pressable>)}</View> : null}<UserSettingsModal visible={settingsOpen} apiUrl={apiUrl} token={token} user={user} theme={theme} onThemeChange={onThemeChange} onUserChange={onUserChange} onClearCache={onClearCache} appVersion={appVersion} onChangeApi={() => { setSettingsOpen(false); onChangeApi?.(); }} onLogout={onLogout} onClose={() => setSettingsOpen(false)} /></View></SafeAreaView>;
}
