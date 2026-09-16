import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { analyserIntervention } from '../services/analyseIntervention';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';

export default function NouvelleInterventionScreen({ navigation }) {
  const [texteIntervention, setTexteIntervention] = useState('');
  const [photos, setPhotos] = useState([]);

  async function choisirPhoto(mode) {
    const permCamera = await ImagePicker.requestCameraPermissionsAsync();
    const permGal = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (mode === 'camera') {
      if (!permCamera.granted) {
        Alert.alert('Permission refusée', 'Autorise l\'accès à l\'appareil photo.');
        return;
      }
      const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
      if (!r.canceled) setPhotos([...photos, { uri: r.assets[0].uri, description: '' }]);
    } else {
      if (!permGal.granted) {
        Alert.alert('Permission refusée', 'Autorise l\'accès à la galerie.');
        return;
      }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsMultipleSelection: true });
      if (!r.canceled) {
        const n = r.assets.map(a => ({ uri: a.uri, description: '' }));
        setPhotos([...photos, ...n]);
      }
    }
  }

  function ajouterPhoto() {
    Alert.alert('Ajouter une photo', 'Choisis la source :', [
      { text: 'Appareil photo', onPress: () => choisirPhoto('camera') },
      { text: 'Galerie', onPress: () => choisirPhoto('galerie') },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  function modifierDescription(index, texte) {
    const m = [...photos];
    m[index].description = texte;
    setPhotos(m);
  }

  function supprimerPhoto(index) {
    setPhotos(photos.filter((_, i) => i !== index));
  }

  function handleAnalyser() {
    if (texteIntervention.trim() === '') return;
    const fiche = analyserIntervention(texteIntervention);
    navigation.navigate('FicheIntervention', { fiche, photosLocale: photos, nonSauvegarde: true });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <StatusBar style="light" />
      <Text style={styles.title}>Nouvelle intervention</Text>
      <Text style={styles.desc}>Décrivez l'intervention à effectuer</Text>

      <TextInput
        style={styles.input}
        placeholder="Ex: Remplacement prises étage 3 bâtiment A entrée B"
        placeholderTextColor={COLORS.textDim}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
        value={texteIntervention}
        onChangeText={setTexteIntervention}
      />

      <TouchableOpacity style={styles.photoBtn} onPress={ajouterPhoto} activeOpacity={0.7}>
        <Text style={styles.photoIcon}>📷</Text>
        <Text style={styles.photoText}>Ajouter une photo</Text>
      </TouchableOpacity>

      {photos.length > 0 && (
        <View style={styles.photosWrap}>
          {photos.map((p, i) => (
            <View key={i} style={styles.photoItem}>
              <Image source={{ uri: p.uri }} style={styles.photoImg} />
              <TouchableOpacity style={styles.photoDel} onPress={() => supprimerPhoto(i)}>
                <Text style={styles.photoDelText}>✕</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.photoCap}
                placeholder="Légende..."
                placeholderTextColor={COLORS.textDim}
                value={p.description}
                onChangeText={(t) => modifierDescription(i, t)}
              />
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={handleAnalyser} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Analyser</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.black },
  content: { alignItems: 'center', paddingTop: 30, paddingBottom: 50, paddingHorizontal: SPACING.xl },
  title: { color: COLORS.text, fontSize: 26, fontWeight: '900', fontFamily: 'ArchivoBlack_400Regular', marginBottom: SPACING.xs },
  desc: { color: COLORS.textMuted, fontSize: 14, marginBottom: SPACING.xxl },
  input: {
    width: '100%', minHeight: 140, backgroundColor: COLORS.input, color: COLORS.text,
    fontSize: 15, borderRadius: RADIUS.md, padding: SPACING.lg, borderWidth: 1,
    borderColor: COLORS.cardBorder, marginBottom: SPACING.lg,
  },
  photoBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.gold + '40', borderStyle: 'dashed',
    borderRadius: RADIUS.md, paddingVertical: SPACING.lg, marginBottom: SPACING.lg,
  },
  photoIcon: { fontSize: 20, marginRight: SPACING.sm },
  photoText: { color: COLORS.gold, fontSize: 15, fontWeight: '600' },
  photosWrap: { width: '100%', marginBottom: SPACING.lg },
  photoItem: { marginBottom: SPACING.md, position: 'relative' },
  photoImg: { width: '100%', height: 180, borderRadius: RADIUS.md, backgroundColor: COLORS.input },
  photoDel: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: COLORS.red, width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  photoDelText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  photoCap: {
    width: '100%', backgroundColor: COLORS.input, color: COLORS.text, fontSize: 14,
    borderRadius: RADIUS.sm, padding: SPACING.sm, marginTop: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  button: {
    backgroundColor: COLORS.gold, paddingVertical: 15, paddingHorizontal: 50,
    borderRadius: RADIUS.full, ...SHADOWS.gold,
  },
  buttonText: { color: COLORS.black, fontSize: 17, fontWeight: '700' },
});