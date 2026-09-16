import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import { Image } from 'expo-image';
import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BASE_URL, API_KEY, recupererChantierParId, modifierChantier, supprimerChantier, toggleTacheStatut, terminerChantier, envoyerRapportChantierParMail, uploadPhotoChantier, fetchPhotosChantier, updateDescriptionPhotoChantier, deletePhotoChantier, recupererStatutAccuse, rechercherProduitParCodeBarre } from '../services/api';
import SuccesModal from '../components/SuccesModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';

export default function DetailChantierScreen({ navigation, route }) {
  const { id } = route.params;
  const [modeEdition, setModeEdition] = useState(false);
  const [chantier, setChantier] = useState(null);
  const [localisation, setLocalisation] = useState('');
  const [taches, setTaches] = useState([]);
  const [materiels, setMateriels] = useState([]);
  const [nouvelleTache, setNouvelleTache] = useState('');
  const [nouveauMaterielNom, setNouveauMaterielNom] = useState('');
  const [nouveauMaterielQte, setNouveauMaterielQte] = useState('1');
  const [nouveauMaterielRef, setNouveauMaterielRef] = useState('');
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [suppression, setSuppression] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [succesVisible, setSuccesVisible] = useState(false);
  const [messageSucces, setMessageSucces] = useState('');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [suppressionReussie, setSuppressionReussie] = useState(false);
  const [terminaisonChargement, setTerminaisonChargement] = useState(false);
const [envoiChargement, setEnvoiChargement] = useState(false);
const [rapportEnvoye, setRapportEnvoye] = useState(false);
const [accuse, setAccuse] = useState(null);
const [scanVisible, setScanVisible] = useState(false);
const [scanChargement, setScanChargement] = useState(false);
const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [confirmTerminerVisible, setConfirmTerminerVisible] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [photoEnUpload, setPhotoEnUpload] = useState(false);
  const [legendeEdition, setLegendeEdition] = useState(null);
  const [legendeTexte, setLegendeTexte] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity style={{ marginRight: 10, padding: 8 }} onPress={() => setModeEdition(!modeEdition)}>
          <Text style={{ fontSize: 22 }}>{modeEdition ? '✔' : '✏️'}</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, modeEdition]);

  const chargerDonnees = useCallback(async () => {
    try {
      setChargement(true); setErreur(null);
      const d = await recupererChantierParId(id);
      setChantier(d); setLocalisation(d.localisation); setTaches(d.taches || []); setMateriels(d.materiels || []);
      try { const pd = await fetchPhotosChantier(id); setPhotos(pd || []); } catch (e) {}
    } catch (e) { setErreur(e.message); }
    finally { setChargement(false); }
  }, [id]);

  useEffect(() => { chargerDonnees(); }, [chargerDonnees]);
  useEffect(() => { const u = navigation.addListener('focus', () => chargerDonnees()); return u; }, [navigation, chargerDonnees]);

  useEffect(() => {
    if (id) {
      recupererStatutAccuse('chantier', id).then(data => {
        setAccuse(data);
        if (data?.existe) setRapportEnvoye(true);
      });
    }
  }, []);

  useEffect(() => {
    if (!rapportEnvoye || accuse?.confirme) return;
    const interval = setInterval(() => {
      recupererStatutAccuse('chantier', id).then(setAccuse);
    }, 5000);
    return () => clearInterval(interval);
  }, [rapportEnvoye, accuse?.confirme]);

  async function handleToggleTache(tacheId) {
    try { const m = await toggleTacheStatut(id, tacheId); setTaches(taches.map(t => t.id === tacheId ? { ...t, statut: m.statut } : t)); }
    catch (e) { Alert.alert('Erreur', e.message); }
  }
  function handleAjouterTache() { if (nouvelleTache.trim() === '') return; setTaches([...taches, { id: -Date.now(), description: nouvelleTache.trim(), statut: 'à faire' }]); setNouvelleTache(''); }
  function handleSupprimerTache(index) { setTaches(taches.filter((_, i) => i !== index)); }
  function handleAjouterMateriel() { if (nouveauMaterielNom.trim() === '') return; const q = parseInt(nouveauMaterielQte, 10) || 1; setMateriels([...materiels, { id: -Date.now(), nom: nouveauMaterielNom.trim(), quantite: q, reference: nouveauMaterielRef.trim() }]); setNouveauMaterielNom(''); setNouveauMaterielQte('1'); setNouveauMaterielRef(''); }
  function handleSupprimerMateriel(index) { setMateriels(materiels.filter((_, i) => i !== index)); }

  async function handleEnregistrer() {
    if (localisation.trim() === '') { Alert.alert('Erreur', 'La localisation ne peut pas être vide.'); return; }
    setEnregistrement(true);
    try { await modifierChantier(id, { localisation: localisation.trim(), taches: taches.map(t => ({ description: t.description })), materiels: materiels.map(m => ({ nom: m.nom, quantite: m.quantite, reference: m.reference })) }); setMessageSucces('Chantier mis à jour !'); setSuccesVisible(true); }
    catch (e) { Alert.alert('Erreur', e.message); }
    finally { setEnregistrement(false); }
  }

  async function handleSupprimer() {
    setSuppression(true);
    try { await supprimerChantier(id); setConfirmVisible(false); setSuppression(false); setSuppressionReussie(true); setMessageSucces('Chantier supprimé !'); setSuccesVisible(true); }
    catch (e) { Alert.alert('Erreur', e.message); setSuppression(false); }
  }

  async function handleTerminer() {
    setTerminaisonChargement(true);
    try { await terminerChantier(id); setConfirmTerminerVisible(false); setMessageSucces('Chantier marqué comme terminé !'); setSuccesVisible(true); }
    catch (e) { Alert.alert('Erreur', e.message); }
    finally { setTerminaisonChargement(false); }
  }

  async function handleEnvoyerRapport() {
    setEnvoiChargement(true);
    try { await envoyerRapportChantierParMail(id); setMessageSucces('Rapport envoyé !'); setSuccesVisible(true); setRapportEnvoye(true); recupererStatutAccuse('chantier', id).then(setAccuse); }
    catch (e) { Alert.alert('Erreur', e.message); }
    finally { setEnvoiChargement(false); }
  }

  async function ajouterPhoto() {
    const mode = await new Promise(r => Alert.alert('Ajouter une photo', 'Source :', [{ text: 'Appareil photo', onPress: () => r('camera') }, { text: 'Galerie', onPress: () => r('galerie') }, { text: 'Annuler', style: 'cancel', onPress: () => r(null) }]));
    if (!mode) return;
    const perm = mode === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission refusée'); return; }
    const r = mode === 'camera' ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (r.canceled) return;
    await uploaderPhoto(r.assets[0].uri);
  }

  async function uploaderPhoto(uri) {
    setPhotoEnUpload(true);
    try { await uploadPhotoChantier(id, uri, ''); const d = await fetchPhotosChantier(id); setPhotos(d || []); }
    catch (e) { Alert.alert('Erreur', e.message || 'Upload impossible.'); }
    finally { setPhotoEnUpload(false); }
  }

  async function supprimerPhoto(photoId) { try { await deletePhotoChantier(photoId); setPhotos(photos.filter(p => p.id !== photoId)); } catch (e) { Alert.alert('Erreur', 'Suppression impossible.'); } }
  function commencerEditionLegende(p) { setLegendeEdition(p.id); setLegendeTexte(p.description || ''); }
  async function sauvegarderLegende(photoId) { try { await updateDescriptionPhotoChantier(photoId, legendeTexte.trim()); setPhotos(photos.map(p => p.id === photoId ? { ...p, description: legendeTexte.trim() } : p)); setLegendeEdition(null); setLegendeTexte(''); } catch (e) { Alert.alert('Erreur', 'Mise à jour impossible.'); } }
  function annulerEditionLegende() { setLegendeEdition(null); setLegendeTexte(''); }

