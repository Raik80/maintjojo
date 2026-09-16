// ============================================================
// Écran de sélection du bâtiment pour les plans interactifs
// Affiche la liste des bâtiments disponibles
// Chaque carte navigue vers PlanSelectScreen avec l'ID du bâtiment
// ============================================================

import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';

// Liste des bâtiments avec leurs informations
// id : utilisé pour identifier le bâtiment (passé à PlanSelectScreen)
// name : nom affiché
// floors : nombre d'étages disponibles (affiché en sous-titre)
const BUILDINGS = [
  { id: 'iecl', name: 'IECL', floors: 6, icon: '🏢' },
  { id: 'atela', name: 'Atela', floors: 3, icon: '🏛️' },
  { id: 'aip', name: 'AIP', floors: 3, icon: '🏗️' },
];

export default function BuildingSelectScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <Text style={styles.title}>Plans interactifs</Text>
        <Text style={styles.subtitle}>Sélectionnez un bâtiment</Text>

        {BUILDINGS.map((b) => (
          <TouchableOpacity
            key={b.id}
            style={styles.card}
            activeOpacity={0.7}
            // Navigation vers PlanSelect avec l'ID du bâtiment et son nom pour le header
            onPress={() => navigation.navigate('PlanSelect', { building: b.id, buildingName: b.name })}
          >
            <Text style={styles.cardIcon}>{b.icon}</Text>
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardTitle}>{b.name}</Text>
              <Text style={styles.cardSubtitle}>{b.floors} étages disponibles</Text>
            </View>
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
  cardIcon: { fontSize: 28, marginRight: SPACING.lg },
  cardTextWrap: { flex: 1 },
  cardTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
  cardSubtitle: { color: COLORS.textDim, fontSize: 13, marginTop: 3 },
  cardArrow: { color: COLORS.textDim, fontSize: 20, fontWeight: '600' },
});