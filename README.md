# MaintJojo

Application mobile pour électriciens — saisie rapide d'interventions par texte libre avec analyse automatique.

---

## Structure du projet

```
Maintjojo/
├── App.js                        # Navigation principale (tous les écrans)
├── app.json                      # Configuration Expo
├── demarrage.txt                 # Commandes pour lancer l'app
├── README.md                     # Ce fichier
│
├── screens/
│   ├── AccueilScreen.js                    # Écran d'accueil (néon animé, 3 boutons)
│   ├── NouvelleInterventionScreen.js       # Saisie de texte libre + photos
│   ├── FicheInterventionScreen.js          # Aperçu + détail + photos + terminer + envoyer rapport
│   ├── ListeInterventionsScreen.js         # Liste des interventions enregistrées
│   ├── ModifierInterventionScreen.js       # Modification d'une intervention existante
│   ├── ChantierScreen.js                   # Menu chantier (créer / liste)
│   ├── NouveauChantierLocalisationScreen.js # Wizard étape 1 : localisation
│   ├── NouveauChantierTachesScreen.js       # Wizard étape 2 : tâches
│   ├── NouveauChantierMaterielScreen.js     # Wizard étape 3 : matériel
│   ├── RecapChantierScreen.js              # Wizard étape 4 : récapitulatif + SuccesModal
│   ├── ListeChantiersScreen.js             # Liste des chantiers enregistrés
│   └── DetailChantierScreen.js             # Détail + édition + checkboxes tâches + photos + modales animées
│
├── components/
│   ├── ConfirmationModal.js      # Pop-up de confirmation générique (icone, titre, message, couleur)
│   └── SuccesModal.js            # Pop-up de succès animée (✅, titre vert, bouton OK doré)
│
├── services/
│   ├── api.js                    # Appels vers le serveur (CRUD + photos + envoi rapport + chantiers + photos chantier)
│   └── analyseIntervention.js    # Analyse du texte (mots-clés, regex)
│
├── serveur/
│   ├── index.js                  # Serveur Express (points d'entrée API)
│   ├── database.js               # Base SQLite (création tables, requêtes)
│   ├── config.js                 # Port (3000), chemin DB et uploads
│   ├── test-email.js             # Script de test (PDF + SMTP)
│   ├── services/
│   │   └── emailService.js       # Génération PDF + envoi par mail SMTP
│   ├── .env                      # Configuration SMTP (identifiants UL)
│   └── uploads/                  # Photos uploadées (généré automatiquement)
│
├── assets/                       # Polices, icônes
└── node_modules/                 # Dépendances (ne pas toucher)
```

---

## Comment lancer l'app

### 1. Démarrer le serveur (**Terminal 1**)
```bash
cd ~/Bureau/Maintjojo/serveur
node index.js
```
Tu dois voir :
```
Serveur MaintJojo démarré sur http://localhost:3000
Uploads servis sur http://localhost:3000/uploads
```

### 2. Démarrer le tunnel Tailscale Funnel

Tailscale Funnel expose le serveur sur Internet avec une **URL fixe** (sans pub) :

```bash
tailscale funnel --bg 3000
```

L'URL est : `https://maintjojo-serveur.tailce5b78.ts.net`

Si tu utilises `start.sh`, tout est lancé automatiquement (serveur + tunnel + Expo).
La `BASE_URL` dans `services/api.js` est déjà configurée avec l'URL Tailscale.

### 4. Lancer Expo (**Terminal 3**)
```bash
cd ~/Bureau/Maintjojo
npx expo start
```
→ Un QR code apparaît. Scanne-le avec l'app **Expo Go** sur ton téléphone.

---

## Fonctionnement

### Écran d'accueil
- **Animation néon** : barre horizontale lumineuse (180×14px) au-dessus du titre "MaintJojo"
  - **Vieillissement** : couleur qui évolue en continu du blanc (`#FFFFFF`) vers l'or (`#FFD700`) sur 30 secondes
  - **Scintillement** : effet aléatoire de flicker (opacité 0.1 → 1.0) toutes les 2 à 5 secondes
  - Lueur via `shadowColor: '#FFFDE7'`, `shadowOpacity: 0.8`, `shadowRadius: 15`
