import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { creerChantier } from '../services/api';
import SuccesModal from '../components/SuccesModal';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';

export default function RecapChantierScreen({ navigation, route }) {
  const { localisation, taches, materiels } = route.params;
  const [chargement, setChargement] = useState(false);
  const [succesVisible, setSuccesVisible] = useState(false);

  async function handleEnregistrer() {
    setChargement(true);
    try {
      await creerChantier({ localisation, taches, materiels });
      setSuccesVisible(true);
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setChargement(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.steps}>
          <View style={styles.stepDone}><Text style={styles.stepDoneText}>✓</Text></View>
          <View style={styles.stepLine} />
          <View style={styles.stepDone}><Text style={styles.stepDoneText}>✓</Text></View>
          <View style={styles.stepLine} />
          <View style={styles.stepDone}><Text style={styles.stepDoneText}>✓</Text></View>
          <View style={styles.stepLine} />
          <View style={[styles.step, styles.stepActive]}><Text style={styles.stepNum}>4</Text></View>
        </View>

        <Text style={styles.title}>Récapitulatif</Text>
        <Text style={styles.desc}>Vérifiez avant d'enregistrer</Text>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionIcon}>📍</Text>
            <Text style={styles.sectionTitle}>Localisation</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardText}>{localisation}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionIcon}>📋</Text>
            <Text style={styles.sectionTitle}>Tâches ({taches.length})</Text>
          </View>
          {taches.map((t, i) => (
            <View key={i} style={styles.item}>
              <View style={styles.itemDot} />
              <Text style={styles.itemText}>{t.description}</Text>
            </View>
          ))}

          <View style={styles.section}>
            <Text style={styles.sectionIcon}>🔧</Text>
            <Text style={styles.sectionTitle}>Matériel ({materiels.length})</Text>
          </View>
          {materiels.map((m, i) => (
            <View key={i} style={styles.item}>
              <View style={styles.itemDot} />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{m.nom}</Text>
                <Text style={styles.itemDetail}>
                  Qté: {m.quantite}{m.reference ? `  •  Réf: ${m.reference}` : ''}
                </Text>
              </View>
            </View>
          ))}

          {taches.length === 0 && materiels.length === 0 && (
            <Text style={styles.empty}>Aucune tâche ni matériel ajouté</Text>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>

        <TouchableOpacity
          style={[styles.button, chargement && styles.buttonDisabled]}
          onPress={handleEnregistrer}
          disabled={chargement}
        >
          {chargement ? (
            <ActivityIndicator color={COLORS.black} />
          ) : (
            <Text style={styles.buttonText}>Enregistrer le chantier</Text>
          )}
        </TouchableOpacity>
      </View>

      <SuccesModal
        visible={succesVisible}
        message="Chantier créé avec succès !"
        onPress={() => {
          setSuccesVisible(false);
          navigation.reset({
            index: 2,
            routes: [
              { name: 'Accueil' },
              { name: 'Chantier' },
              { name: 'ListeChantiers' },
            ],
          });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.black },
  container: { flex: 1, paddingHorizontal: SPACING.xl, paddingTop: SPACING.xl },
  steps: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.xxxl },
  step: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.cardBorder },
  stepActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  stepDone: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.green, borderWidth: 2, borderColor: COLORS.green },
  stepDoneText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  stepNum: { color: COLORS.black, fontSize: 16, fontWeight: '800' },
  stepLine: { width: 30, height: 2, backgroundColor: COLORS.cardBorder },
  title: { color: COLORS.text, fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: SPACING.sm },
  desc: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginBottom: SPACING.xxl },
  scroll: { flex: 1 },
  section: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm, marginTop: SPACING.lg },
  sectionIcon: { fontSize: 16, marginRight: SPACING.sm },
  sectionTitle: { color: COLORS.gold, fontSize: 16, fontWeight: '700' },
  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  cardText: { color: COLORS.text, fontSize: 15 },
  item: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.xs,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  itemDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.gold, marginRight: SPACING.md },
  itemText: { flex: 1, color: COLORS.text, fontSize: 14 },
  itemInfo: { flex: 1 },
  itemName: { color: COLORS.gold, fontSize: 14, fontWeight: '600' },
  itemDetail: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  empty: { color: COLORS.textDim, fontSize: 14, textAlign: 'center', marginTop: SPACING.lg, fontStyle: 'italic' },
  button: {
    backgroundColor: COLORS.gold, paddingVertical: 16, borderRadius: RADIUS.full,
    alignItems: 'center', marginBottom: SPACING.lg, ...SHADOWS.gold,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: COLORS.black, fontSize: 17, fontWeight: '700' },
});