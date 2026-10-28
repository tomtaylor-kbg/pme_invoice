import { Image, Text, View } from "react-native";
import { useThemeStyles } from "../styles";
export function Brand() { const styles = useThemeStyles(); return <View style={styles.brand}><Image source={require("../../assets/ozotoo-icon.png")} style={styles.brandLogo} resizeMode="contain" /><View><Text style={styles.brandName}>Ozotoo Invoice</Text><Text style={styles.brandCaption}>Espace professionnel</Text></View></View>; }
