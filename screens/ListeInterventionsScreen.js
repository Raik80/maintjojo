import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useFonts, ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';
import { recupererInterventions } from '../services/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';

export default function ListeInterventionsScreen({ navigation }) {
  const [fontsLoaded] = useFonts({ ArchivoBlack_400Regular });
  const [interventions, setInterventions] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  const chargerInterventions = useCallback(async () => {
    try {
      setChargement(true);
      setErreur(null);
      const donnees = await recupererInterventions();
      setInterventions(donnees);
    } catch (e) {
      setErreur(e.message);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { chargerInterventions(); }, [chargerInterventions]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => chargerInterventions());
    return unsub;
  }, [navigation, chargerInterventions]);

  function formaterDate(d) {
    const date = new Date(d + 'Z');
    const j = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const a = date.getFullYear();
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${j}/${m}/${a}  ${h}:${min}`;
  }

  if (chargement) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={styles.loading}>Chargement...</Text>
      </View>
    );
  }

  if (erreur) {
    return (
      <View style={styles.centre}>
        <Text style={styles.erreur}>{erreur}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={chargerInterventions}>
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <FlatList
        data={interventions}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Text style={styles.pageTitle}>Mes interventions</Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>Aucune intervention enregistrée</Text>
            <Text style={styles.emptySub}>Appuie sur "+" pour commencer</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isClosed = item.statut === 'terminé';
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('DetailIntervention', { fiche: item })}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardType}>
                  <View style={[styles.dot, isClosed ? styles.dotSuccess : styles.dotWarning]} />
                  <Text style={styles.typeText}>{item.type}</Text>
                </View>
                <View style={[styles.statusBadge, isClosed ? styles.badgeSuccess : styles.badgeWarning]}>
                  <Text style={[styles.statusText, isClosed ? styles.statusSuccess : styles.statusWarning]}>
                    {isClosed ? 'Terminé' : 'En cours'}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>🏢</Text>
                  <Text style={styles.infoText}>{item.batiment}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>📍</Text>
                  <Text style={styles.infoText}>{item.etage}</Text>
                </View>
                {item.entree && item.entree !== 'Non spécifié' && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>🚪</Text>
                    <Text style={styles.infoText}>{item.entree}</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.dateText}>{formaterDate(item.date_creation)}</Text>
                <Text style={styles.arrow}>→</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  centre: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.black,
    paddingHorizontal: SPACING.xxl,
  },
  loading: {
    color: COLORS.gold,
    marginTop: SPACING.md,
    fontSize: 16,
  },
  erreur: {
    color: COLORS.red,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  retryBtn: {
    backgroundColor: COLORS.gold,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: RADIUS.full,
  },
  retryText: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: '700',
  },
  pageTitle: {
    color: COLORS.gold,
    fontSize: 26,
    fontWeight: '900',
    fontFamily: 'ArchivoBlack_400Regular',
    textAlign: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.xxl,
  },
  listContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.lg,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySub: {
    color: COLORS.textDim,
    fontSize: 13,
    marginTop: SPACING.xs,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    ...SHADOWS.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cardType: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: SPACING.sm,
  },
  dotSuccess: { backgroundColor: COLORS.green },
  dotWarning: { backgroundColor: COLORS.gold },
  typeText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  badgeSuccess: { backgroundColor: COLORS.greenBg },
  badgeWarning: { backgroundColor: COLORS.gold + '20' },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusSuccess: { color: COLORS.green },
  statusWarning: { color: COLORS.gold },
  cardBody: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 14,
    width: 28,
  },
  infoText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  dateText: {
    color: COLORS.textDim,
    fontSize: 12,
  },
  arrow: {
    color: COLORS.textDim,
    fontSize: 16,
  },
});