async function handleScanBarcode() {
  if (!cameraPermission?.granted) {
    const result = await requestCameraPermission();
    if (!result.granted) {
      Alert.alert('Permission refusée', 'La caméra est nécessaire pour scanner les codes-barres.');
      return;
    }
  }
  setScanVisible(true);
}

async function onBarcodeScanned(result) {
  if (scanChargement || !result?.data) return;
  const code = result.data;
  if (!code) return;
  setScanChargement(true);
  setScanVisible(false);
  try {
    const produit = await rechercherProduitParCodeBarre(code);
    if (produit.nouveau) {
      setNouveauMaterielNom(code);
      setNouveauMaterielRef('');
      Alert.alert('📷 Nouveau code', `Code: ${code}\n\nProduit non trouvé sur Rexel.\nRemplis le nom et la référence manuellement.`);
    } else {
      setNouveauMaterielNom(produit.nom || '');
      setNouveauMaterielRef(produit.reference || '');
      Alert.alert('✅ Produit trouvé', `${produit.nom}\nRéf: ${produit.reference || '-'}\n\nVérifie et ajuste la quantité.`);
    }
  } catch (e) {
    Alert.alert('Erreur', `Produit non trouvé: ${e.message}`);
  } finally {
    setScanChargement(false);
  }
}

  if (chargement) return (<View style={styles.centre}><ActivityIndicator size="large" color={COLORS.gold} /><Text style={styles.loading}>Chargement...</Text></View>);
  if (erreur) return (<View style={styles.centre}><Text style={styles.errorMsg}>{erreur}</Text><TouchableOpacity style={styles.retryBtn} onPress={chargerDonnees}><Text style={styles.retryText}>Réessayer</Text></TouchableOpacity></View>);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Localisation</Text>
        {modeEdition ? (
          <TextInput style={styles.input} value={localisation} onChangeText={setLocalisation} multiline placeholder="Localisation du chantier" placeholderTextColor={COLORS.textDim} />
        ) : (
          <View style={styles.card}><Text style={styles.cardText}>{localisation}</Text></View>
        )}

        <Text style={styles.sectionTitle}>Tâches ({taches.length})</Text>
        {taches.map((t, i) => (
          <View key={t.id || i} style={styles.itemRow}>
            <TouchableOpacity style={[styles.checkbox, t.statut === 'terminé' && styles.checkboxChecked]} onPress={() => handleToggleTache(t.id)}>
              {t.statut === 'terminé' && <Text style={styles.checkMark}>✓</Text>}
            </TouchableOpacity>
            <Text style={[styles.itemText, t.statut === 'terminé' && styles.itemTextDone]}>{t.description}</Text>
            {modeEdition && (
              <TouchableOpacity style={styles.itemDel} onPress={() => handleSupprimerTache(i)}>
                <Text style={styles.itemDelText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        {modeEdition && (
          <View style={styles.addRow}>
            <TextInput style={styles.addInput} placeholder="Nouvelle tâche..." placeholderTextColor={COLORS.textDim} value={nouvelleTache} onChangeText={setNouvelleTache} onSubmitEditing={handleAjouterTache} />
            <TouchableOpacity style={styles.addBtn} onPress={handleAjouterTache}><Text style={styles.addBtnText}>+</Text></TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>Matériels ({materiels.length})</Text>
        {materiels.map((m, i) => (
          <View key={m.id || i} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{m.nom}</Text>
              <Text style={styles.itemDetail}>Qté : {m.quantite}{m.reference ? `  •  Réf : ${m.reference}` : ''}</Text>
            </View>
            {modeEdition && (
              <TouchableOpacity style={styles.itemDel} onPress={() => handleSupprimerMateriel(i)}>
                <Text style={styles.itemDelText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        {modeEdition && (
          <View style={styles.matForm}>
            <View style={styles.matRow}>
              <TextInput style={[styles.inputSmall, { flex: 1, marginRight: SPACING.sm }]} placeholder="Nom" placeholderTextColor={COLORS.textDim} value={nouveauMaterielNom} onChangeText={setNouveauMaterielNom} />
              <TouchableOpacity style={styles.scanBtn} onPress={handleScanBarcode} disabled={scanChargement}>
                {scanChargement ? <ActivityIndicator size="small" color={COLORS.black} /> : <Text style={styles.scanBtnText}>📷</Text>}
              </TouchableOpacity>
            </View>
            <View style={styles.matRow}>
              <TextInput style={[styles.inputSmall, { flex: 0.8, marginRight: SPACING.sm }]} placeholder="Qté" placeholderTextColor={COLORS.textDim} keyboardType="numeric" value={nouveauMaterielQte} onChangeText={setNouveauMaterielQte} />
              <TextInput style={[styles.inputSmall, { flex: 1.5, marginRight: SPACING.sm }]} placeholder="Réf." placeholderTextColor={COLORS.textDim} value={nouveauMaterielRef} onChangeText={setNouveauMaterielRef} />
              <TouchableOpacity style={styles.addBtn} onPress={handleAjouterMateriel}><Text style={styles.addBtnText}>+</Text></TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Photos ({photos.length})</Text>
        {photos.map((p, i) => (
          <View key={p.id || i} style={styles.photoItem}>
            <Image source={{ uri: `${BASE_URL}/uploads/${p.filename}`, headers: { 'x-api-key': API_KEY } }} style={styles.photoImg} />
            <TouchableOpacity style={styles.photoDel} onPress={() => supprimerPhoto(p.id)}>
              <Text style={styles.photoDelText}>✕</Text>
            </TouchableOpacity>
            {legendeEdition === p.id ? (
              <View style={styles.legendeEdit}>
                <TextInput style={styles.legendeInput} value={legendeTexte} onChangeText={setLegendeTexte} placeholder="Légende..." placeholderTextColor={COLORS.textDim} multiline />
                <View style={styles.legendeBtns}>
                  <TouchableOpacity style={styles.legendeBtnOk} onPress={() => sauvegarderLegende(p.id)}><Text style={styles.legendeBtnText}>✓</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.legendeBtnKo} onPress={annulerEditionLegende}><Text style={styles.legendeBtnText}>✕</Text></TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity onPress={() => commencerEditionLegende(p)}>
                <Text style={[styles.photoCap, !p.description && styles.photoCapEmpty]}>{p.description || 'Ajouter une légende...'}</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        <TouchableOpacity style={[styles.addPhotoBtn, photoEnUpload && styles.btnDisabled]} onPress={ajouterPhoto} disabled={photoEnUpload}>
          <Text style={styles.addPhotoText}>{photoEnUpload ? 'Upload...' : '📷 Ajouter une photo'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {modeEdition ? (
        <View style={styles.footer}>
          <TouchableOpacity style={[styles.btnPrimary, enregistrement && styles.btnDisabled]} onPress={handleEnregistrer} disabled={enregistrement}>
            <Text style={styles.btnPrimaryText}>{enregistrement ? 'Enregistrement...' : 'Enregistrer les modifications'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btnDanger, suppression && styles.btnDisabled]} onPress={() => setConfirmVisible(true)} disabled={suppression}>
            <Text style={styles.btnDangerText}>{suppression ? 'Suppression...' : 'Supprimer le chantier'}</Text>
          </TouchableOpacity>
        </View>
      ) : chantier && chantier.statut === 'en cours' ? (
        <View style={styles.footer}>
          <TouchableOpacity style={[styles.btnSuccess, terminaisonChargement && styles.btnDisabled]} onPress={() => setConfirmTerminerVisible(true)} disabled={terminaisonChargement}>
            <Text style={styles.btnSuccessText}>{terminaisonChargement ? '...' : 'Terminer le chantier'}</Text>
          </TouchableOpacity>
        </View>
      ) : chantier && chantier.statut === 'terminé' ? (
        <View style={styles.footer}>
          {!rapportEnvoye ? (
            <TouchableOpacity style={[styles.btnPrimary, envoiChargement && styles.btnDisabled]} onPress={handleEnvoyerRapport} disabled={envoiChargement}>
              <Text style={styles.btnPrimaryText}>{envoiChargement ? 'Envoi...' : '📧 Envoyer le rapport'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.successBox}>
              <Text style={styles.successText}>✓ Rapport envoyé !</Text>
              {accuse && (accuse.confirme
                ? <Text style={[styles.successText, { fontSize: 13, marginTop: 4 }]}>✅ Confirmé le {new Date(accuse.confirme_le).toLocaleDateString('fr-FR')}</Text>
                : <Text style={[styles.infoText, { fontSize: 13, marginTop: 4 }]}>⏳ En attente de confirmation</Text>
              )}
            </View>
          )}
        </View>
      ) : null}

      <ConfirmationModal visible={confirmVisible} icone="⚠️" titre="Supprimer le chantier" message="Cette action est irréversible." texteConfirmer="Supprimer" couleurConfirmer={COLORS.red} onConfirm={handleSupprimer} onAnnuler={() => setConfirmVisible(false)} enCours={suppression} />
      <ConfirmationModal visible={confirmTerminerVisible} icone="✅" titre="Terminer le chantier" message="Une fois terminé, tu pourras envoyer le rapport." texteConfirmer="Terminer" couleurConfirmer={COLORS.green} onConfirm={handleTerminer} onAnnuler={() => setConfirmTerminerVisible(false)} enCours={terminaisonChargement} />
      <SuccesModal visible={succesVisible} message={messageSucces} onPress={() => { setSuccesVisible(false); if (suppressionReussie) { navigation.reset({ index: 2, routes: [{ name: 'Accueil' }, { name: 'Chantier' }, { name: 'ListeChantiers' }] }); } else { chargerDonnees(); setModeEdition(false); } }} />

      <Modal visible={scanVisible} animationType="slide" onRequestClose={() => setScanVisible(false)}>
        <View style={styles.scanContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e', 'qr'] }}
            onBarcodeScanned={onBarcodeScanned}
          />
          <View style={styles.scanOverlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.scanHint}>Place le code-barres dans le cadre</Text>
          </View>
          <TouchableOpacity style={styles.scanClose} onPress={() => setScanVisible(false)}>
            <Text style={styles.scanCloseText}>✕ Annuler</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.black },
  scroll: { flex: 1, paddingHorizontal: SPACING.xl },
  scrollContent: { paddingTop: SPACING.xl, paddingBottom: SPACING.xl },
  centre: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.black },
  loading: { color: COLORS.gold, marginTop: SPACING.md, fontSize: 16 },
  errorMsg: { color: COLORS.red, fontSize: 16, textAlign: 'center', marginBottom: SPACING.xl },
  retryBtn: { backgroundColor: COLORS.gold, paddingVertical: 12, paddingHorizontal: 30, borderRadius: RADIUS.full },
  retryText: { color: COLORS.black, fontSize: 16, fontWeight: '700' },
  sectionTitle: { color: COLORS.gold, fontSize: 17, fontWeight: '700', marginTop: SPACING.xxl, marginBottom: SPACING.md, letterSpacing: 0.5 },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.cardBorder },
  cardText: { color: COLORS.text, fontSize: 15 },
  input: { backgroundColor: COLORS.input, color: COLORS.text, fontSize: 15, borderRadius: RADIUS.md, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.gold + '60', minHeight: 60 },
  inputSmall: { backgroundColor: COLORS.input, color: COLORS.text, fontSize: 14, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.cardBorder, marginBottom: SPACING.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.cardBorder },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: COLORS.gold, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  checkboxChecked: { backgroundColor: COLORS.gold },
  checkMark: { color: COLORS.black, fontSize: 14, fontWeight: '800' },
  itemText: { flex: 1, color: COLORS.text, fontSize: 15 },
  itemTextDone: { textDecorationLine: 'line-through', color: COLORS.textDim },
  itemDel: { backgroundColor: COLORS.red + '30', width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginLeft: SPACING.sm },
  itemDelText: { color: COLORS.red, fontSize: 12, fontWeight: '700' },
  itemName: { color: COLORS.gold, fontSize: 15, fontWeight: '600' },
  itemDetail: { color: COLORS.textMuted, fontSize: 12, marginTop: 3 },
  addRow: { flexDirection: 'row', marginBottom: SPACING.sm },
  addInput: { flex: 1, backgroundColor: COLORS.input, color: COLORS.text, fontSize: 14, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.gold + '60', marginRight: SPACING.sm },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.gold, justifyContent: 'center', alignItems: 'center' },
  addBtnText: { color: COLORS.black, fontSize: 22, fontWeight: '600', lineHeight: 24 },
  matForm: { marginBottom: SPACING.md },
  matRow: { flexDirection: 'row', alignItems: 'center' },
  photoItem: { marginBottom: SPACING.md, position: 'relative' },
  photoImg: { width: '100%', height: 200, borderRadius: RADIUS.md, backgroundColor: COLORS.input },
  photoDel: { position: 'absolute', top: 8, right: 8, backgroundColor: COLORS.red, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  photoDelText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  photoCap: { color: COLORS.textMuted, fontSize: 13, marginTop: SPACING.sm, fontStyle: 'italic' },
  photoCapEmpty: { color: COLORS.textDim },
  legendeEdit: { marginTop: SPACING.sm },
  legendeInput: { backgroundColor: COLORS.input, color: COLORS.text, fontSize: 14, borderRadius: RADIUS.sm, padding: SPACING.sm, borderWidth: 1, borderColor: COLORS.gold + '60', minHeight: 40 },
  legendeBtns: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: SPACING.xs, gap: SPACING.sm },
  legendeBtnOk: { backgroundColor: COLORS.green, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  legendeBtnKo: { backgroundColor: COLORS.red, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  legendeBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  addPhotoBtn: { borderWidth: 2, borderColor: COLORS.gold + '40', borderStyle: 'dashed', borderRadius: RADIUS.md, paddingVertical: SPACING.lg, alignItems: 'center', marginBottom: SPACING.xl },
  addPhotoText: { color: COLORS.gold, fontSize: 15, fontWeight: '600' },
  footer: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.cardBorder },
  btnPrimary: { backgroundColor: COLORS.gold, paddingVertical: 14, borderRadius: RADIUS.full, minWidth: 250, alignItems: 'center', marginBottom: SPACING.sm, ...SHADOWS.gold },
  btnPrimaryText: { color: COLORS.black, fontSize: 16, fontWeight: '700' },
  btnDanger: { backgroundColor: COLORS.red, paddingVertical: 14, borderRadius: RADIUS.full, minWidth: 250, alignItems: 'center', marginBottom: SPACING.sm },
  btnDangerText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  btnSuccess: { backgroundColor: COLORS.green, paddingVertical: 14, borderRadius: RADIUS.full, minWidth: 250, alignItems: 'center' },
  btnSuccessText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  successBox: { backgroundColor: COLORS.greenBg, paddingVertical: 12, paddingHorizontal: 25, borderRadius: RADIUS.md, marginBottom: SPACING.sm, alignItems: 'center' },
  successText: { color: COLORS.green, fontSize: 15, fontWeight: '700' },
  infoText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
  scanBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.gold, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm },
  scanBtnText: { color: COLORS.black, fontSize: 18, lineHeight: 20 },
  scanContainer: { flex: 1, backgroundColor: '#000' },
  scanOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 250, height: 150, borderWidth: 2, borderColor: COLORS.gold, borderRadius: RADIUS.md, backgroundColor: 'transparent' },
  scanHint: { color: COLORS.gold, fontSize: 14, fontWeight: '600', marginTop: 20, textAlign: 'center' },
  scanClose: { position: 'absolute', bottom: 50, alignSelf: 'center', backgroundColor: COLORS.red, paddingVertical: 12, paddingHorizontal: 30, borderRadius: RADIUS.full },
  scanCloseText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});