- 3 boutons : **"Nouvelle intervention"** (doré rempli), **"Mes interventions"** (bordure dorée), **"Chantier"** (doré rempli)

### Ajouter une intervention
1. Écran d'accueil → "Nouvelle intervention"
2. Tu tapes un texte libre, par exemple :
   ```
   Disjonction prise au batiment A entrée 2A au 3eme etage
   ```
3. Tu peux ajouter des photos :
   - **Appareil photo** : prise de vue directe
   - **Galerie** : sélection multiple possible
   - **Légende** : champ texte sous chaque photo
   - **Supprimer** : bouton ✕ sur chaque photo
4. Appuie sur **"Analyser"** → l'app extrait automatiquement :
   - **Type** → "Disjonction prises"
   - **Bâtiment** → "Bâtiment A"
   - **Entrée** → "2A"
   - **Étage** → "3"
5. Tu vois un **aperçu** complet (infos + photos) → bouton **"Sauvegarder"**
6. Pendant la sauvegarde : les photos sont uploadées une par une, bannière de chargement
7. Succès : bannière verte "✓ Intervention sauvegardée !" → redirection vers la liste

### Consulter la liste des interventions
Écran d'accueil → "Mes interventions".
- **3 états d'affichage** :
  - **Chargement** : spinner doré + "Chargement..."
  - **Erreur** : message rouge + bouton "Réessayer"
  - **Vide** : "Aucune intervention enregistrée" en gris
- Chaque carte affiche : **Type** (or, gras), **Date** (format JJ/MM/AAAA HH:mm), **Bâtiment**, **Étage**, **Entrée** (si renseignée), **Statut** (🟢 Terminé / 🟡 En cours)
- **Auto-rechargement** : la liste se rafraîchit automatiquement à chaque retour sur l'écran

### Voir le détail d'une intervention
Tape sur une intervention dans la liste → écran **FicheIntervention** (mode détail).
- Affichage complet : type, bâtiment, étage, entrée, description, photos, statut, résolution
- **Bannières de retour** : succès (verte) ou erreur (rouge) pour chaque action
- **Clavier adaptatif** : `KeyboardAvoidingView` pour ne pas masquer les champs

### Ajouter des photos après coup (interventions)
Depuis le détail d'une intervention → **"📷 Ajouter une photo"** → appareil photo ou galerie.
Upload direct vers le serveur, la photo apparaît immédiatement. ✕ pour supprimer.

### Ajouter des photos après coup (chantiers)
Depuis le détail d'un chantier → **"📷 Ajouter une photo"** → appareil photo ou galerie.
Les photos s'affichent avec leur légende. Tape sur la légende pour la modifier. ✕ pour supprimer.

### Terminer une intervention
Depuis le détail → **"Terminer l'intervention"** (bouton vert) :
1. Un champ de saisie apparaît : "Décris ce que tu as fait pour résoudre le problème"
2. Saisis la résolution → **"Valider"** (vert) ou **"Annuler"** (gris)
3. Le statut passe à **"✅ Terminé"** et la résolution s'affiche sur la fiche

### Envoyer le rapport par mail
Depuis le détail d'une intervention **terminée** → bouton **📧 Envoyer le rapport** (bleu `#1565C0`).
- Le serveur génère un **PDF** avec toutes les infos + photos + résolution
- Le PDF est envoyé par mail au responsable (SMTP Université de Lorraine)
- Succès : bannière verte "✓ Rapport envoyé par mail !"
- Erreur : bannière rouge avec le message d'erreur

### Modifier une intervention
Depuis le détail → **"Modifier"** (bouton bordure dorée) :
1. Le texte de description est pré-rempli et modifiable
2. Appuie sur **"Ré-analyser"** → les champs (type, bâtiment, étage, entrée) sont mis à jour en direct
3. Appuie sur **"Enregistrer les modifications"** pour sauvegarder
4. Pendant l'enregistrement : le bouton affiche "Enregistrement..." et se désactive

