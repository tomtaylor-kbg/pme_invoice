import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { request } from "../api";
import { getStoredValue, setStoredValue } from "../storage";
import { useThemeStyles } from "../styles";

const NOTIFICATIONS_KEY = "ozotoo.mobile.notifications";
const BIOMETRIC_KEY = "ozotoo.mobile.biometric";

export function UserSettingsModal({ visible, apiUrl, token, user, theme, onThemeChange, onUserChange, onChangeApi, onLogout, onClearCache, onClose, appVersion = "1.0.0" }) {
  const styles = useThemeStyles();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [notifications, setNotifications] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(user?.name || "");
    setEmail(user?.email || "");
    setCurrentPassword("");
    setNewPassword("");
    setStatus("");
    Promise.all([getStoredValue(NOTIFICATIONS_KEY), getStoredValue(BIOMETRIC_KEY)]).then(([savedNotifications, savedBiometric]) => {
      setNotifications(savedNotifications === "true");
      setBiometric(savedBiometric === "true");
    });
  }, [visible, user]);

  async function saveProfile() {
    if (newPassword && !currentPassword) return setStatus("Saisissez votre mot de passe actuel pour le modifier.");
    setSaving(true);
    setStatus("");
    try {
      const updated = await request(apiUrl, "/api/auth/me", { method: "PATCH", token, body: { name, email, ...(newPassword ? { currentPassword, newPassword } : {}) } });
      onUserChange?.(updated);
      setCurrentPassword("");
      setNewPassword("");
      setStatus("Profil enregistré.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function togglePreference(key, value, setter) {
    setter(value);
    await setStoredValue(key, String(value));
  }

  async function synchronize() {
    setStatus("Synchronisation en cours…");
    try {
      const refreshedUser = await request(apiUrl, "/api/auth/me", { token });
      onUserChange?.(refreshedUser);
      setStatus("Synchronisation terminée.");
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function clearCache() {
    await onClearCache?.();
    setStatus("Cache local vidé. Les données seront rechargées depuis le serveur.");
  }

  return <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
    <View style={styles.modalBackdrop}><View style={styles.modalCard}>
      <ScrollView contentContainerStyle={styles.settingsContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>Mon compte</Text>
        <Text style={styles.modalTitle}>Paramètres utilisateur</Text>
        <Text style={styles.modalDescription}>Connecté en tant que {user?.username || "utilisateur"} · {user?.role || "membre"}</Text>

        <Text style={styles.settingsSectionTitle}>Profil</Text>
        <Text style={styles.settingsLabel}>Nom</Text><TextInput value={name} onChangeText={setName} style={styles.input} />
        <Text style={styles.settingsLabel}>E-mail</Text><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} />
        <Text style={styles.settingsLabel}>Mot de passe actuel</Text><TextInput value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry style={styles.input} placeholder="Uniquement pour le modifier" />
        <Text style={styles.settingsLabel}>Nouveau mot de passe</Text><TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry style={styles.input} placeholder="8 caractères minimum" />
        <Pressable onPress={saveProfile} disabled={saving} style={styles.primary}><Text style={styles.primaryText}>{saving ? "Enregistrement…" : "Enregistrer le profil"}</Text></Pressable>

        <Text style={styles.settingsSectionTitle}>Apparence</Text>
        <View style={styles.themeChoices}><Pressable onPress={() => onThemeChange("light")} style={[styles.themeChoice, theme === "light" && styles.themeChoiceActive]}><Text style={styles.themeChoiceText}>☀ Claire</Text></Pressable><Pressable onPress={() => onThemeChange("dark")} style={[styles.themeChoice, theme === "dark" && styles.themeChoiceActive]}><Text style={styles.themeChoiceText}>☾ Sombre</Text></Pressable></View>

        <Text style={styles.settingsSectionTitle}>Synchronisation et données</Text>
        <Pressable onPress={synchronize} style={styles.settingsAction}><Text style={styles.settingsActionText}>Synchroniser maintenant</Text></Pressable>
        <Pressable onPress={clearCache} style={styles.settingsAction}><Text style={styles.settingsActionText}>Vider le cache local</Text></Pressable>

        <Text style={styles.settingsSectionTitle}>Sécurité</Text>
        <View style={styles.settingsToggleRow}><View style={styles.settingsToggleBody}><Text style={styles.settingsLabel}>Verrouillage biométrique</Text><Text style={styles.settingsHint}>Préférence enregistrée ; activation biométrique complète à venir.</Text></View><Pressable onPress={() => togglePreference(BIOMETRIC_KEY, !biometric, setBiometric)} style={[styles.toggle, biometric && styles.toggleActive]}><Text style={styles.toggleText}>{biometric ? "ON" : "OFF"}</Text></Pressable></View>

        <Text style={styles.settingsSectionTitle}>Notifications</Text>
        <View style={styles.settingsToggleRow}><View style={styles.settingsToggleBody}><Text style={styles.settingsLabel}>Notifications de suivi</Text><Text style={styles.settingsHint}>Préférence locale ; notifications système à venir.</Text></View><Pressable onPress={() => togglePreference(NOTIFICATIONS_KEY, !notifications, setNotifications)} style={[styles.toggle, notifications && styles.toggleActive]}><Text style={styles.toggleText}>{notifications ? "ON" : "OFF"}</Text></Pressable></View>

        <Text style={styles.settingsSectionTitle}>Support</Text>
        <Text style={styles.settingsHint}>Version {appVersion}</Text>
        <Text style={styles.settingsHint}>Pour assistance, contactez votre administrateur.</Text>
        {status ? <Text style={styles.settingsStatus}>{status}</Text> : null}
        <Pressable onPress={onChangeApi} style={styles.settingsAction}><Text style={styles.settingsActionText}>Changer l’adresse API</Text></Pressable>
        <View style={styles.modalActions}><Pressable onPress={onClose} style={styles.modalCancel}><Text style={styles.secondaryText}>Fermer</Text></Pressable><Pressable onPress={onLogout} style={styles.logoutButton}><Text style={styles.logoutButtonText}>Se déconnecter</Text></Pressable></View>
      </ScrollView>
    </View></View>
  </Modal>;
}
