// ============================================================
// Écran d'affichage d'un plan interactif via WebView
// Reçoit le paramètre "floor" (ex: "RDJ") de PlanSelectScreen
// Charge le fichier HTML auto-suffisant depuis le serveur :
//   {BASE_URL}/public/plans/plan-RDJ.html
// Le HTML contient le SVG + les données des pièces + tout le JS
// pour le zoom/pan et la sélection de pièces
// ============================================================

import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { BASE_URL, API_KEY } from '../services/api';
import { COLORS, SPACING } from '../theme';

export default function PlanViewerScreen({ route }) {
  // Récupère l'ID d'étage depuis les paramètres de navigation
  const { floor } = route.params;

  // Construit l'URL complète vers le fichier HTML auto-suffisant sur le serveur
  // Exemple : https://maintjojo-serveur.tailce5b78.ts.net/public/plans/plan-RDJ.html
  const uri = `${BASE_URL}/public/plans/plan-${encodeURIComponent(floor)}.html`;

  return (
    <View style={styles.screen}>
      <WebView
        source={{ uri, headers: { 'x-api-key': API_KEY } }}
        style={styles.webview}
        javaScriptEnabled={true}       // Active le JS pour les interactions (zoom, pan, clic pièces)
        domStorageEnabled={true}        // Active le stockage DOM
        startInLoadingState={true}      // Affiche un loader pendant le chargement
        allowFileAccess={true}          // Permet l'accès aux fichiers locaux si besoin
        scalesPageToFit={false}         // Désactive le zoom natif (géré par le JS du HTML)
        // Loader affiché pendant le chargement du plan depuis le serveur
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={COLORS.gold} />
            <Text style={styles.loadingText}>Chargement du plan...</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.black },
  webview: { flex: 1, backgroundColor: 'transparent' },
  loading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.black,
  },
  loadingText: { color: COLORS.gold, marginTop: SPACING.md, fontSize: 16 },
});