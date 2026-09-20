import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { analyserIntervention } from '../services/analyseIntervention';
import { modifierIntervention, rechercherAnnuaireParPoste } from '../services/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';

export default function ModifierInterventionScreen({ route, navigation }) {
  const { intervention } = route.params;
  const [nouveauTexte, setNouveauTexte] = useState(intervention.description || '');
  const [resultat, setResultat] = useState({
    type: intervention.type, batiment: intervention.batiment,
    etage: intervention.etage, entree: intervention.entree,
    telephone: intervention.telephone || '',
    personne: intervention.personne || '',
  });
  const [sauvegarde, setSauvegarde] = useState({ enCours: false, erreur: null });
  const [optionsPersonne, setOptionsPersonne] = useState([]);
  const [recherchePersonne, setRecherchePersonne] = useState(false);

  async function handleReanalyser() {
    if (nouveauTexte.trim() === '') return;
    const fiche = analyserIntervention(nouveauTexte);
    const telephone = fiche.telephone || '';
    // Le nom est conservé seulement si le poste n'a pas changé
    const personne = telephone && telephone === resultat.telephone ? resultat.personne : '';

    setResultat({
      type: fiche.type, batiment: fiche.batiment, etage: fiche.etage, entree: fiche.entree,
      telephone, personne,
    });
    setOptionsPersonne([]);

    // Recherche du nom dans l'annuaire UL (uniquement au clic sur Ré-analyser)
    if (telephone && !personne) {
      setRecherchePersonne(true);
      try {
        const { personnes } = await rechercherAnnuaireParPoste(telephone);
        if (personnes.length === 1) {
          setResultat(prev => ({ ...prev, personne: personnes[0] }));
        } else if (personnes.length > 1) {
          setOptionsPersonne(personnes);
        }
      } finally {
        setRecherchePersonne(false);
      }
    }
  }

  async function handleEnregistrerModifications() {
    if (nouveauTexte.trim() === '') return;
    try {
      setSauvegarde({ enCours: true, erreur: null });
      await modifierIntervention(intervention.id, {
        type: resultat.type, batiment: resultat.batiment,
        etage: resultat.etage, entree: resultat.entree,
        telephone: resultat.telephone,
        personne: resultat.personne,
        description: nouveauTexte.trim(),
      });
      navigation.reset({ index: 1, routes: [{ name: 'Accueil' }, { name: 'ListeInterventions' }] });
    } catch (e) {
      setSauvegarde({ enCours: false, erreur: e.message });
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <StatusBar style="light" />
      <Text style={styles.title}>Modifier l'intervention</Text>

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={styles.input}
        value={nouveauTexte}
        onChangeText={setNouveauTexte}
        multiline numberOfLines={6}
        textAlignVertical="top"
        placeholderTextColor={COLORS.textDim}
      />

      <TouchableOpacity style={styles.secondaryBtn} onPress={handleReanalyser} activeOpacity={0.7}>
        <Text style={styles.secondaryBtnText}>Ré-analyser</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Résultats de l'analyse</Text>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Type</Text>
          <Text style={styles.fieldValue}>{resultat.type}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Bâtiment</Text>
          <Text style={styles.fieldValue}>{resultat.batiment}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Étage</Text>
          <Text style={styles.fieldValue}>{resultat.etage}</Text>
        </View>
        {resultat.entree !== 'Non spécifié' && (
          <>
            <View style={styles.divider} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Entrée</Text>
              <Text style={styles.fieldValue}>{resultat.entree}</Text>
            </View>
          </>
        )}
        {resultat.type === 'Téléphonie' && (
          <>
            <View style={styles.divider} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Téléphone</Text>
              <Text style={styles.fieldValue}>{resultat.telephone || 'Non spécifié'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Nom</Text>
              {recherchePersonne ? (
                <Text style={styles.fieldValue}>Recherche…</Text>
              ) : resultat.personne ? (
                <Text style={styles.fieldValue}>{resultat.personne}</Text>
              ) : optionsPersonne.length > 1 ? (
                <View style={styles.choixWrap}>
                  {optionsPersonne.map((nom) => (
                    <TouchableOpacity key={nom} style={styles.choixBtn} onPress={() => { setResultat(prev => ({ ...prev, personne: nom })); setOptionsPersonne([]); }}>
                      <Text style={styles.choixText}>{nom}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={styles.fieldValue}>Non spécifié</Text>
              )}
            </View>
          </>
        )}
      </View>

      <TouchableOpacity
        style={[styles.button, sauvegarde.enCours && styles.buttonDisabled]}
        onPress={handleEnregistrerModifications}
        disabled={sauvegarde.enCours}
      >
        {sauvegarde.enCours ? (
          <ActivityIndicator color={COLORS.black} />
        ) : (
          <Text style={styles.buttonText}>Enregistrer les modifications</Text>
        )}
      </TouchableOpacity>

      {sauvegarde.erreur && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{sauvegarde.erreur}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.black },
  content: { alignItems: 'center', padding: SPACING.xl },
  title: { color: COLORS.gold, fontSize: 24, fontWeight: '900', fontFamily: 'ArchivoBlack_400Regular', marginBottom: SPACING.xxl },
  label: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600', alignSelf: 'flex-start', marginBottom: SPACING.sm, textTransform: 'uppercase', letterSpacing: 1 },
  input: {
    width: '100%', minHeight: 120, backgroundColor: COLORS.input, color: COLORS.text,
    fontSize: 15, borderRadius: RADIUS.md, padding: SPACING.lg, borderWidth: 1,
    borderColor: COLORS.cardBorder, marginBottom: SPACING.md,
  },
  secondaryBtn: {
    paddingVertical: 12, paddingHorizontal: 35, borderRadius: RADIUS.full,
    borderWidth: 2, borderColor: COLORS.gold, marginBottom: SPACING.xxl,
  },
  secondaryBtnText: { color: COLORS.gold, fontSize: 16, fontWeight: '700' },
  card: {
    width: '100%', backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.cardBorder, marginBottom: SPACING.xxl,
  },
  cardTitle: { color: COLORS.gold, fontSize: 16, fontWeight: '700', marginBottom: SPACING.md },
  field: { paddingVertical: SPACING.sm },
  fieldLabel: { color: COLORS.textDim, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  fieldValue: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginTop: 3 },
  choixWrap: { marginTop: SPACING.sm, gap: SPACING.sm },
  choixBtn: { paddingVertical: 10, paddingHorizontal: SPACING.lg, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.gold, alignSelf: 'flex-start' },
  choixText: { color: COLORS.gold, fontSize: 15, fontWeight: '700' },
  divider: { height: 1, backgroundColor: COLORS.cardBorder, marginVertical: SPACING.xs },
  button: {
    backgroundColor: COLORS.gold, paddingVertical: 15, paddingHorizontal: 40,
    borderRadius: RADIUS.full, marginBottom: SPACING.xl, ...SHADOWS.gold,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: COLORS.black, fontSize: 17, fontWeight: '700' },
  errorBox: { backgroundColor: COLORS.red, paddingVertical: 12, paddingHorizontal: 25, borderRadius: RADIUS.md, marginBottom: SPACING.xl },
  errorText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
});