### Supprimer une intervention
Depuis le détail → **"Supprimer"** (bouton rouge) :
1. Une **modal de confirmation animée (⚠️)** apparaît (fondu + zoom)
2. Le bouton de confirmation se désactive et affiche "Supprimer..." pendant l'opération
3. Confirmation → l'intervention et ses photos (fichiers + base) sont supprimées
4. Redirection vers la liste des interventions

---

## Gestion des chantiers

### Créer un chantier (wizard en 4 étapes)
1. Écran d'accueil → "Chantier" → "Créer un nouveau chantier"
2. **Étape 1** : Saisis la localisation du chantier (texte libre)
3. **Étape 2** : Ajoute des tâches à réaliser (champ + bouton "Ajouter", ✕ pour supprimer)
4. **Étape 3** : Ajoute du matériel nécessaire (nom, quantité, référence)
5. **Étape 4** : Récapitulatif complet → "Enregistrer"
6. Une modal de succès animée (✅) s'affiche → tu retournes à l'accueil

### Consulter la liste des chantiers
Écran d'accueil → "Chantier" → "Liste des chantiers".
- **3 états d'affichage** (identique aux interventions) :
  - **Chargement** : spinner doré + "Chargement..."
  - **Erreur** : message rouge + bouton "Réessayer"
  - **Vide** : "Aucun chantier enregistré" en gris
- Chaque carte affiche : **Localisation** (or, gras), **Date** (JJ/MM/AAAA HH:mm), **Nombre de tâches** (avec icône), **Nombre de matériels** (avec icône), **Statut** (🟢 Terminé / 🟡 En cours)
- **Auto-rechargement** au focus

### Voir le détail d'un chantier
Tape sur un chantier dans la liste → tu vois toutes les informations :
- **📍 Localisation** en lecture seule
- **📋 Tâches** avec checkbox (cocher = marquer comme terminée, texte barré)
- **🔧 Matériels** avec quantité et référence
- **📷 Photos** du chantier avec légendes modifiables

### Modifier un chantier
Depuis le détail → tape sur l'icône **✏️** en haut à droite pour passer en mode édition :
- La localisation devient modifiable
- Les tâches peuvent être supprimées (✕) et ajoutées (+)
- Les matériels peuvent être supprimés (✕) et ajoutés (nom, quantité, référence)
- Appuie sur **"Enregistrer les modifications"** pour sauvegarder
- Une modal de succès animée (✅) confirme la mise à jour
- Appuie sur l'icône **✔** pour revenir en mode visualisation

### Supprimer un chantier
Depuis le détail en mode édition → **"Supprimer le chantier"** :
1. Une modal de confirmation (⚠️) en rouge apparaît (texte personnalisable)
2. Confirme → suppression → une modal de succès (✅) s'affiche
3. Navigation revient proprement à la liste (pas de retour sur un chantier supprimé)

### Gérer les photos d'un chantier
Depuis le détail du chantier (visible dans les deux modes) :
- **📷 Ajouter une photo** → bouton en pointillés dorés
  - Choix : **Appareil photo** ou **Galerie**
  - Upload immédiat, la photo apparaît directement
- **Éditer la légende** → tape sur le texte sous la photo
  - Saisis ta légende → valide avec **✓** (vert) ou annule avec **✕** (rouge)
  - La légende est sauvegardée automatiquement via l'API
- **Supprimer une photo** → tape sur **✕** (cercle rouge en haut à droite)
  - Suppression immédiate de l'affichage et du fichier sur le serveur
- Les photos sont conservées tant que le chantier existe
  - Si le chantier est supprimé, toutes ses photos sont supprimées (fichiers + base)

---

## Modales animées

Deux composants réutilisables avec animations fluides (fondu + zoom) :

