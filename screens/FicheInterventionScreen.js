import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useState, useEffect, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { envoyerIntervention, supprimerIntervention, terminerIntervention, envoyerRapportParMail, uploadPhoto, fetchPhotos, deletePhoto, BASE_URL, API_KEY, recupererStatutAccuse, rechercherAnnuaireParPoste, modifierAbyla, recupererInterventionsParAbyla } from '../services/api';
import ConfirmationModal from '../components/ConfirmationModal';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';

export default function FicheInterventionScreen({ route, navigation }) {
  const { fiche } = route.params;
  const nonSauvegarde = route.params?.nonSauvegarde === true;
  const photosLocale = route.params?.photosLocale || [];
  const [sauvegarde, setSauvegarde] = useState({ enCours: false, faite: false, erreur: null });
  const [suppression, setSuppression] = useState({ visible: false, enCours: false });
  const [estTerminee, setEstTerminee] = useState(fiche.statut === 'terminé');
  const [showResolutionInput, setShowResolutionInput] = useState(false);
  const [resolution, setResolution] = useState(fiche.resolution || '');
  const [resolutionEnCours, setResolutionEnCours] = useState(false);
  const [resolutionErreur, setResolutionErreur] = useState(null);
  const [envoiRapport, setEnvoiRapport] = useState({ enCours: false, fait: false, erreur: null });
  const [accuse, setAccuse] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [photosChargement, setPhotosChargement] = useState(false);
  const [personne, setPersonne] = useState(fiche.personne || '');
  const [optionsPersonne, setOptionsPersonne] = useState([]);
  const [recherchePersonne, setRecherchePersonne] = useState(false);
  const [abyla, setAbyla] = useState(fiche.abyla || '');
  const [editionAbyla, setEditionAbyla] = useState(false);
  const [valeurAbyla, setValeurAbyla] = useState(fiche.abyla || '');
  const [sauvegardeAbyla, setSauvegardeAbyla] = useState(false);
  const [nbHistorique, setNbHistorique] = useState(null);

  useEffect(() => {
    if (nonSauvegarde) setPhotos(photosLocale);
    else if (fiche.id) chargerPhotos();
  }, []);

  // Résolution du nom via l'annuaire UL à partir du poste téléphonique
  useEffect(() => {
    if (personne || !fiche.telephone) return;
    let actif = true;
    setRecherchePersonne(true);
    rechercherAnnuaireParPoste(fiche.telephone)
      .then(({ personnes }) => {
        if (!actif) return;
        if (personnes.length === 1) setPersonne(personnes[0]);
        else if (personnes.length > 1) setOptionsPersonne(personnes);
      })
      .finally(() => { if (actif) setRecherchePersonne(false); });
    return () => { actif = false; };
  }, []);

  useEffect(() => {
    if (fiche.id && !nonSauvegarde) {
      recupererStatutAccuse('intervention', fiche.id).then(data => {
        setAccuse(data);
        if (data?.existe) setEnvoiRapport(prev => ({ ...prev, fait: true }));
      });
    }
  }, []);

  // Nombre d'interventions liées à la même pièce (n° Abyla)
  useEffect(() => {
    if (nonSauvegarde || !abyla) { setNbHistorique(null); return; }
    let actif = true;
    recupererInterventionsParAbyla(abyla)
      .then(liste => { if (actif) setNbHistorique(Array.isArray(liste) ? liste.length : null); })
      .catch(() => { if (actif) setNbHistorique(null); });
    return () => { actif = false; };
  }, [abyla, nonSauvegarde]);

  useEffect(() => {
    if (!envoiRapport.fait || accuse?.confirme) return;
    const interval = setInterval(() => {
      recupererStatutAccuse('intervention', fiche.id).then(data => {
        setAccuse(data);
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [envoiRapport.fait, accuse?.confirme]);

  async function chargerPhotos() {
    try { setPhotosChargement(true); const d = await fetchPhotos(fiche.id); setPhotos(d); }
    catch (e) {} finally { setPhotosChargement(false); }
  }

  async function handleSauvegarder() {
    try {
      setSauvegarde({ enCours: true, faite: false, erreur: null });
      const cree = await envoyerIntervention({ ...fiche, personne });
      if (photosLocale.length > 0) for (const p of photosLocale) await uploadPhoto(cree.id, p.uri, p.description);
      setSauvegarde({ enCours: false, faite: true, erreur: null });
      setTimeout(() => navigation.reset({ index: 1, routes: [{ name: 'Accueil' }, { name: 'ListeInterventions' }] }), 1000);
    } catch (e) { setSauvegarde({ enCours: false, faite: false, erreur: e.message }); }
  }

  async function handleTerminer() {
    if (resolution.trim() === '') return;
    try { setResolutionEnCours(true); setResolutionErreur(null); await terminerIntervention(fiche.id, resolution.trim()); setEstTerminee(true); setShowResolutionInput(false); setResolutionEnCours(false); }
    catch (e) { setResolutionEnCours(false); setResolutionErreur(e.message); }
  }

  async function handleEnvoyerRapport() {
    try { setEnvoiRapport({ enCours: true, fait: false, erreur: null }); await envoyerRapportParMail(fiche.id); setEnvoiRapport({ enCours: false, fait: true, erreur: null }); }
    catch (e) { setEnvoiRapport({ enCours: false, fait: false, erreur: e.message }); }
  }

  async function ajouterPhoto() {
    const mode = await new Promise(r => Alert.alert('Ajouter une photo', 'Source :', [{ text: 'Appareil photo', onPress: () => r('camera') }, { text: 'Galerie', onPress: () => r('galerie') }, { text: 'Annuler', style: 'cancel', onPress: () => r(null) }]));
    if (!mode) return;
    const perm = mode === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission refusée'); return; }
    const r = mode === 'camera' ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (r.canceled) return;
    await uploaderPhoto(r.assets[0].uri, '');
  }

  async function uploaderPhoto(uri, desc) {
    try { await uploadPhoto(fiche.id, uri, desc); await chargerPhotos(); }
    catch (e) { Alert.alert('Erreur', e.message || 'Upload impossible.'); }
  }

  async function supprimerPhotoServeur(photoId) {
    try { await deletePhoto(photoId); setPhotos(photos.filter(p => p.id !== photoId)); }
    catch (e) { Alert.alert('Erreur', 'Suppression impossible.'); }
  }

  async function handleSauvegarderAbyla() {
    const valeur = valeurAbyla.trim();
    try {
      setSauvegardeAbyla(true);
      await modifierAbyla(fiche.id, valeur);
      setAbyla(valeur);
      setEditionAbyla(false);
      setSauvegardeAbyla(false);
    } catch (e) {
      setSauvegardeAbyla(false);
      Alert.alert('Erreur', e.message || 'Enregistrement impossible.');
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Fiche d'intervention</Text>

          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>Type d'intervention</Text>
              <Text style={styles.value}>{fiche.type}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.field}>
              <Text style={styles.label}>Bâtiment</Text>
              <Text style={styles.value}>{fiche.batiment}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.field}>
              <Text style={styles.label}>Étage</Text>
              <Text style={styles.value}>{fiche.etage}</Text>
            </View>
            {fiche.entree !== 'Non spécifié' && <><View style={styles.divider} /><View style={styles.field}><Text style={styles.label}>Entrée</Text><Text style={styles.value}>{fiche.entree}</Text></View></>}
            {fiche.type === 'Téléphonie' && (
              <>
                <View style={styles.divider} />
                <View style={styles.field}>
                  <Text style={styles.label}>Téléphone</Text>
                  <Text style={styles.value}>{fiche.telephone || 'Non spécifié'}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.field}>
                  <Text style={styles.label}>Nom</Text>
                  {recherchePersonne ? (
                    <Text style={styles.value}>Recherche…</Text>
                  ) : personne ? (
                    <Text style={styles.value}>{personne}</Text>
                  ) : optionsPersonne.length > 1 ? (
                    <View style={styles.choixWrap}>
                      {optionsPersonne.map((nom) => (
                        <TouchableOpacity key={nom} style={styles.choixBtn} onPress={() => { setPersonne(nom); setOptionsPersonne([]); }}>
                          <Text style={styles.choixText}>{nom}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.value}>Non spécifié</Text>
                  )}
                </View>
              </>
            )}
            {!nonSauvegarde && (
              <>
                <View style={styles.divider} />
                <View style={styles.field}>
                  <Text style={styles.label}>N° Abyla (pièce)</Text>
                  {editionAbyla ? (
                    <View style={styles.abylaEdit}>
                      <TextInput
                        style={styles.abylaInput}
                        value={valeurAbyla}
                        onChangeText={setValeurAbyla}
                        placeholder="Ex: 45043"
                        placeholderTextColor={COLORS.textDim}
                        keyboardType="numeric"
                        autoFocus
                      />
                      <TouchableOpacity style={styles.abylaValider} onPress={handleSauvegarderAbyla} disabled={sauvegardeAbyla}>
                        {sauvegardeAbyla ? <ActivityIndicator color={COLORS.black} size="small" /> : <Text style={styles.abylaValiderText}>Valider</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.abylaAnnuler} onPress={() => { setEditionAbyla(false); setValeurAbyla(abyla); }} disabled={sauvegardeAbyla}>
                        <Text style={styles.abylaAnnulerText}>Annuler</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.abylaRow}>
                      <Text style={styles.value}>{abyla || 'Non spécifié'}</Text>
                      <TouchableOpacity style={styles.abylaIcon} onPress={() => { setValeurAbyla(abyla); setEditionAbyla(true); }}>
                        <Text style={styles.abylaIconText}>✏️</Text>
                      </TouchableOpacity>
                      {abyla ? (
                        <TouchableOpacity
                          style={styles.abylaHisto}
                          onPress={() => navigation.navigate('ListeInterventions', { abyla, titre: `Historique · pièce ${abyla}` })}
                        >
                          <Text style={styles.abylaHistoText}>🕘 Historique{nbHistorique != null ? ` (${nbHistorique})` : ''}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  )}
                </View>
              </>
            )}
            {!nonSauvegarde && <><View style={styles.divider} /><View style={styles.field}><Text style={styles.label}>Statut</Text><Text style={[styles.value, estTerminee ? styles.textSuccess : styles.textGold]}>{estTerminee ? 'Terminé' : 'En cours'}</Text></View></>}
          </View>

          <Text style={styles.sectionTitle}>Description</Text>
          <View style={styles.descCard}>
            <Text style={styles.descText}>{fiche.description}</Text>
          </View>

          {photos.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Photos ({photos.length})</Text>
              {photos.map((p, i) => (
                <View key={p.id || i} style={styles.photoItem}>
                  <Image source={nonSauvegarde ? { uri: p.uri } : { uri: `${BASE_URL}/uploads/${p.filename}`, headers: { 'x-api-key': API_KEY } }} style={styles.photoImg} />
                  {!nonSauvegarde && (
                    <TouchableOpacity style={styles.photoDel} onPress={() => supprimerPhotoServeur(p.id)}>
                      <Text style={styles.photoDelText}>✕</Text>
                    </TouchableOpacity>
                  )}
                  {p.description ? <Text style={styles.photoCap}>{p.description}</Text> : null}
                </View>
              ))}
            </>
          )}

          {photosChargement && <ActivityIndicator color={COLORS.gold} style={{ marginBottom: SPACING.xl }} />}

          {!nonSauvegarde && (
            <TouchableOpacity style={styles.addPhotoBtn} onPress={ajouterPhoto} activeOpacity={0.7}>
              <Text style={styles.addPhotoText}>📷 Ajouter une photo</Text>
            </TouchableOpacity>
          )}

          {!nonSauvegarde && estTerminee && resolution && (
            <>
              <Text style={styles.sectionTitle}>Résolution</Text>
              <View style={[styles.descCard, { borderColor: COLORS.green + '30' }]}>
                <Text style={styles.descText}>{resolution}</Text>
              </View>
            </>
          )}

          {!nonSauvegarde && !estTerminee && !showResolutionInput && (
            <TouchableOpacity style={styles.btnSuccess} onPress={() => setShowResolutionInput(true)} activeOpacity={0.8}>
              <Text style={styles.btnSuccessText}>Terminer l'intervention</Text>
            </TouchableOpacity>
          )}

          {!nonSauvegarde && !estTerminee && showResolutionInput && (
            <View style={styles.resolutionWrap}>
              <Text style={styles.resolutionLabel}>Décris ce que tu as fait :</Text>
              <TextInput style={styles.resolutionInput} multiline numberOfLines={4} textAlignVertical="top" value={resolution} onChangeText={setResolution} placeholder="Ex: J'ai remplacé la prise défectueuse..." placeholderTextColor={COLORS.textDim} />
              <View style={styles.resolutionBtns}>
                <TouchableOpacity style={styles.btnCancel} onPress={() => { setShowResolutionInput(false); setResolutionErreur(null); }}>
                  <Text style={styles.btnCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnSuccessSmall, resolutionEnCours && styles.btnDisabled]} onPress={handleTerminer} disabled={resolutionEnCours}>
                  {resolutionEnCours ? <ActivityIndicator color={COLORS.black} size="small" /> : <Text style={styles.btnSuccessSmallText}>Valider</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}
          {resolutionErreur && <View style={styles.errorBox}><Text style={styles.errorText}>{resolutionErreur}</Text></View>}

          {!nonSauvegarde && estTerminee && !envoiRapport.fait && (
            <TouchableOpacity style={[styles.btnPrimary, envoiRapport.enCours && styles.btnDisabled]} onPress={handleEnvoyerRapport} disabled={envoiRapport.enCours}>
              {envoiRapport.enCours ? <ActivityIndicator color={COLORS.black} size="small" /> : <Text style={styles.btnPrimaryText}>📧 Envoyer le rapport</Text>}
            </TouchableOpacity>
          )}
          {!nonSauvegarde && envoiRapport.fait && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>✓ Rapport envoyé !</Text>
              {accuse && (accuse.confirme
                ? <Text style={[styles.successText, { fontSize: 13, marginTop: 4 }]}>✅ Confirmé le {new Date(accuse.confirme_le).toLocaleDateString('fr-FR')}</Text>
                : <Text style={[styles.infoText, { fontSize: 13, marginTop: 4 }]}>⏳ En attente de confirmation</Text>
              )}
            </View>
          )}
          {!nonSauvegarde && envoiRapport.erreur && <View style={styles.errorBox}><Text style={styles.errorText}>{envoiRapport.erreur}</Text></View>}

          {nonSauvegarde && !sauvegarde.faite && (
            <TouchableOpacity style={[styles.btnPrimary, sauvegarde.enCours && styles.btnDisabled]} onPress={handleSauvegarder} disabled={sauvegarde.enCours}>
              {sauvegarde.enCours ? <ActivityIndicator color={COLORS.black} size="small" /> : <Text style={styles.btnPrimaryText}>Sauvegarder</Text>}
            </TouchableOpacity>
          )}
          {sauvegarde.faite && <View style={styles.successBox}><Text style={styles.successText}>✓ Intervention sauvegardée !</Text></View>}
          {sauvegarde.erreur && <View style={styles.errorBox}><Text style={styles.errorText}>{sauvegarde.erreur}</Text></View>}

          {!nonSauvegarde && (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.btnOutline} onPress={() => navigation.navigate('ModifierIntervention', { intervention: fiche })}>
                <Text style={styles.btnOutlineText}>Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnDanger} onPress={() => setSuppression({ visible: true, enCours: false })}>
                <Text style={styles.btnDangerText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <ConfirmationModal visible={suppression.visible} enCours={suppression.enCours} onAnnuler={() => setSuppression({ visible: false, enCours: false })} onConfirm={async () => { try { setSuppression({ visible: true, enCours: true }); await supprimerIntervention(fiche.id); setSuppression({ visible: false, enCours: false }); navigation.reset({ index: 1, routes: [{ name: 'Accueil' }, { name: 'ListeInterventions' }] }); } catch (e) { setSuppression({ visible: false, enCours: false }); } }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.black },
  scrollContent: { alignItems: 'center', padding: SPACING.xl, paddingBottom: 60 },
  title: { color: COLORS.gold, fontSize: 24, fontWeight: '900', fontFamily: 'ArchivoBlack_400Regular', marginBottom: SPACING.xxl },
  card: { width: '100%', backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.cardBorder, marginBottom: SPACING.xxl, ...SHADOWS.card },
  field: { paddingVertical: SPACING.sm },
  label: { color: COLORS.textDim, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  value: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginTop: 3 },
  textSuccess: { color: COLORS.green },
  textGold: { color: COLORS.gold },
  choixWrap: { marginTop: SPACING.sm, gap: SPACING.sm },
  choixBtn: { paddingVertical: 10, paddingHorizontal: SPACING.lg, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.gold, alignSelf: 'flex-start' },
  choixText: { color: COLORS.gold, fontSize: 15, fontWeight: '700' },
  abylaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  abylaIcon: { paddingHorizontal: SPACING.sm, paddingVertical: 2 },
  abylaIconText: { fontSize: 16 },
  abylaHisto: { marginLeft: SPACING.sm, paddingVertical: 4, paddingHorizontal: SPACING.md, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.gold },
  abylaHistoText: { color: COLORS.gold, fontSize: 13, fontWeight: '700' },
  abylaEdit: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.sm },
  abylaInput: { flex: 1, backgroundColor: COLORS.input, color: COLORS.text, fontSize: 15, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderWidth: 1, borderColor: COLORS.gold + '60' },
  abylaValider: { backgroundColor: COLORS.green, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg, borderRadius: RADIUS.full, minWidth: 80, alignItems: 'center' },
  abylaValiderText: { color: COLORS.black, fontSize: 14, fontWeight: '700' },
  abylaAnnuler: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.cardBorder },
  abylaAnnulerText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  divider: { height: 1, backgroundColor: COLORS.cardBorder, marginVertical: SPACING.xs },
  sectionTitle: { color: COLORS.gold, fontSize: 17, fontWeight: '700', alignSelf: 'flex-start', marginBottom: SPACING.md, marginTop: SPACING.md },
  descCard: { width: '100%', backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.cardBorder, marginBottom: SPACING.xxl },
  descText: { color: COLORS.text, fontSize: 15, lineHeight: 22 },
  photoItem: { width: '100%', marginBottom: SPACING.md, position: 'relative' },
  photoImg: { width: '100%', height: 200, borderRadius: RADIUS.md, backgroundColor: COLORS.input },
  photoDel: { position: 'absolute', top: 8, right: 8, backgroundColor: COLORS.red, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  photoDelText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  photoCap: { color: COLORS.textMuted, fontSize: 13, marginTop: SPACING.sm, fontStyle: 'italic' },
  addPhotoBtn: { width: '100%', borderWidth: 2, borderColor: COLORS.gold + '40', borderStyle: 'dashed', borderRadius: RADIUS.md, paddingVertical: SPACING.lg, alignItems: 'center', marginBottom: SPACING.xl },
  addPhotoText: { color: COLORS.gold, fontSize: 15, fontWeight: '600' },
  resolutionWrap: { width: '100%', marginTop: SPACING.md, marginBottom: SPACING.md },
  resolutionLabel: { color: COLORS.text, fontSize: 15, fontWeight: '600', marginBottom: SPACING.md },
  resolutionInput: { width: '100%', minHeight: 100, backgroundColor: COLORS.input, color: COLORS.text, fontSize: 15, borderRadius: RADIUS.md, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.green + '40', marginBottom: SPACING.md },
  resolutionBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.md },
  btnCancel: { paddingVertical: 12, paddingHorizontal: 25, borderRadius: RADIUS.full, borderWidth: 2, borderColor: COLORS.cardBorder },
  btnCancelText: { color: COLORS.textMuted, fontSize: 15, fontWeight: '600' },
  btnSuccessSmall: { backgroundColor: COLORS.green, paddingVertical: 12, paddingHorizontal: 25, borderRadius: RADIUS.full, minWidth: 100, alignItems: 'center' },
  btnSuccessSmallText: { color: COLORS.black, fontSize: 15, fontWeight: '700' },
  btnSuccess: { backgroundColor: COLORS.green, paddingVertical: 15, paddingHorizontal: 30, borderRadius: RADIUS.full, marginTop: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.card, minWidth: 220, alignItems: 'center' },
  btnSuccessText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  btnPrimary: { backgroundColor: COLORS.gold, paddingVertical: 15, paddingHorizontal: 30, borderRadius: RADIUS.full, marginTop: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.gold, minWidth: 220, alignItems: 'center' },
  btnPrimaryText: { color: COLORS.black, fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  btnOutline: { flex: 1, paddingVertical: 14, borderRadius: RADIUS.full, borderWidth: 2, borderColor: COLORS.gold, alignItems: 'center' },
  btnOutlineText: { color: COLORS.gold, fontSize: 16, fontWeight: '700' },
  btnDanger: { flex: 1, backgroundColor: COLORS.red, paddingVertical: 14, borderRadius: RADIUS.full, alignItems: 'center' },
  btnDangerText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  actions: { flexDirection: 'row', width: '100%', gap: SPACING.md, marginTop: SPACING.xxxl, marginBottom: SPACING.xl },
  successBox: { backgroundColor: COLORS.greenBg, paddingVertical: 12, paddingHorizontal: 25, borderRadius: RADIUS.md, marginTop: SPACING.lg, marginBottom: SPACING.xl },
  successText: { color: COLORS.green, fontSize: 15, fontWeight: '700' },
  infoText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
  errorBox: { backgroundColor: COLORS.redBg, paddingVertical: 12, paddingHorizontal: 25, borderRadius: RADIUS.md, marginTop: SPACING.lg, marginBottom: SPACING.xl },
  errorText: { color: COLORS.red, fontSize: 14, fontWeight: '600' },
});