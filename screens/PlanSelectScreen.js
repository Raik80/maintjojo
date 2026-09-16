// ============================================================
// Écran de sélection d'étage pour les plans interactifs
// Reçoit le paramètre "building" (ex: "principal", "atela") de BuildingSelectScreen
// Affiche la liste des étages disponibles pour ce bâtiment
// Chaque bouton navigue vers PlanViewerScreen avec l'ID d'étage
// ============================================================

import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';

// Étages pour le bâtiment IECL
const FLOORS_IECL = [
  { id: 'RDC', label: 'Rez-de-chaussée' },
  { id: 'RDJ', label: 'Rez-de-jardin' },
  { id: '1',   label: '1er étage' },
  { id: '2',   label: '2ème étage' },
  { id: '3',   label: '3ème étage' },
  { id: '4',   label: '4ème étage' },
];

// Étages pour le bâtiment Atela
// Les IDs sont préfixés "atela-" pour construire l'URL plan-atela-{id}.html
const FLOORS_ATELA = [
  { id: 'atela-sous-sol', label: 'Sous-sol' },
  { id: 'atela-rdc',      label: 'Rez-de-chaussée' },
  { id: 'atela-1',        label: '1er étage' },
];

// Étages pour le bâtiment AIP
// Les IDs sont préfixés "aip-" pour construire l'URL plan-aip-{id}.html
const FLOORS_AIP = [
  { id: 'aip-sous-sol', label: 'Sous-sol' },
  { id: 'aip-rdc',      label: 'Rez-de-chaussée' },
  { id: 'aip-1',        label: '1er étage' },
];

export default function PlanSelectScreen({ route, navigation }) {
  // Récupère l'ID du bâtiment depuis les paramètres de navigation
  const { building } = route.params;

  // Sélectionne la liste d'étages correspondant au bâtiment
  let floors;
  if (building === 'atela') floors = FLOORS_ATELA;
  else if (building === 'aip') floors = FLOORS_AIP;
  else floors = FLOORS_IECL;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <Text style={styles.title}>Plans interactifs</Text>
        <Text style={styles.subtitle}>Sélectionnez un étage</Text>

        {floors.map((floor) => (
          <TouchableOpacity
            key={floor.id}
            style={styles.card}
            activeOpacity={0.7}
            // Navigation vers PlanViewer avec l'ID (utilisé pour l'URL) et le libellé (titre du header)
            onPress={() => navigation.navigate('PlanViewer', { floor: floor.id, label: floor.label })}
          >
            <Text style={styles.cardIcon}>🗺️</Text>
            <Text style={styles.cardText}>{floor.label}</Text>
            <Text style={styles.cardArrow}>→</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.black },
  content: { flex: 1, paddingHorizontal: SPACING.xl, paddingTop: 40 },
  title: {
    color: COLORS.gold, fontSize: 26, fontWeight: '900',
    fontFamily: 'ArchivoBlack_400Regular', textAlign: 'center',
  },
  subtitle: {
    color: COLORS.textMuted, fontSize: 14, textAlign: 'center',
    marginTop: SPACING.sm, marginBottom: SPACING.xxxl,
  },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.lg,
    marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.cardBorder,
    ...SHADOWS.card,
  },
  cardIcon: { fontSize: 24, marginRight: SPACING.lg },
  cardText: { flex: 1, color: COLORS.text, fontSize: 17, fontWeight: '700' },
  cardArrow: { color: COLORS.textDim, fontSize: 20, fontWeight: '600' },
});