| Composant | Usage | Icône | Titre | Boutons |
|-----------|-------|-------|-------|---------|
| `SuccesModal` | Confirmation de réussite (création, modification, suppression) | ✅ | "Succès" (vert) | OK (doré) |
| `ConfirmationModal` | Demande de confirmation avant action destructive | Personnalisable (⚠️ par défaut) | Personnalisable (or) | Annuler + Confirmer (couleur personnalisable) |

**Props de `ConfirmationModal` :**
- `icone` — texte de l'icône (défaut: `⚠️`)
- `titre` — titre de la modal (défaut: "Confirmer la suppression")
- `message` — message de confirmation (défaut: "Voulez-vous vraiment supprimer cette intervention ?")
- `texteConfirmer` — texte du bouton de confirmation (défaut: "Supprimer")
- `couleurConfirmer` — couleur du bouton de confirmation (défaut: `#B71C1C` rouge)

---

## Navigation flows

Enchaînement des écrans dans l'application :

```
Accueil
├── "Nouvelle intervention"
│   └── NouvelleIntervention → "Analyser" → FicheIntervention (aperçu)
│       └── "Sauvegarder" → ListeInterventions
│
├── "Mes interventions"
│   └── ListeInterventions
│       └── Tape sur une carte → FicheIntervention (détail)
│           ├── "Terminer" → champ résolution → "Valider"
│           ├── "📧 Envoyer le rapport" → envoi par mail
│           ├── "Modifier" → ModifierIntervention → "Enregistrer" → ListeInterventions
│           └── "Supprimer" → ConfirmationModal → ListeInterventions
│
└── "Chantier"
    ├── "Créer un nouveau chantier"
    │   └── Localisation → Tâches → Matériel → Récapitulatif → "Enregistrer"
    │       └── SuccesModal → Accueil
    │
    └── "Liste des chantiers"
        └── ListeChantiers
            └── Tape sur une carte → DetailChantier
                ├── ✏️ mode édition → "Enregistrer" → SuccesModal → retour vue
                └── "Supprimer" → ConfirmationModal → SuccesModal → ListeChantiers
```

---

## Mots-clés reconnus (analyse de texte)

### Types d'intervention (par ordre de spécificité)
| Type | Mots-clés | Ordre |
|------|-----------|-------|
| Disjonction prises | `disjonction prise`, `disjonction prises` | 1 (le plus spécifique) |
| Disjonction éclairage | `disjonction éclairage`, `disjonction eclairage`, `disjonction lumière` | 2 |
| Disjonction | `disjonction`, `disjoncteur`, `disjoncte` | 3 (générique) |
| Prise RJ45 | `prise rj45`, `rj45`, `réseau`, `internet`, `ethernet` | 4 |
| Contrôle d'accès | `badge`, `portier`, `interphone`, `lecteur`, `uca`, `interface ip` | 5 |
| Lumière | `lampe`, `éclairage`, `néon`, `spots`, `downlight`, `ballast`, `radar`, `interrupteur`, `bouton poussoir` | 6 |
| Prises | `prise`, `prises` | 7 (fallback) |

Les types les plus spécifiques sont testés en premier pour éviter les faux positifs.

### Bâtiments (avec alias reconnus)
| Bâtiment | Alias reconnus | Entrées possibles |
|----------|----------------|-------------------|
| AIP | `aip` | - |
| Atela | `atela` | - |
| ESA | `esa` | - |
| SSE | `sse` | - |
| BU | `bu` | - |
| IECL | `iecl` | - |
| Cryogénie | `cryogénie`, `cryogenie` | - |
| 1 cycle | `1 cycle`, `1cycle`, `premier cycle` | - |
| Bâtiment A | `bâtiment a`, `batiment a`, `bât a`, `bat a` | 1A, 2A, 3A, 4A, 5A |
| Bâtiment B | `bâtiment b`, `batiment b`, `bât b`, `bat b` | 1B, 2B, 3B, 4B |
| Bâtiment C | `bâtiment c`, `batiment c`, `bât c`, `bat c` | - |

