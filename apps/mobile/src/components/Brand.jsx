import { Text, View } from "react-native";
import { useThemeStyles } from "../styles";
export function Brand() { const styles = useThemeStyles(); return <View style={styles.brand}><View style={styles.brandMark}><Text style={styles.brandMarkText}>O</Text></View><View><Text style={styles.brandName}>Ozotoo Invoice</Text><Text style={styles.brandCaption}>Espace professionnel</Text></View></View>; }
