import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useState } from 'react';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';

export default function NouveauChantierTachesScreen({ navigation, route }) {
  const { localisation } = route.params;
  const [taches, setTaches] = useState([]);
  const [saisie, setSaisie] = useState('');

  function ajouterTache() {
    if (saisie.trim() === '') return;
    setTaches([...taches, { description: saisie.trim() }]);
    setSaisie('');
  }

  function supprimerTache(index) {
    setTaches(taches.filter((_, i) => i !== index));
  }

  function handleSuivant() {
    navigation.navigate('NouveauChantierMateriel', { localisation, taches });
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.steps}>
          <View style={styles.stepDone}><Text style={styles.stepDoneText}>✓</Text></View>
          <View style={styles.stepLine} />
          <View style={[styles.step, styles.stepActive]}><Text style={styles.stepNum}>2</Text></View>
          <View style={styles.stepLine} />
          <View style={styles.step}><Text style={styles.stepNumInactive}>3</Text></View>
          <View style={styles.stepLine} />
          <View style={styles.step}><Text style={styles.stepNumInactive}>4</Text></View>
        </View>

        <Text style={styles.title}>Ajouter des tâches</Text>
        <Text style={styles.desc}>{taches.length} tâche{taches.length > 1 ? 's' : ''} ajoutée{taches.length > 1 ? 's' : ''}</Text>

        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            placeholder="Nouvelle tâche..."
            placeholderTextColor={COLORS.textDim}
            value={saisie}
            onChangeText={setSaisie}
            onSubmitEditing={ajouterTache}
          />
          <TouchableOpacity style={styles.addBtn} onPress={ajouterTache}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {taches.map((t, i) => (
            <View key={i} style={styles.item}>
              <View style={styles.itemDot} />
              <Text style={styles.itemText}>{t.description}</Text>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => supprimerTache(i)}>
                <Text style={styles.deleteBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[styles.button, taches.length === 0 && styles.buttonDisabled]}
          onPress={handleSuivant}
          disabled={taches.length === 0}
        >
          <Text style={styles.buttonText}>Suivant →</Text>
        </TouchableOpacity>
      </View>
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
  stepNumInactive: { color: COLORS.textDim, fontSize: 16, fontWeight: '600' },
  stepLine: { width: 30, height: 2, backgroundColor: COLORS.cardBorder },
  title: { color: COLORS.text, fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: SPACING.sm },
  desc: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginBottom: SPACING.xl },
  addRow: { flexDirection: 'row', marginBottom: SPACING.lg },
  addInput: {
    flex: 1, backgroundColor: COLORS.input, color: COLORS.text, fontSize: 15,
    borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.cardBorder, marginRight: SPACING.sm,
  },
  addBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.gold,
    justifyContent: 'center', alignItems: 'center',
  },
  addBtnText: { color: COLORS.black, fontSize: 24, fontWeight: '600', lineHeight: 26 },
  list: { flex: 1, marginBottom: SPACING.md },
  item: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  itemDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.gold, marginRight: SPACING.md },
  itemText: { flex: 1, color: COLORS.text, fontSize: 15 },
  deleteBtn: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.red + '30',
    justifyContent: 'center', alignItems: 'center', marginLeft: SPACING.sm,
  },
  deleteBtnText: { color: COLORS.red, fontSize: 14, fontWeight: '700' },
  button: {
    backgroundColor: COLORS.gold, paddingVertical: 16, borderRadius: RADIUS.full,
    alignItems: 'center', ...SHADOWS.gold,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: COLORS.black, fontSize: 17, fontWeight: '700' },
});