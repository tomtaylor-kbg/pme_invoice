import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { request } from "./src/api";
import { ApiUrlScreen } from "./src/screens/ApiUrlScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { WorkspaceScreen } from "./src/screens/WorkspaceScreen";
import { clearStoredCache, deleteStoredValue, getStoredValue, setStoredValue } from "./src/storage";
import { styles, ThemeProvider } from "./src/styles";

const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL || "";
const TOKEN_KEY = "facturation.mobile.session";
const API_URL_KEY = "facturation.mobile.api-url";
const THEME_KEY = "facturation.mobile.theme";

function AppContent() {
  const [bootstrap, setBootstrap] = useState({ status: "loading", apiUrl: "", theme: "light", session: null });
  const bootstrapPromise = useRef(null);

  useEffect(() => {
    if (!bootstrapPromise.current) {
      bootstrapPromise.current = Promise.all([getStoredValue(API_URL_KEY), getStoredValue(TOKEN_KEY), getStoredValue(THEME_KEY)]).then(async ([savedApiUrl, token, savedTheme]) => {
        const apiUrl = savedApiUrl || DEFAULT_API_URL;
        const theme = savedTheme === "dark" ? "dark" : "light";
        let session = null;
        if (apiUrl && token) {
          try {
            session = { token, user: await request(apiUrl, "/api/auth/me", { token }) };
          } catch {
            await deleteStoredValue(TOKEN_KEY);
          }
        }
        return { status: "ready", apiUrl, theme, session };
      });
    }
    bootstrapPromise.current.then(setBootstrap).catch(() => setBootstrap((current) => ({ ...current, status: "ready" })));
  }, []);

  function saveApiUrl(apiUrl) {
    setBootstrap((current) => ({ ...current, apiUrl, session: null }));
    void setStoredValue(API_URL_KEY, apiUrl);
    void deleteStoredValue(TOKEN_KEY);
  }

  function changeApi() {
    setBootstrap((current) => ({ ...current, apiUrl: "", session: null }));
    void deleteStoredValue(TOKEN_KEY);
  }

  function saveTheme(value) {
    const theme = value === "dark" ? "dark" : "light";
    setBootstrap((current) => ({ ...current, theme }));
    void setStoredValue(THEME_KEY, theme);
  }

  return <ThemeProvider theme={bootstrap.theme}>{bootstrap.status === "loading" ? <SafeAreaView style={styles.safe}><View style={styles.loading}><ActivityIndicator size="large" color="#126f5b" /></View></SafeAreaView> : !bootstrap.apiUrl ? <ApiUrlScreen initialUrl={DEFAULT_API_URL} onSave={saveApiUrl} /> : !bootstrap.session ? <LoginScreen apiUrl={bootstrap.apiUrl} tokenKey={TOKEN_KEY} theme={bootstrap.theme} onThemeChange={saveTheme} onLogin={(user, token) => setBootstrap((current) => ({ ...current, session: { user, token } }))} onSaveApi={saveApiUrl} /> : <WorkspaceScreen apiUrl={bootstrap.apiUrl} token={bootstrap.session.token} user={bootstrap.session.user} theme={bootstrap.theme} onThemeChange={saveTheme} onUserChange={(user) => setBootstrap((current) => ({ ...current, session: { ...current.session, user } }))} onClearCache={clearStoredCache} onLogout={() => { void deleteStoredValue(TOKEN_KEY); setBootstrap((current) => ({ ...current, session: null })); }} onChangeApi={changeApi} appVersion="1.0.0" />}</ThemeProvider>;
}

export default function App() {
  return <SafeAreaProvider><AppContent /></SafeAreaProvider>;
}
