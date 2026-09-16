import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView } from 'react-native';
import { useState } from 'react';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';

export default function NouveauChantierLocalisationScreen({ navigation }) {
  const [localisation, setLocalisation] = useState('');

  function handleSuivant() {
    navigation.navigate('NouveauChantierTaches', { localisation: localisation.trim() });
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.steps}>
          <View style={[styles.step, styles.stepActive]}><Text style={styles.stepNum}>1</Text></View>
          <View style={styles.stepLine} />
          <View style={styles.step}><Text style={styles.stepNumInactive}>2</Text></View>
          <View style={styles.stepLine} />
          <View style={styles.step}><Text style={styles.stepNumInactive}>3</Text></View>
          <View style={styles.stepLine} />
          <View style={styles.step}><Text style={styles.stepNumInactive}>4</Text></View>
        </View>

        <Text style={styles.title}>Localisation du chantier</Text>
        <Text style={styles.desc}>Où se situe le chantier ?</Text>

        <TextInput
          style={styles.input}
          placeholder="Ex: Bâtiment A, 3ème étage, salle 302"
          placeholderTextColor={COLORS.textDim}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          value={localisation}
          onChangeText={setLocalisation}
        />

        <TouchableOpacity
          style={[styles.button, !localisation.trim() && styles.buttonDisabled]}
          onPress={handleSuivant}
          disabled={!localisation.trim()}
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
  stepNum: { color: COLORS.black, fontSize: 16, fontWeight: '800' },
  stepNumInactive: { color: COLORS.textDim, fontSize: 16, fontWeight: '600' },
  stepLine: { width: 30, height: 2, backgroundColor: COLORS.cardBorder },
  title: { color: COLORS.text, fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: SPACING.sm },
  desc: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginBottom: SPACING.xxl },
  input: {
    backgroundColor: COLORS.input, color: COLORS.text, fontSize: 15,
    borderRadius: RADIUS.md, padding: SPACING.lg, borderWidth: 1,
    borderColor: COLORS.cardBorder, minHeight: 120,
  },
  button: {
    backgroundColor: COLORS.gold, paddingVertical: 16, borderRadius: RADIUS.full,
    alignItems: 'center', marginTop: SPACING.xxl, ...SHADOWS.gold,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: COLORS.black, fontSize: 17, fontWeight: '700' },
});