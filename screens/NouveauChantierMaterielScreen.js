import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useState } from 'react';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';

export default function NouveauChantierMaterielScreen({ navigation, route }) {
  const { localisation, taches } = route.params;
  const [materiels, setMateriels] = useState([]);
  const [nom, setNom] = useState('');
  const [quantite, setQuantite] = useState('1');
  const [reference, setReference] = useState('');

  function ajouterMateriel() {
    if (nom.trim() === '') return;
    const qte = parseInt(quantite, 10) || 1;
    setMateriels([...materiels, { nom: nom.trim(), quantite: qte, reference: reference.trim() }]);
    setNom('');
    setQuantite('1');
    setReference('');
  }

  function supprimerMateriel(index) {
    setMateriels(materiels.filter((_, i) => i !== index));
  }

  function handleSuivant() {
    navigation.navigate('RecapChantier', { localisation, taches, materiels });
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
          <View style={[styles.step, styles.stepActive]}><Text style={styles.stepNum}>3</Text></View>
          <View style={styles.stepLine} />
          <View style={styles.step}><Text style={styles.stepNumInactive}>4</Text></View>
        </View>

        <Text style={styles.title}>Ajouter du matériel</Text>
        <Text style={styles.desc}>{materiels.length} article{materiels.length > 1 ? 's' : ''}</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Nom du matériel"
            placeholderTextColor={COLORS.textDim}
            value={nom}
            onChangeText={setNom}
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.inputSmall]}
              placeholder="Qté"
              placeholderTextColor={COLORS.textDim}
              keyboardType="numeric"
              value={quantite}
              onChangeText={setQuantite}
            />
            <TextInput
              style={[styles.input, styles.inputLarge]}
              placeholder="Référence (optionnel)"
              placeholderTextColor={COLORS.textDim}
              value={reference}
              onChangeText={setReference}
            />
            <TouchableOpacity style={styles.addBtn} onPress={ajouterMateriel}>
              <Text style={styles.addBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {materiels.map((m, i) => (
            <View key={i} style={styles.item}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{m.nom}</Text>
                <Text style={styles.itemDetail}>
                  Qté: {m.quantite}{m.reference ? `  •  Réf: ${m.reference}` : ''}
                </Text>
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => supprimerMateriel(i)}>
                <Text style={styles.deleteBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.button} onPress={handleSuivant}>
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
  form: { marginBottom: SPACING.lg },
  input: {
    backgroundColor: COLORS.input, color: COLORS.text, fontSize: 15,
    borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.cardBorder, marginBottom: SPACING.sm,
  },
  row: { flexDirection: 'row' },
  inputSmall: { flex: 0.8, marginRight: SPACING.sm },
  inputLarge: { flex: 1.5, marginRight: SPACING.sm },
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
  itemInfo: { flex: 1 },
  itemName: { color: COLORS.gold, fontSize: 15, fontWeight: '600' },
  itemDetail: { color: COLORS.textMuted, fontSize: 12, marginTop: 3 },
  deleteBtn: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.red + '30',
    justifyContent: 'center', alignItems: 'center', marginLeft: SPACING.sm,
  },
  deleteBtnText: { color: COLORS.red, fontSize: 14, fontWeight: '700' },
  button: {
    backgroundColor: COLORS.gold, paddingVertical: 16, borderRadius: RADIUS.full,
    alignItems: 'center', ...SHADOWS.gold,
  },
  buttonText: { color: COLORS.black, fontSize: 17, fontWeight: '700' },
});