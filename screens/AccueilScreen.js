import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Animated, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useFonts, ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';
import { useRef, useEffect } from 'react';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';

// ============================================================
// Écran d'accueil de l'application MaintJojo
// Affiche le logo animé + les menus d'accès rapide :
//   - Nouvelle intervention (principal, en or)
//   - Mes interventions
//   - Chantiers
//   - Plans interactifs
// ============================================================

export default function AccueilScreen({ navigation }) {
  // Chargement de la police Archivo Black pour le logo
  const [fontsLoaded] = useFonts({ ArchivoBlack_400Regular });

  // Animation de pulsation pour l'effet de halo derrière le logo
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.85, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Ne rien afficher tant que la police n'est pas chargée (évite un flash)
  if (!fontsLoaded) return null;

  // Configuration des éléments du menu d'accueil
  // primary: true → carte mise en avant (fond or transparent, bordure or)
  const menuItems = [
    {
      icon: '📝',
      title: 'Nouvelle intervention',
      subtitle: 'Saisir un rapport d\'intervention',
      route: 'NouvelleIntervention',
      primary: true,
    },
    {
      icon: '📋',
      title: 'Mes interventions',
      subtitle: 'Consulter l\'historique',
      route: 'ListeInterventions',
      primary: false,
    },
    {
      icon: '🏗️',
      title: 'Chantiers',
      subtitle: 'Gérer les chantiers en cours',
      route: 'Chantier',
      primary: false,
    },
    {
      icon: '🗺️',
      title: 'Plans interactifs',
      subtitle: 'Consulter les plans des bâtiments',
      route: 'BuildingSelect',
      primary: false,
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Animated.View style={[styles.logoGlow, { opacity: pulseAnim, transform: [{ scale: pulseAnim }] }]} />
          <Text style={styles.logo}>MJ</Text>
          <Text style={styles.title}>MaintJojo</Text>
          <Text style={styles.subtitle}>Gestion de maintenance</Text>
        </View>

        <View style={styles.menu}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuCard, item.primary && styles.menuCardPrimary]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate(item.route)}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <View style={styles.menuTextWrap}>
                <Text style={[styles.menuTitle, item.primary && styles.menuTitlePrimary]}>
                  {item.title}
                </Text>
                <Text style={[styles.menuSubtitle, item.primary && styles.menuSubtitlePrimary]}>
                  {item.subtitle}
                </Text>
              </View>
              <Text style={[styles.menuArrow, item.primary && styles.menuArrowPrimary]}>→</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.footer}>MaintJojo v1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoGlow: {
    position: 'absolute',
    top: 48,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,215,0,0.08)',
  },
  logo: {
    color: COLORS.gold,
    fontSize: 42,
    fontWeight: '900',
    fontFamily: 'ArchivoBlack_400Regular',
    backgroundColor: COLORS.card,
    width: 100,
    height: 100,
    lineHeight: 100,
    textAlign: 'center',
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.gold + '30',
    marginBottom: SPACING.xl,
  },
  title: {
    color: COLORS.white,
    fontSize: 34,
    fontWeight: '900',
    fontFamily: 'ArchivoBlack_400Regular',
    letterSpacing: 1,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 15,
    marginTop: SPACING.sm,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  menu: {
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  menuCardPrimary: {
    backgroundColor: COLORS.gold + '10',
    borderColor: COLORS.gold + '40',
    ...SHADOWS.gold,
  },
  menuIcon: {
    fontSize: 28,
    marginRight: SPACING.lg,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },
  menuTitlePrimary: {
    color: COLORS.gold,
  },
  menuSubtitle: {
    color: COLORS.textDim,
    fontSize: 13,
    marginTop: 3,
  },
  menuSubtitlePrimary: {
    color: COLORS.gold + '80',
  },
  menuArrow: {
    color: COLORS.textDim,
    fontSize: 20,
    fontWeight: '600',
  },
  menuArrowPrimary: {
    color: COLORS.gold,
  },
  footer: {
    color: COLORS.textDim,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 40,
  },
});