**Fallback générique** : si aucun bâtiment connu n'est trouvé, l'analyse cherche un motif `batiment X` ou `bat X` (X = lettre ou mot).

### Entrées par bâtiment
Les entrées sont extraites par motifs propres à chaque bâtiment :
- **Bâtiment A** : `1A`, `2A`, `3A`, `4A`, `5A` (ou `entrée 1A`, `porte 2A`, etc.)
- **Bâtiment B** : `1B`, `2B`, `3B`, `4B`
- **Bâtiment C** : aucune entrée définie
- **Fallback** : motif générique `entrée X` / `porte X`

### Étages (motifs reconnus)
- `étage X`, `etage X` (X = numéro, ex: `étage 3`)
- `niveau X` (ex: `niveau 2`)
- `N X`, `N3`, `N 5` (notation courte)
- `Xe étage`, `Xe etage` (ex: `3e étage`)
- `rdc` → RDC (rez-de-chaussée)
- `rez-de-chaussée`, `rez de chaussée` → RDC
- `sous-sol`, `sous sol` → Sous-sol

---

## Ajouter un nouveau type ou bâtiment

Dans `services/analyseIntervention.js` :

- **Nouveau type** → ajoute une entrée dans `TYPES_INTERVENTION` (toujours les plus spécifiques en premier, le générique en dernier)
- **Nouveau bâtiment** → ajoute une entrée dans `BATIMENTS` avec :
  - `noms` : tableau des alias reconnus (ex: `['bâtiment a', 'batiment a', 'bât a', 'bat a']`)
  - `affiche` : nom d'affichage (ex: `'Bâtiment A'`)
  - `entrees` : tableau des codes d'entrée possibles (ex: `['1A', '2A', '3A', '4A', '5A']`)
- **Nouvel étage** : pas de configuration nécessaire, les motifs regex gèrent automatiquement les numéros

---

## Charte graphique

| Élément | Valeur |
|---------|--------|
| Fond | Noir `#000000` |
| Accent principal | Or `#FFD700` |
| Cartes | Gris foncé `#1A1A2E`, bordure `#333355` |
| Texte principal | Blanc `#ffffff` |
| Texte secondaire | Gris `#cccccc` |
| Succès | Vert `#4CAF50` |
| Erreur / Suppression | Rouge `#B71C1C` |
| Police titre | `ArchivoBlack_400Regular` |
| Boutons | Forme pilule (`borderRadius: 25`), ombre dorée |
| Bannières succès | Fond vert `#1B5E20` avec texte blanc |
| Bannières erreur | Fond rouge `#B71C1C` avec texte blanc |
| Coins | `borderRadius: 10` pour cartes, `12` pour images |

---

## Rappels importants

- **L'URL Tailscale est fixe** → une fois configurée dans `services/api.js`, tu n'y touches plus
- **Si le serveur est modifié** (dans `serveur/`) → il faut l'arrêter (Ctrl+C) et le relancer
- **Si l'app ne se connecte pas** → vérifie que le serveur tourne ET que Tailscale Funnel est actif (`tailscale funnel status`)
- **Si tu ajoutes `expo-image-picker`** → il est déjà installé, pas besoin de le réinstaller
- **Configuration SMTP** → édite `serveur/.env` avec tes identifiants UL et l'adresse du responsable
- **Le .env est ignoré par Git** → ne pas le partager (contient mot de passe)
- **Envoi de rapport** → nécessite que le serveur puisse joindre `smtp.univ-lorraine.fr:587` (VPN UL si hors campus)

---

## Dépendances principales

| Côté | Technologie |
|------|------------|
| App mobile | React Native (Expo SDK 54) |
| Navigation | React Navigation (native-stack) |
| Appareil photo / Galerie | expo-image-picker |
| Serveur | Node.js + Express |
| Upload fichiers | multer |
| Base de données | SQLite (better-sqlite3) |
| Génération PDF | pdfkit |
| Envoi de mails | nodemailer |
| Variables d'environnement | dotenv |
| Tunnel | Tailscale Funnel |
