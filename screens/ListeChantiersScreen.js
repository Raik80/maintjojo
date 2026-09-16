import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useFonts, ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';
import { recupererChantiers } from '../services/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';

export default function ListeChantiersScreen({ navigation }) {
  const [fontsLoaded] = useFonts({ ArchivoBlack_400Regular });
  const [chantiers, setChantiers] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  const chargerChantiers = useCallback(async () => {
    try {
      setChargement(true);
      setErreur(null);
      const d = await recupererChantiers();
      setChantiers(d);
    } catch (e) {
      setErreur(e.message);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { chargerChantiers(); }, [chargerChantiers]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => chargerChantiers());
    return unsub;
  }, [navigation, chargerChantiers]);

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
        <TouchableOpacity style={styles.retryBtn} onPress={chargerChantiers}>
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <FlatList
        data={chantiers}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Text style={styles.pageTitle}>Mes chantiers</Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🏗️</Text>
            <Text style={styles.emptyText}>Aucun chantier enregistré</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isClosed = item.statut === 'terminé';
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('DetailChantier', { id: item.id })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.locText}>{item.localisation}</Text>
                <View style={[styles.statusBadge, isClosed ? styles.badgeSuccess : styles.badgeWarning]}>
                  <Text style={[styles.statusText, isClosed ? styles.statusSuccess : styles.statusWarning]}>
                    {isClosed ? 'Terminé' : 'En cours'}
                  </Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statIcon}>📋</Text>
                  <Text style={styles.statValue}>{item.nb_taches}</Text>
                  <Text style={styles.statLabel}>tâche{item.nb_taches > 1 ? 's' : ''}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statIcon}>🔧</Text>
                  <Text style={styles.statValue}>{item.nb_materiels}</Text>
                  <Text style={styles.statLabel}>matériel{item.nb_materiels > 1 ? 's' : ''}</Text>
                </View>
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
  loading: { color: COLORS.gold, marginTop: SPACING.md, fontSize: 16 },
  erreur: { color: COLORS.red, fontSize: 16, textAlign: 'center', marginBottom: SPACING.xl },
  retryBtn: { backgroundColor: COLORS.gold, paddingVertical: 12, paddingHorizontal: 30, borderRadius: RADIUS.full },
  retryText: { color: COLORS.black, fontSize: 16, fontWeight: '700' },
  pageTitle: {
    color: COLORS.gold, fontSize: 26, fontWeight: '900',
    fontFamily: 'ArchivoBlack_400Regular', textAlign: 'center',
    marginTop: SPACING.xl, marginBottom: SPACING.xxl,
  },
  listContent: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xxxl },
  emptyWrap: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.lg },
  emptyText: { color: COLORS.textMuted, fontSize: 16, fontWeight: '600' },
  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.lg,
    marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.cardBorder, ...SHADOWS.card,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  locText: { color: COLORS.text, fontSize: 16, fontWeight: '700', flex: 1, marginRight: SPACING.md },
  statusBadge: { paddingHorizontal: SPACING.md, paddingVertical: 5, borderRadius: RADIUS.full },
  badgeSuccess: { backgroundColor: COLORS.greenBg },
  badgeWarning: { backgroundColor: COLORS.gold + '20' },
  statusText: { fontSize: 12, fontWeight: '700' },
  statusSuccess: { color: COLORS.green },
  statusWarning: { color: COLORS.gold },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.dark, borderRadius: RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  stat: { alignItems: 'center', flex: 1 },
  statIcon: { fontSize: 18, marginBottom: 4 },
  statValue: { color: COLORS.gold, fontSize: 20, fontWeight: '800' },
  statLabel: { color: COLORS.textDim, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 30, backgroundColor: COLORS.cardBorder },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.cardBorder,
  },
  dateText: { color: COLORS.textDim, fontSize: 12 },
  arrow: { color: COLORS.textDim, fontSize: 16 },
});