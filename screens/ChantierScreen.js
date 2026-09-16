import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';

export default function ChantierScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <Text style={styles.title}>Chantiers</Text>
        <Text style={styles.subtitle}>Gérez vos projets</Text>

        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('NouveauChantierLocalisation')}
        >
          <Text style={styles.cardIcon}>➕</Text>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Nouveau chantier</Text>
            <Text style={styles.cardDesc}>Créer un chantier avec tâches et matériel</Text>
          </View>
          <Text style={styles.cardArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('ListeChantiers')}
        >
          <Text style={styles.cardIcon}>📂</Text>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Mes chantiers</Text>
            <Text style={styles.cardDesc}>Consulter tous les chantiers</Text>
          </View>
          <Text style={styles.cardArrow}>→</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: 40,
  },
  title: {
    color: COLORS.gold,
    fontSize: 26,
    fontWeight: '900',
    fontFamily: 'ArchivoBlack_400Regular',
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xxxl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    ...SHADOWS.card,
  },
  cardIcon: {
    fontSize: 28,
    marginRight: SPACING.lg,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },
  cardDesc: {
    color: COLORS.textDim,
    fontSize: 13,
    marginTop: 3,
  },
  cardArrow: {
    color: COLORS.textDim,
    fontSize: 20,
    fontWeight: '600',
  },
});