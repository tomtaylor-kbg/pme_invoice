import { useRef, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  async function submit() {
    if (loading) return;
    setLoading(true); setError("");
    try {
      const result = await request(apiUrl, "/api/auth/login", { method: "POST", body: { username: username.trim(), password }, mobile: true });
      if (!result.token) throw new Error("Le serveur n’a pas fourni de session mobile.");
      await setStoredValue(tokenKey, result.token);
      onLogin(result.user, result.token);
    } catch (requestError) {
      setError(requestError.message.includes("session mobile") ? requestError.message : "Nom d’utilisateur ou mot de passe incorrect.");
    } finally { setLoading(false); }
  }

  function keepPasswordVisible() { setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 180); }

  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={12}><ScrollView ref={scrollRef} contentContainerStyle={styles.loginPage} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"><View style={styles.loginTopbar}><View /><Pressable onPress={() => setSettingsOpen(true)} hitSlop={12} style={styles.serverButton} accessibilityLabel="Configurer le serveur"><Ionicons name="server-outline" size={18} color={theme === "dark" ? "#6ee7b7" : "#126f5b"} /><Text style={styles.serverButtonText}>Serveur</Text></Pressable></View><View style={styles.loginContent}><View style={styles.loginCard}><View style={styles.loginBrand}><View style={styles.loginBrandMark}><Image source={require("../../assets/ozotoo-icon.png")} style={styles.loginBrandImage} resizeMode="contain" /></View><Text style={styles.loginLogo}>Ozotoo Invoice</Text><Text style={styles.loginSubtitle}>Connectez-vous pour continuer</Text></View>{error ? <View style={styles.loginError}><Ionicons name="alert-circle-outline" size={15} color="#b42318" /><Text style={styles.loginErrorText}>{error}</Text></View> : null}<Text style={styles.loginFieldLabel}>Nom d’utilisateur</Text><TextInput autoCapitalize="none" autoCorrect={false} spellCheck={false} autoComplete="username" textContentType="username" returnKeyType="next" value={username} onChangeText={setUsername} style={[styles.input, error && styles.inputError]} /><Text style={styles.loginFieldLabel}>Mot de passe</Text><View style={[styles.passwordInputRow, error && styles.inputError]}><TextInput secureTextEntry={!passwordVisible} autoCapitalize="none" autoCorrect={false} spellCheck={false} autoComplete="current-password" textContentType="password" returnKeyType="done" onSubmitEditing={submit} value={password} onChangeText={setPassword} onFocus={keepPasswordVisible} style={styles.passwordInput} /><Pressable onPress={() => setPasswordVisible((current) => !current)} hitSlop={10} accessibilityLabel={passwordVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}><Ionicons name={passwordVisible ? "eye-off-outline" : "eye-outline"} size={20} color="#64716c" /></Pressable></View><Pressable onPress={submit} disabled={loading} style={[styles.primary, styles.loginSubmit, loading && styles.disabledButton]}><Text style={styles.primaryText}>{loading ? "Connexion en cours…" : "Se connecter"}</Text></Pressable><Text style={styles.loginHelp}>Mot de passe oublié ? Contactez votre administrateur.</Text><Text style={styles.loginVersion}>Version 1.0.0</Text></View></View></ScrollView></KeyboardAvoidingView><ApiSettingsModal visible={settingsOpen} apiUrl={apiUrl} theme={theme} onThemeChange={onThemeChange} onClose={() => setSettingsOpen(false)} onSave={(value) => { onSaveApi(value); setSettingsOpen(false); }} /></SafeAreaView>;
}
