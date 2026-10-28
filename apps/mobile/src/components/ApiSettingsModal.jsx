import { useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { useThemeStyles } from "../styles";

export function ApiSettingsModal({ visible, apiUrl, theme = "light", onThemeChange, onClose, onSave }) {
  const styles = useThemeStyles();
  const [value, setValue] = useState(apiUrl);
  const [error, setError] = useState("");

  function save() {
    const nextValue = value.trim().replace(/\/$/, "");
    try {
      const parsed = new URL(nextValue);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      setError("");
      onSave(nextValue);
    } catch {
      setError("Saisissez une URL valide en http:// ou https://.");
    }
  }

  return <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}><View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.eyebrow}>Configuration</Text><Text style={styles.modalTitle}>Adresse de l’API</Text><Text style={styles.modalDescription}>Cette adresse est utilisée pour connecter l’application à votre serveur.</Text><TextInput autoCapitalize="none" autoCorrect={false} keyboardType="url" value={value} onChangeText={setValue} style={styles.input} />{error ? <Text style={styles.error}>{error}</Text> : null}<View style={styles.preferenceRow}><Text style={styles.preferenceLabel}>Couleur préférée</Text><Pressable onPress={() => onThemeChange?.(theme === "dark" ? "light" : "dark")} style={styles.preferenceButton}><Text style={styles.preferenceButtonText}>{theme === "dark" ? "Sombre" : "Claire"}</Text></Pressable></View><View style={styles.modalActions}><Pressable onPress={onClose} style={styles.modalCancel}><Text style={styles.secondaryText}>Annuler</Text></Pressable><Pressable onPress={save} style={styles.primary}><Text style={styles.primaryText}>Enregistrer</Text></Pressable></View></View></View></Modal>;
}
