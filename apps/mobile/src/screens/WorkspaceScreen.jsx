import { useEffect, useState } from "react";
import { BackHandler, Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CashScreen } from "./CashScreen";
import { ClientDetailScreen } from "./ClientDetailScreen";
import { ClientsScreen } from "./ClientsScreen";
import { InvoicesScreen } from "./InvoicesScreen";
import { OrdersScreen } from "./OrdersScreen";
import { OrderDetailScreen } from "./OrderDetailScreen";
import { DashboardScreen } from "./DashboardScreen";
import { InvoiceDetailScreen } from "./InvoiceDetailScreen";
import { UserSettingsModal } from "../components/UserSettingsModal";
import { useThemeStyles } from "../styles";

const tabLabels = { dashboard: "Accueil", invoices: "Factures", orders: "Commandes", cash: "Caisse" };

export function WorkspaceScreen({ apiUrl, token, user, theme, onThemeChange, onUserChange, onClearCache, onLogout, onChangeApi, appVersion }) {
  const styles = useThemeStyles();
  const insets = useSafeAreaInsets();
  const [route, setRoute] = useState({ type: "tab", view: "dashboard" });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  function openInvoice(invoice) { const invoiceId = invoice?.id || invoice?.invoiceId; if (invoiceId) setRoute({ type: "invoice", invoiceId, returnRoute: route }); }
  function openClient(client) { setRoute({ type: "client", client, returnRoute: route }); }
  function openOrder(order) { if (order?.id) setRoute({ type: "order", orderId: order.id, returnRoute: route }); }
  function goBack() { setRoute(route.returnRoute || { type: "tab", view: "dashboard" }); }
  useEffect(() => { if (route.type === "tab") return undefined; const subscription = BackHandler.addEventListener("hardwareBackPress", () => { goBack(); return true; }); return () => subscription.remove(); }, [route]);
  const view = route.type === "tab" ? route.view : route.returnRoute?.view || "dashboard";
  const content = route.type === "invoice" ? <InvoiceDetailScreen apiUrl={apiUrl} token={token} invoiceId={route.invoiceId} onBack={goBack} /> : route.type === "client" ? <ClientDetailScreen client={route.client} onBack={goBack} /> : route.type === "order" ? <OrderDetailScreen apiUrl={apiUrl} token={token} orderId={route.orderId} onBack={goBack} /> : { dashboard: <DashboardScreen apiUrl={apiUrl} token={token} onInvoicePress={openInvoice} onViewInvoices={() => setRoute({ type: "tab", view: "invoices" })} />, invoices: <InvoicesScreen apiUrl={apiUrl} token={token} onInvoicePress={openInvoice} />, orders: <OrdersScreen apiUrl={apiUrl} token={token} onOrderPress={openOrder} />, clients: <ClientsScreen apiUrl={apiUrl} token={token} onClientPress={openClient} />, cash: <CashScreen apiUrl={apiUrl} token={token} /> }[view];
  const title = route.type === "invoice" ? "Détail facture" : route.type === "client" ? "Fiche client" : route.type === "order" ? "Détail commande" : tabLabels[view];
  const tabs = [["dashboard", "Accueil", "home-outline", "home"], ["invoices", "Factures", "receipt-outline", "receipt"], ["orders", "Commandes", "clipboard-outline", "clipboard"], ["cash", "Caisse", "wallet-outline", "wallet"]];
  function selectMore(action) { setMoreOpen(false); if (action === "clients") setRoute({ type: "tab", view: "clients" }); if (action === "settings") setSettingsOpen(true); }
  const activeTabIconStyle = { borderRadius: 15, overflow: "hidden" };
  return <SafeAreaView style={styles.safe} edges={["top"]}><View style={styles.workspace}><View style={styles.workspaceHeader}><View><Text style={styles.workspaceTitle}>{title}</Text><Text style={styles.muted}>{route.type === "tab" ? `Bonjour ${user?.name || user?.username}` : "Informations complètes"}</Text></View><View style={styles.headerActions}><Pressable onPress={() => setSettingsOpen(true)} style={styles.settingsButton} accessibilityLabel="Ouvrir les paramètres utilisateur"><Ionicons name="settings-outline" size={21} color={theme === "dark" ? "#6ee7b7" : "#126f5b"} /></Pressable><Pressable onPress={onLogout}><Text style={styles.link}>Sortir</Text></Pressable></View></View><View style={styles.viewArea}>{content}</View>{route.type === "tab" ? <View style={[styles.tabbar, { paddingBottom: Math.max(insets.bottom, 8) }]}>{tabs.map(([key, label, icon, activeIcon]) => <Pressable key={key} onPress={() => setRoute({ type: "tab", view: key })} style={styles.tab} accessibilityRole="tab" accessibilityState={{ selected: view === key }}><View style={[styles.tabIcon, view === key && styles.tabIconActive, view === key && activeTabIconStyle]}><Ionicons name={view === key ? activeIcon : icon} size={21} color={view === key ? (theme === "dark" ? "#6ee7b7" : "#126f5b") : (theme === "dark" ? "#cbd5e1" : "#718079")} /></View><Text style={[styles.tabText, view === key && styles.tabTextActive]}>{label}</Text></Pressable>)}<Pressable onPress={() => setMoreOpen(true)} style={styles.tab} accessibilityRole="button"><View style={styles.tabIcon}><Text style={styles.moreIcon}>•••</Text></View><Text style={styles.tabText}>Plus</Text></Pressable></View> : null}<Modal animationType="slide" transparent visible={moreOpen} onRequestClose={() => setMoreOpen(false)}><Pressable style={styles.moreBackdrop} onPress={() => setMoreOpen(false)}><View style={styles.moreSheet}><Text style={styles.modalTitle}>Plus</Text><Pressable style={styles.moreAction} onPress={() => selectMore("clients")}><Text style={styles.moreActionText}>Clients</Text></Pressable><Pressable style={styles.moreAction} onPress={() => selectMore("settings")}><Text style={styles.moreActionText}>Réglages</Text></Pressable></View></Pressable></Modal><UserSettingsModal visible={settingsOpen} apiUrl={apiUrl} token={token} user={user} theme={theme} onThemeChange={onThemeChange} onUserChange={onUserChange} onClearCache={onClearCache} appVersion={appVersion} onChangeApi={() => { setSettingsOpen(false); onChangeApi?.(); }} onLogout={onLogout} onClose={() => setSettingsOpen(false)} /></View></SafeAreaView>;
}
