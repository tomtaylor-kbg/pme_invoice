import { Pressable, Text, View } from "react-native";
import { useThemeStyles } from "../styles";

export function PaginationControls({ pagination, onPrevious, onNext }) {
  const styles = useThemeStyles();
  if (!pagination || pagination.pageCount <= 1) return null;
  return <View style={styles.pagination}>
    <Pressable disabled={pagination.page <= 1} onPress={onPrevious} style={[styles.paginationButton, pagination.page <= 1 && styles.paginationButtonDisabled]}><Text style={styles.paginationButtonText}>‹ Précédent</Text></Pressable>
    <Text style={styles.paginationLabel}>{pagination.page} / {pagination.pageCount}</Text>
    <Pressable disabled={pagination.page >= pagination.pageCount} onPress={onNext} style={[styles.paginationButton, pagination.page >= pagination.pageCount && styles.paginationButtonDisabled]}><Text style={styles.paginationButtonText}>Suivant ›</Text></Pressable>
  </View>;
}
