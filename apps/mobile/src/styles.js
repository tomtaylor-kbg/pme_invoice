import { createContext, useContext } from "react";
import { StyleSheet } from "react-native";

export const ThemeContext = createContext({ theme: "light" });

export function ThemeProvider({ theme, children }) {
  return <ThemeContext.Provider value={{ theme: theme === "dark" ? "dark" : "light" }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f3f5f2" }, setupPage: { flexGrow: 1, justifyContent: "center", padding: 16, paddingBottom: 32, paddingTop: 24 }, setupInner: { alignSelf: "center", maxWidth: 440, width: "100%" }, setupCard: { backgroundColor: "#fff", borderColor: "#d7ded9", borderRadius: 20, borderWidth: 1, marginTop: 22, padding: 20, width: "100%" }, keyboardView: { flex: 1 }, loginPage: { flexGrow: 1, padding: 22 }, loginTopbar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, loginContent: { flex: 1, justifyContent: "center", width: "100%" }, loginCard: { alignSelf: "center", backgroundColor: "#fff", borderColor: "#d7ded9", borderRadius: 20, borderWidth: 1, maxWidth: 440, padding: 22, width: "100%" },
  brand: { alignItems: "center", flexDirection: "row", gap: 10 }, brandMark: { alignItems: "center", backgroundColor: "#126f5b", borderRadius: 10, height: 40, justifyContent: "center", width: 40 }, brandMarkText: { color: "#fff", fontSize: 22, fontWeight: "800" }, brandName: { color: "#14211d", fontSize: 18, fontWeight: "800" }, brandCaption: { color: "#718079", fontSize: 11, marginTop: 2 }, eyebrow: { color: "#126f5b", fontSize: 12, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" }, title: { color: "#14211d", fontSize: 29, fontWeight: "800", marginTop: 7 }, subtitle: { color: "#64716c", fontSize: 15, lineHeight: 22, marginBottom: 20, marginTop: 5 }, input: { backgroundColor: "#fbfcfb", borderColor: "#d7ded9", borderRadius: 10, borderWidth: 1, fontSize: 16, marginBottom: 12, padding: 14 }, primary: { alignItems: "center", backgroundColor: "#126f5b", borderRadius: 10, padding: 15 }, primaryText: { color: "#fff", fontSize: 16, fontWeight: "700" }, link: { color: "#126f5b", fontSize: 13, fontWeight: "700" }, loginLogo: { color: "#14211d", fontSize: 24, fontWeight: "800", textAlign: "center" }, apiButton: { alignItems: "center", backgroundColor: "#e1f1eb", borderRadius: 18, height: 36, justifyContent: "center", position: "absolute", right: 0, top: -2, width: 36 }, apiButtonText: { color: "#126f5b", fontSize: 18 }, error: { color: "#b42318", fontSize: 13, marginBottom: 12 },
  workspace: { backgroundColor: "#f3f5f2", flex: 1 }, workspaceHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 16 }, headerActions: { alignItems: "center", flexDirection: "row", gap: 14 }, settingsButton: { alignItems: "center", backgroundColor: "#e1f1eb", borderRadius: 18, height: 36, justifyContent: "center", width: 36 }, workspaceTitle: { color: "#14211d", fontSize: 24, fontWeight: "800" }, viewArea: { flex: 1 }, content: { gap: 12, padding: 20, paddingBottom: 30 }, heroCard: { backgroundColor: "#126f5b", borderRadius: 18, padding: 20 }, cardLabel: { color: "#d7f1e8", fontSize: 14 }, heroAmount: { color: "#fff", fontSize: 32, fontWeight: "800", marginVertical: 8 }, muted: { color: "#718079", fontSize: 13 }, metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, metric: { backgroundColor: "#fff", borderColor: "#d7ded9", borderRadius: 14, borderWidth: 1, flexBasis: "47%", flexGrow: 1, padding: 15 }, metricValue: { color: "#14211d", fontSize: 22, fontWeight: "800", marginBottom: 4 }, sectionTitle: { color: "#14211d", fontSize: 20, fontWeight: "800", marginTop: 9 }, listRow: { alignItems: "center", backgroundColor: "#fff", borderColor: "#d7ded9", borderRadius: 12, borderWidth: 1, flexDirection: "row", marginBottom: 2, minHeight: 62, paddingHorizontal: 14, paddingVertical: 11 }, rowBody: { flex: 1 }, rowTitle: { color: "#14211d", fontSize: 15, fontWeight: "700" }, rowAmount: { color: "#14211d", fontSize: 14, fontWeight: "700", marginLeft: 10 }, avatar: { alignItems: "center", backgroundColor: "#d7f1e8", borderRadius: 22, height: 42, justifyContent: "center", marginRight: 12, width: 42 }, avatarText: { color: "#126f5b", fontSize: 17, fontWeight: "800" }, loading: { alignItems: "center", flex: 1, justifyContent: "center" }, secondary: { alignItems: "center", borderColor: "#cbd5d0", borderRadius: 10, borderWidth: 1, marginTop: 8, padding: 13 }, secondaryText: { color: "#14211d", fontWeight: "700" },
  tabbar: { backgroundColor: "#fff", borderColor: "#d7ded9", borderTopWidth: 1, flexDirection: "row", paddingHorizontal: 8, paddingTop: 7 }, tab: { alignItems: "center", borderRadius: 10, flex: 1, gap: 3, paddingVertical: 8 }, tabActive: { backgroundColor: "#e1f1eb" }, tabText: { color: "#718079", fontSize: 12, fontWeight: "600" }, tabTextActive: { color: "#126f5b", fontWeight: "800" }, changeApi: { alignItems: "center", backgroundColor: "#fff", paddingBottom: 9, paddingTop: 5 }, changeApiText: { color: "#718079", fontSize: 11 }, pagination: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 8 }, paginationButton: { backgroundColor: "#e1f1eb", borderRadius: 9, paddingHorizontal: 12, paddingVertical: 10 }, paginationButtonDisabled: { opacity: 0.4 }, paginationButtonText: { color: "#126f5b", fontSize: 12, fontWeight: "800" }, paginationLabel: { color: "#718079", fontSize: 13, fontWeight: "700" }, modalBackdrop: { alignItems: "center", backgroundColor: "rgba(15, 23, 42, 0.48)", flex: 1, justifyContent: "center", padding: 20 }, modalCard: { backgroundColor: "#fff", borderRadius: 18, maxHeight: "92%", padding: 22, width: "100%" }, settingsContent: { paddingBottom: 4 }, modalTitle: { color: "#14211d", fontSize: 22, fontWeight: "800", marginBottom: 6, marginTop: 6 }, modalDescription: { color: "#64716c", fontSize: 14, lineHeight: 20, marginBottom: 16 }, settingsSectionTitle: { color: "#126f5b", fontSize: 14, fontWeight: "800", marginBottom: 10, marginTop: 20 }, settingsLabel: { color: "#14211d", fontSize: 13, fontWeight: "700", marginBottom: 5 }, settingsHint: { color: "#718079", fontSize: 12, lineHeight: 17 }, settingsStatus: { color: "#126f5b", fontSize: 13, fontWeight: "700", marginTop: 12 }, settingsToggleRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }, settingsToggleBody: { flex: 1, paddingRight: 12 }, toggle: { alignItems: "center", backgroundColor: "#e2e8e5", borderRadius: 16, minWidth: 54, paddingHorizontal: 12, paddingVertical: 8 }, toggleActive: { backgroundColor: "#126f5b" }, toggleText: { color: "#14211d", fontSize: 12, fontWeight: "800" }, preferenceRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 18 }, preferenceLabel: { color: "#14211d", fontSize: 14, fontWeight: "700" }, preferenceButton: { backgroundColor: "#e1f1eb", borderRadius: 9, paddingHorizontal: 13, paddingVertical: 9 }, preferenceButtonText: { color: "#126f5b", fontSize: 13, fontWeight: "700" }, themeChoices: { flexDirection: "row", gap: 10, marginBottom: 20, marginTop: 10 }, themeChoice: { borderColor: "#cbd5d0", borderRadius: 10, borderWidth: 1, flex: 1, padding: 12 }, themeChoiceActive: { backgroundColor: "#e1f1eb", borderColor: "#126f5b" }, themeChoiceText: { color: "#14211d", fontWeight: "700", textAlign: "center" }, settingsAction: { borderBottomColor: "#e2e8e5", borderBottomWidth: 1, paddingBottom: 16, paddingTop: 12 }, settingsActionText: { color: "#126f5b", fontWeight: "700" }, logoutButton: { alignItems: "center", backgroundColor: "#b42318", borderRadius: 10, justifyContent: "center", paddingHorizontal: 16 }, logoutButtonText: { color: "#fff", fontWeight: "700" }, modalActions: { flexDirection: "row", gap: 10, justifyContent: "flex-end", marginTop: 18 }, modalCancel: { alignItems: "center", borderColor: "#cbd5d0", borderRadius: 10, borderWidth: 1, justifyContent: "center", paddingHorizontal: 16 },
  invoiceSummary: { backgroundColor: "#fff", borderColor: "#d7ded9", borderRadius: 16, borderWidth: 1, padding: 16 },
  summaryHeading: { color: "#14211d", fontSize: 16, fontWeight: "800", marginBottom: 12 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  summaryItem: { backgroundColor: "#f3f5f2", borderRadius: 10, flexBasis: "47%", flexGrow: 1, padding: 11 },
  summaryValue: { color: "#14211d", fontSize: 20, fontWeight: "800", marginBottom: 3 },
  summaryAmount: { color: "#126f5b", fontSize: 13, fontWeight: "700", marginTop: 12 }
  , reportCard: { backgroundColor: "#fff", borderColor: "#d7ded9", borderRadius: 14, borderWidth: 1, padding: 15 }, reportTitle: { color: "#14211d", fontSize: 15, fontWeight: "800", marginBottom: 8 }, reportRow: { alignItems: "center", borderBottomColor: "#e0e6e2", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 }, backButton: { alignSelf: "flex-start", paddingVertical: 4 }, backText: { color: "#126f5b", fontSize: 14, fontWeight: "800" }, invoiceDetailCard: { backgroundColor: "#fff", borderColor: "#d7ded9", borderRadius: 20, borderWidth: 1, padding: 20 }, detailTopline: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" }, detailEyebrow: { color: "#718079", fontSize: 13, fontWeight: "700", marginBottom: 4 }, detailNumber: { color: "#14211d", fontSize: 22, fontWeight: "800" }, statusPill: { backgroundColor: "#e1f1eb", borderRadius: 16, color: "#126f5b", fontSize: 12, fontWeight: "800", overflow: "hidden", paddingHorizontal: 11, paddingVertical: 7 }, detailTotal: { color: "#14211d", fontSize: 34, fontWeight: "800", marginTop: 25 }, detailSection: { backgroundColor: "#fff", borderColor: "#d7ded9", borderRadius: 16, borderWidth: 1, padding: 16 }, detailSectionTitle: { color: "#14211d", fontSize: 16, fontWeight: "800", marginBottom: 12 }, detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, detailField: { flexBasis: "46%", flexGrow: 1 }, detailLabel: { color: "#718079", fontSize: 12, marginBottom: 4 }, detailValue: { color: "#14211d", fontSize: 14, fontWeight: "700" }, detailLine: { alignItems: "center", borderBottomColor: "#e0e6e2", borderBottomWidth: 1, flexDirection: "row", paddingVertical: 11 }, detailTotalRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingTop: 15 }, detailTotalLabel: { color: "#14211d", fontSize: 15, fontWeight: "800" }, detailTotalValue: { color: "#126f5b", fontSize: 17, fontWeight: "800" }
});

