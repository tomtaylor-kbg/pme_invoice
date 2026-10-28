import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { request } from "../api";
import { ApiSettingsModal } from "../components/ApiSettingsModal";
import { setStoredValue } from "../storage";
import { useThemeStyles } from "../styles";

export function LoginScreen({ apiUrl, tokenKey, theme, onThemeChange, onLogin, onSaveApi }) {
  const styles = useThemeStyles();
  const scrollRef = useRef(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const result = await request(apiUrl, "/api/auth/login", { method: "POST", body: { username, password }, mobile: true });
      if (!result.token) throw new Error("Le serveur n’a pas fourni de session mobile.");
      await setStoredValue(tokenKey, result.token);
      onLogin(result.user, result.token);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function keepPasswordVisible() {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 180);
  }

  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={12}><ScrollView ref={scrollRef} contentContainerStyle={styles.loginPage} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"><View style={styles.loginTopbar}><Text style={styles.loginLogo}>Ozotoo Invoice</Text><Pressable onPress={() => setSettingsOpen(true)} hitSlop={12} style={styles.apiButton} accessibilityLabel="Configurer l’adresse API"><Text style={styles.apiButtonText}>⚙</Text></Pressable></View><View style={styles.loginContent}><View style={styles.loginCard}><Text style={styles.eyebrow}>Bienvenue</Text><Text style={styles.title}>Connexion</Text><Text style={styles.subtitle}>Connectez-vous à votre workspace.</Text><TextInput autoCapitalize="none" autoCorrect={false} spellCheck={false} placeholder="Nom d’utilisateur" value={username} onChangeText={setUsername} style={styles.input} /><TextInput secureTextEntry autoCapitalize="none" autoCorrect={false} spellCheck={false} autoComplete="password" textContentType="password" placeholder="Mot de passe" value={password} onChangeText={setPassword} onFocus={keepPasswordVisible} style={styles.input} />{error ? <Text style={styles.error}>{error}</Text> : null}<Pressable onPress={submit} disabled={loading} style={styles.primary}><Text style={styles.primaryText}>{loading ? "Connexion…" : "Se connecter"}</Text></Pressable></View></View></ScrollView></KeyboardAvoidingView><ApiSettingsModal visible={settingsOpen} apiUrl={apiUrl} theme={theme} onThemeChange={onThemeChange} onClose={() => setSettingsOpen(false)} onSave={(value) => { onSaveApi(value); setSettingsOpen(false); }} /></SafeAreaView>;
}
