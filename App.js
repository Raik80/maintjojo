// Importation du NavigationContainer depuis React Navigation pour envelopper la navigation
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// Importation de l'écran d'accueil
import AccueilScreen from './screens/AccueilScreen';
// Importation de l'écran Nouvelle Intervention
import NouvelleInterventionScreen from './screens/NouvelleInterventionScreen';
// Importation de l'écran Fiche Intervention
import FicheInterventionScreen from './screens/FicheInterventionScreen';
// Importation de l'écran Liste des Interventions
import ListeInterventionsScreen from './screens/ListeInterventionsScreen';
// Importation de l'écran Modifier Intervention
import ModifierInterventionScreen from './screens/ModifierInterventionScreen';
// Importation de l'écran Chantier
import ChantierScreen from './screens/ChantierScreen';
// Importation de l'écran de sélection du bâtiment pour les plans interactifs
import BuildingSelectScreen from './screens/BuildingSelectScreen';
// Importation de l'écran Liste des Chantiers
import ListeChantiersScreen from './screens/ListeChantiersScreen';
// Importation de l'écran Détail d'un chantier
import DetailChantierScreen from './screens/DetailChantierScreen';
// Importation des écrans du wizard de création de chantier
import NouveauChantierLocalisationScreen from './screens/NouveauChantierLocalisationScreen';
import NouveauChantierTachesScreen from './screens/NouveauChantierTachesScreen';
import NouveauChantierMaterielScreen from './screens/NouveauChantierMaterielScreen';
import RecapChantierScreen from './screens/RecapChantierScreen';
// Importation des écrans de plans interactifs (WebView chargeant des HTML auto-suffisants depuis le serveur)
import PlanSelectScreen from './screens/PlanSelectScreen';
import PlanViewerScreen from './screens/PlanViewerScreen';

const Stack = createNativeStackNavigator();

// Composant principal de l'application (navigateur)
export default function App() {
  return (
    <NavigationContainer>
      {/* Stack.Navigator contient la liste des écrans et la configuration globale */}
      <Stack.Navigator
        initialRouteName="Accueil" // Écran affiché au démarrage
        screenOptions={{
          headerStyle: { backgroundColor: '#000000' }, // Fond noir de la barre d'en-tête
          headerTintColor: '#FFD700', // Couleur or pour le texte et les boutons de l'en-tête
          headerTitleStyle: { fontWeight: 'bold' }, // Titre en gras
        }}
      >
        {/* Écran d'accueil avec le header caché (titre personnalisé déjà affiché dans le contenu) */}
        <Stack.Screen
          name="Accueil"
          component={AccueilScreen}
          options={{ headerShown: false }}
        />
        {/* Écran Nouvelle Intervention */}
        <Stack.Screen
          name="NouvelleIntervention"
          component={NouvelleInterventionScreen}
          options={{ title: 'Nouvelle intervention' }}
        />
        {/* Écran Fiche Intervention qui affiche les données extraites après analyse */}
        <Stack.Screen
          name="FicheIntervention"
          component={FicheInterventionScreen}
          options={{ title: 'Fiche d\'intervention' }}
        />
        {/* Écran Liste des Interventions enregistrées */}
        <Stack.Screen
          name="ListeInterventions"
          component={ListeInterventionsScreen}
          options={{ title: 'Mes interventions' }}
        />
        {/* Écran Détail d'une intervention (réutilise le même composant que la fiche) */}
        <Stack.Screen
          name="DetailIntervention"
          component={FicheInterventionScreen}
          options={{ title: 'Détail de l\'intervention' }}
        />
        {/* Écran de modification d'une intervention existante */}
        <Stack.Screen
          name="ModifierIntervention"
          component={ModifierInterventionScreen}
          options={{ title: 'Modifier l\'intervention' }}
        />
        {/* Écran Chantier avec les options création et liste */}
        <Stack.Screen
          name="Chantier"
          component={ChantierScreen}
          options={{ title: 'Chantier' }}
        />
        {/* Écran Liste des Chantiers enregistrés */}
        <Stack.Screen
          name="ListeChantiers"
          component={ListeChantiersScreen}
          options={{ title: 'Mes chantiers' }}
        />
        {/* Écran Détail d'un chantier avec modification, tâches, et suppression */}
        <Stack.Screen
          name="DetailChantier"
          component={DetailChantierScreen}
          options={{ title: 'Détail du chantier' }}
        />
        {/* Écran de saisie de la localisation du chantier (étape 1/4) */}
        <Stack.Screen
          name="NouveauChantierLocalisation"
          component={NouveauChantierLocalisationScreen}
          options={{ title: 'Localisation' }}
        />
        {/* Écran d'ajout des tâches au chantier (étape 2/4) */}
        <Stack.Screen
          name="NouveauChantierTaches"
          component={NouveauChantierTachesScreen}
          options={{ title: 'Tâches' }}
        />
        {/* Écran d'ajout du matériel au chantier (étape 3/4) */}
        <Stack.Screen
          name="NouveauChantierMateriel"
          component={NouveauChantierMaterielScreen}
          options={{ title: 'Matériel' }}
        />
        {/* Écran récapitulatif avant enregistrement du chantier (étape 4/4) */}
        <Stack.Screen
          name="RecapChantier"
          component={RecapChantierScreen}
          options={{ title: 'Récapitulatif' }}
        />
        {/* Plans interactifs — sélection du bâtiment puis de l'étage puis WebView */}
        <Stack.Screen
          name="BuildingSelect"
          component={BuildingSelectScreen}
          options={{ title: 'Plans interactifs' }}
        />
        <Stack.Screen
          name="PlanSelect"
          component={PlanSelectScreen}
          options={({ route }) => ({ title: route.params?.buildingName || 'Plans interactifs' })}
        />
        <Stack.Screen
          name="PlanViewer"
          component={PlanViewerScreen}
          options={({ route }) => ({ title: route.params?.label || 'Plan' })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
