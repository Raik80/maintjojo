// ============================================================
// Thème global de l'application MaintJojo
// Centralise les couleurs, espacements, bordures et ombres
// pour garantir un design cohérent sur tous les écrans
// ============================================================

import { StyleSheet } from 'react-native';

// Palette de couleurs principale
export const COLORS = {
  black:      '#0A0A0F',  // Fond principal (noir profond)
  dark:       '#12121A',  // Fond secondaire
  card:       '#161622',  // Fond des cartes
  cardBorder: '#252540',  // Bordure des cartes
  input:      '#1A1A2E',  // Fond des champs de saisie
  gold:       '#FFD700',  // Accent principal (or)
  goldDark:   '#B8960F',  // Or foncé
  goldLight:  '#FFE44D',  // Or clair
  white:      '#FFFFFF',  // Texte blanc
  text:       '#E2E8F0',  // Texte principal
  textMuted:  '#64748B',  // Texte secondaire (grisé)
  textDim:    '#475569',  // Texte atténué
  green:      '#22C55E',  // Succès / terminé
  greenBg:    'rgba(34,197,94,0.15)', // Fond vert transparent
  red:        '#EF4444',  // Erreur / suppression
  redBg:      'rgba(239,68,68,0.15)', // Fond rouge transparent
  blue:       '#6366F1',  // Info
  blueBg:     'rgba(99,102,241,0.15)', // Fond bleu transparent
  orange:     '#F59E0B',  // Avertissement
  orangeBg:   'rgba(245,158,11,0.15)', // Fond orange transparent
};

// Échelle d'espacement cohérente
export const SPACING = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  xxxl: 32,
};

// Rayons de bordure
export const RADIUS = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  full: 999, // Pour les boutons pillule
};

// Ombres portées (or pour les boutons, noire pour les cartes)
export const SHADOWS = {
  gold: {
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
};

// Styles partagés réutilisables dans tous les écrans
export const sharedStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.black },
  screenCentered: {
    flex: 1, backgroundColor: COLORS.black,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  scrollContent: { padding: SPACING.xl, paddingBottom: SPACING.xxxl },
  sectionTitle: {
    color: COLORS.gold, fontSize: 17, fontWeight: '700',
    marginTop: SPACING.xxl, marginBottom: SPACING.md, letterSpacing: 0.5,
  },
  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.cardBorder,
    ...SHADOWS.card,
  },
  input: {
    backgroundColor: COLORS.input, color: COLORS.white, fontSize: 15,
    borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  buttonPrimary: {
    backgroundColor: COLORS.gold, paddingVertical: 15, paddingHorizontal: 28,
    borderRadius: RADIUS.full, alignItems: 'center', ...SHADOWS.gold,
  },
  buttonPrimaryText: { color: COLORS.black, fontSize: 16, fontWeight: '700' },
  buttonSecondary: {
    backgroundColor: 'transparent', paddingVertical: 15, paddingHorizontal: 28,
    borderRadius: RADIUS.full, alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.gold,
  },
  buttonSecondaryText: { color: COLORS.gold, fontSize: 16, fontWeight: '700' },
  buttonDanger: {
    backgroundColor: COLORS.red, paddingVertical: 15, paddingHorizontal: 28,
    borderRadius: RADIUS.full, alignItems: 'center',
  },
  buttonDangerText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 },
  badge: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full },
  badgeText: { fontSize: 12, fontWeight: '600' },
  badgeSuccess: { backgroundColor: COLORS.greenBg },
  badgeSuccessText: { color: COLORS.green },
  badgeWarning: { backgroundColor: COLORS.orangeBg },
  badgeWarningText: { color: COLORS.orange },
  loadingText: { color: COLORS.gold, marginTop: SPACING.md, fontSize: 16 },
  errorText: { color: COLORS.red, fontSize: 16, textAlign: 'center', marginBottom: SPACING.xl },
  emptyText: { color: COLORS.textMuted, fontSize: 16, textAlign: 'center', marginTop: 60 },
});