const darkOverrides = {
  safe: { backgroundColor: "#111827" },
  setupCard: { backgroundColor: "#1f2937", borderColor: "#374151" },
  loginCard: { backgroundColor: "#1f2937", borderColor: "#374151" },
  loginLogo: { color: "#f9fafb" },
  title: { color: "#f9fafb" },
  subtitle: { color: "#cbd5e1" },
  input: { backgroundColor: "#111827", borderColor: "#4b5563", color: "#f9fafb" },
  workspace: { backgroundColor: "#111827" },
  workspaceTitle: { color: "#f9fafb" },
  settingsButton: { backgroundColor: "#064e3b" },
  muted: { color: "#cbd5e1" },
  metric: { backgroundColor: "#1f2937", borderColor: "#374151" },
  metricValue: { color: "#f9fafb" },
  listRow: { backgroundColor: "#1f2937", borderColor: "#374151" },
  rowTitle: { color: "#f9fafb" },
  rowAmount: { color: "#f9fafb" },
  secondaryText: { color: "#f9fafb" },
  tabbar: { backgroundColor: "#1f2937", borderColor: "#374151" },
  tabActive: { backgroundColor: "#064e3b" },
  tabTextActive: { color: "#6ee7b7" },
  modalCard: { backgroundColor: "#1f2937" },
  settingsSectionTitle: { color: "#6ee7b7" }, settingsLabel: { color: "#f9fafb" }, settingsHint: { color: "#cbd5e1" }, settingsStatus: { color: "#6ee7b7" }, toggle: { backgroundColor: "#4b5563" }, toggleActive: { backgroundColor: "#059669" }, toggleText: { color: "#f9fafb" },
  modalTitle: { color: "#f9fafb" },
  modalDescription: { color: "#cbd5e1" },
  preferenceLabel: { color: "#f9fafb" },
  preferenceButton: { backgroundColor: "#064e3b" },
  preferenceButtonText: { color: "#6ee7b7" },
  modalCancel: { borderColor: "#4b5563" },
  paginationButton: { backgroundColor: "#064e3b" }, paginationButtonText: { color: "#6ee7b7" }, paginationLabel: { color: "#cbd5e1" },
  invoiceSummary: { backgroundColor: "#1f2937", borderColor: "#374151" },
  summaryHeading: { color: "#f9fafb" },
  summaryItem: { backgroundColor: "#374151" },
  summaryValue: { color: "#f9fafb" },
  reportCard: { backgroundColor: "#1f2937", borderColor: "#374151" },
  reportTitle: { color: "#f9fafb" },
  reportRow: { borderBottomColor: "#374151" },
  invoiceDetailCard: { backgroundColor: "#1f2937", borderColor: "#374151" },
  detailSection: { backgroundColor: "#1f2937", borderColor: "#374151" },
  detailSectionTitle: { color: "#f9fafb" },
  detailLabel: { color: "#cbd5e1" },
  detailValue: { color: "#f9fafb" },
  detailLine: { borderBottomColor: "#374151" },
  detailTotalLabel: { color: "#f9fafb" },
  brandName: { color: "#f9fafb" },
  setupPage: { backgroundColor: "#111827" },
  loginPage: { backgroundColor: "#111827" },
  content: { backgroundColor: "#111827" },
  sectionTitle: { color: "#f9fafb" },
  backText: { color: "#6ee7b7" }
  ,themeChoiceText: { color: "#f9fafb" }, settingsAction: { borderBottomColor: "#374151" }, settingsActionText: { color: "#6ee7b7" }, themeChoice: { borderColor: "#4b5563" }, themeChoiceActive: { backgroundColor: "#064e3b", borderColor: "#34d399" }
};

export function useThemeStyles() {
  const { theme } = useTheme();
  if (theme !== "dark") return baseStyles;
  return new Proxy(baseStyles, {
    get(target, property) {
      return darkOverrides[property] ? [target[property], darkOverrides[property]] : target[property];
    }
  });
}

export const styles = baseStyles;
