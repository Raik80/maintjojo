// ============================================================
// Importations
// ============================================================

// Framework HTTP pour créer le serveur REST
const express = require('express');
// Limiteur de débit (protection anti-DoS et anti-spam)
const rateLimit = require('express-rate-limit');
// Coloration des logs dans le terminal
const chalk = require('chalk');
// Middleware d'en-têtes de sécurité HTTP (CSP, HSTS, etc.)
const helmet = require('helmet');
// Middleware pour autoriser les requêtes cross-origin (nécessaire pour l'app mobile)
const cors = require('cors');
// Utilitaires pour la manipulation des chemins de fichiers
const path = require('path');
// Utilitaires système de fichiers (lecture des signatures de fichiers uploadés)
const fs = require('fs');
// Middleware pour gérer l'upload de fichiers multipart/form-data
const multer = require('multer');
// Chargement des variables d'environnement depuis .env
require('dotenv').config();
// Configuration centralisée (port d'écoute, dossier d'uploads, clé API, etc.)
const { PORT, UPLOAD_PATH, API_KEY } = require('./config');
// Fonctions CRUD pour la base de données SQLite (interventions, chantiers, photos)
const {
  ajouterIntervention,
  recupererToutesInterventions,
  recupererInterventionParId,
  supprimerIntervention,
  modifierIntervention,
  terminerIntervention,
  ajouterPhoto,
  recupererPhotos,
  recupererPhotoParId,
  supprimerPhoto,
  compterPhotos,
  creerChantier,
  recupererTousChantiers,
  recupererChantierParId,
  supprimerChantier,
  modifierChantier,
  toggleTacheStatut,
  terminerChantier,
  ajouterPhotoChantier,
  recupererPhotosChantier,
  recupererPhotoChantierParId,
  supprimerPhotoChantier,
  mettreAJourDescriptionPhotoChantier,
  compterPhotosChantier,
  creerAccuse,
  confirmerAccuse,
  recupererAccuse,
  recupererAccuseParToken,
  photoAppartientARapport,
  rechercherProduitParCode,
  sauvegarderProduit,
} = require('./database');
// Service de génération de PDF et d'envoi par email (SMTP)
const { envoyerRapport, envoyerRapportChantier } = require('./services/emailService');

// ============================================================
// Configuration de l'application Express
// ============================================================

// Création de l'instance Express
const app = express();

// Derrière le proxy Tailscale Funnel (qui écoute en loopback et proxifie vers ce serveur),
// il faut faire confiance au proxy pour récupérer la vraie IP client via X-Forwarded-For.
// 'loopback' = seul le proxy local est de confiance, ce qui empêche de falsifier son IP.
app.set('trust proxy', 'loopback');

// Middleware : parsing automatique du JSON dans le body des requêtes
app.use(express.json());

// Middleware : en-têtes de sécurité HTTP (HSTS, X-Content-Type-Options, CSP, etc.).
// La CSP autorise les scripts/styles inline car les pages de plans (public/plans)
// et les pages HTML d'accusé en ont besoin. Aucune origine externe n'est autorisée.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Middleware : CORS restreint. L'app mobile React Native n'envoie pas d'en-tête
// Origin (donc autorisée), on n'autorise que les origines connues pour le web.
const ORIGINES_AUTORISEES = new Set([
  'https://maintjojo-serveur.tailce5b78.ts.net',
  'http://localhost:8081',
  'http://localhost:19006',
]);
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || ORIGINES_AUTORISEES.has(origin)),
}));

// Requêtes techniques des navigateurs (ex. favicon quand le responsable ouvre
// une photo depuis le PDF) : réponse silencieuse pour éviter de faux
// « Accès refusé » dans les logs.
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/robots.txt', (req, res) => res.type('text/plain').send('User-agent: *\nDisallow: /\n'));

// ============================================================
// Limiteurs de débit
// ============================================================

// Réponse renvoyée quand une limite est dépassée
function reponseTropDeRequetes(req, res) {
  return res.status(429).json({ erreur: 'Trop de requêtes, réessayez plus tard.' });
}

// Limiteur global : protège l'ensemble de l'API contre les floods / scans
const limiteurApi = rateLimit({
  windowMs: 15 * 60 * 1000, // fenêtre de 15 minutes
  limit: 100,               // 100 requêtes max par IP et par fenêtre
  standardHeaders: true,    // renvoie les en-têtes RateLimit-*
  legacyHeaders: false,
  handler: reponseTropDeRequetes,
});

// Limiteur strict : protection anti-spam pour l'envoi des rapports par email
const limiteurEnvoi = rateLimit({
  windowMs: 60 * 60 * 1000, // fenêtre d'1 heure
  limit: 5,                 // 5 envois max par IP et par heure
  standardHeaders: true,
  legacyHeaders: false,
  handler: reponseTropDeRequetes,
});

// Appliqué avant le middleware d'authentification : même les requêtes non
// authentifiées (floods, brute-force de clé) sont comptées et limitées.
app.use('/api/', limiteurApi);

// ============================================================
// Middleware d'authentification par clé API
// ============================================================

// Routes publiques qui ne nécessitent pas de clé API :
// - /api/accuse/:token (consultation depuis les emails)
// - /public (fichiers statiques : plans, SVG)
// - /uploads (photos servies directement)
//
// Seul le lien de confirmation d'accusé (token UUID) reste public.
const ROUTES_PUBLIC = [
  { regex: /^\/api\/accuse\/[0-9a-fA-F-]{36}$/, method: 'GET' },
];

app.use((req, res, next) => {
  const estPublique = ROUTES_PUBLIC.some(r =>
    req.method === r.method && r.regex.test(req.path)
  );
  if (estPublique) {
    return next();
  }

  // Photos d'un rapport accessibles via le token de ce rapport (liens du PDF
  // destinés au responsable, qui ne possède pas la clé API).
  // Autorisé uniquement pour GET /uploads/<fichier>?t=<token>, et seulement si
  // le token existe et que la photo appartient bien à ce rapport.
  if (req.method === 'GET' && req.path.startsWith('/uploads/') && typeof req.query.t === 'string') {
    const accuse = recupererAccuseParToken(req.query.t);
    const fichier = path.basename(req.path);
    if (accuse && photoAppartientARapport(fichier, accuse.type, accuse.ref_id)) {
      return next();
    }
  }

  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== API_KEY) {
    const estPhoto = req.path.startsWith('/uploads/');
    const message = estPhoto
      ? (typeof req.query.t === 'string'
          ? 'Accès refusé (token photo invalide ou hors rapport)'
          : 'Accès refusé (photo demandée sans token)')
      : 'Accès refusé (clé API manquante ou invalide)';
    log(req.method, req.path, '🔒', message);
    return res.status(401).json({ erreur: 'Accès non autorisé : clé API invalide ou manquante' });
  }
  next();
});

// Helper pour les logs colorés dans le terminal
function log(method, path, emoji, message) {
  const t = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const methodColor = method === 'POST' ? chalk.green(method)
    : method === 'GET' ? chalk.blue(method)
    : method === 'DELETE' ? chalk.red(method)
    : method === 'PUT' ? chalk.yellow(method)
    : method === 'PATCH' ? chalk.magenta(method)
    : chalk.white(method);
  console.log(` ${chalk.gray(t)} ${methodColor} ${chalk.gray(path.padEnd(42))} ${emoji} ${message}`);
}

// ============================================================
// Configuration de l'upload de fichiers (multer)
// ============================================================

// Chemin absolu du dossier où sont stockées les photos uploadées
const uploadDir = path.join(__dirname, UPLOAD_PATH);

// Association type MIME autorisé → extension imposée sur le disque.
// On n'utilise JAMAIS l'extension fournie par le client (évite .html/.svg malveillants).
const EXT_PAR_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/bmp': '.bmp',
  'image/tiff': '.tiff',
};

// Extensions d'images acceptées, utilisées en secours si le client ne fournit
// pas de type MIME (le fichier est de toute façon servi en image + nosniff).
const EXTENSIONS_IMAGE = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.tif', '.heic', '.heif',
]);
function extensionImage(nomOriginal) {
  const ext = path.extname(nomOriginal || '').toLowerCase();
  return EXTENSIONS_IMAGE.has(ext) ? ext : null;
}

// Configuration du stockage disque : destination + nom de fichier unique
const storage = multer.diskStorage({
  // Dossier de destination : le dossier configuré (ex: ./uploads)
  destination: (req, file, cb) => cb(null, uploadDir),
  // Génération d'un nom unique : timestamp + nombre aléatoire + extension imposée
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = EXT_PAR_MIME[file.mimetype] || extensionImage(file.originalname) || '.jpg';
    cb(null, `photo-${unique}${ext}`);
  },
});

// Instance multer configurée avec stockage disque, limite de taille (10 Mo max) et filtre images uniquement
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (EXT_PAR_MIME[file.mimetype] || extensionImage(file.originalname)) {
      cb(null, true);
    } else {
      console.log(` ${chalk.yellow('⚠️')}  Upload refusé (type non autorisé : ${file.mimetype || 'inconnu'})`);
      cb(new Error('Format de fichier non autorisé. Utilisez JPEG, PNG, WebP ou GIF.'), false);
    }
  },
});

// L'extension du fichier enregistré est TOUJOURS une extension image imposée par
// le serveur (voir EXT_PAR_MIME) et les réponses portent X-Content-Type-Options:
// nosniff (helmet). Un fichier texte/HTML renommé ne peut donc pas être exécuté
// comme page : on n'a pas besoin de rejeter les images selon leur signature.

// ============================================================
// Middlewares statiques
// ============================================================

// Servir les fichiers uploadés (photos) via /uploads/nom_du_fichier
app.use('/uploads', express.static(uploadDir));

// Servir les fichiers statiques (pages web, SVG, etc.) via /public
app.use('/public', express.static(path.join(__dirname, 'public')));

// ============================================================
// Endpoints : Gestion des interventions
// ============================================================

// POST /api/interventions — Créer une nouvelle intervention
// Body attendu (JSON) : { type, description, localisation, urgence, ... }
app.post('/api/interventions', (req, res) => {
  try {
    // Extraction des données envoyées par l'application mobile
    const fiche = req.body;

    // Validation : le champ 'type' est obligatoire
    if (!fiche || !fiche.type) {
      return res.status(400).json({ erreur: 'Données d\'intervention invalides' });
    }

    // Insertion dans la base de données SQLite
    const id = ajouterIntervention(fiche);

    // Relecture immédiate pour retourner l'enregistrement complet (avec l'ID généré)
    const interventionCreee = recupererInterventionParId(id);

    // Réponse HTTP 201 (Created) avec l'objet créé
    res.status(201).json(interventionCreee);
    log('POST', '/api/interventions', '📋', `Intervention #${id} créée (${chalk.bold(fiche.type)})`);
  } catch (erreur) {
    // En cas d'erreur serveur, retourne un code 500 (Internal Server Error)
    console.error('Erreur lors de la création :', erreur);
    res.status(500).json({ erreur: 'Erreur interne du serveur' });
  }
});

// Endpoint GET pour récupérer toutes les interventions
app.get('/api/interventions', (req, res) => {
  try {
    // Récupération de toutes les interventions depuis la base
    const interventions = recupererToutesInterventions();
    // Retourne la liste (peut être vide)
    res.json(interventions);
  } catch (erreur) {
    console.error('Erreur lors de la récupération :', erreur);
    res.status(500).json({ erreur: 'Erreur interne du serveur' });
  }
});

// Endpoint GET pour récupérer une intervention par son ID
app.get('/api/interventions/:id', (req, res) => {
  try {
    // Récupération de l'ID depuis les paramètres de l'URL
    const id = parseInt(req.params.id);

    // Recherche de l'intervention dans la base
    const intervention = recupererInterventionParId(id);

    // Si l'intervention n'existe pas, retourne une erreur 404
    if (!intervention) {
      return res.status(404).json({ erreur: 'Intervention non trouvée' });
    }

    // Retourne l'intervention trouvée
    res.json(intervention);
  } catch (erreur) {
    console.error('Erreur lors de la récupération :', erreur);
    res.status(500).json({ erreur: 'Erreur interne du serveur' });
  }
});

// Endpoint PUT pour modifier une intervention existante
app.put('/api/interventions/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const fiche = req.body;

    // Vérification que les données sont valides
    if (!fiche || !fiche.type) {
      return res.status(400).json({ erreur: 'Données d\'intervention invalides' });
    }

    // Vérification que l'intervention existe
    const existante = recupererInterventionParId(id);
    if (!existante) {
      return res.status(404).json({ erreur: 'Intervention non trouvée' });
    }

    // Modification de l'intervention
    const modifie = modifierIntervention(id, fiche);

    if (!modifie) {
      return res.status(500).json({ erreur: 'Erreur lors de la modification' });
    }

    // Récupération de l'intervention modifiée
    const interventionModifiee = recupererInterventionParId(id);
    res.json(interventionModifiee);
    log('PUT', `/api/interventions/${id}`, '✏️', `Intervention #${id} modifiée`);
  } catch (erreur) {
    console.error('Erreur lors de la modification :', erreur);
    res.status(500).json({ erreur: 'Erreur interne du serveur' });
  }
});

// Endpoint DELETE pour supprimer une intervention et ses photos
app.delete('/api/interventions/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Récupération des photos associées pour supprimer les fichiers physiques sur le disque
    // (la suppression en base est gérée automatiquement par ON DELETE CASCADE)
    const photos = recupererPhotos(id);
    for (const photo of photos) {
      // Suppression du fichier image dans le dossier uploads
      const filePath = path.join(uploadDir, photo.filename);
      try { fs.unlinkSync(filePath); } catch (e) {
        // Ignoré si le fichier n'existe plus (supprimé manuellement ou déjà nettoyé)
      }
    }

    // Suppression de l'intervention (les enregistrements photos en DB sont supprimés par CASCADE)
    const supprime = supprimerIntervention(id);

    // Si rien n'a été supprimé, l'intervention n'existe pas
    if (!supprime) {
      return res.status(404).json({ erreur: 'Intervention non trouvée' });
    }

    // Confirmation de la suppression
    res.json({ message: 'Intervention et photos supprimées avec succès' });
    log('DELETE', `/api/interventions/${id}`, '🗑️', `Intervention #${id} supprimée`);
  } catch (erreur) {
    console.error('Erreur lors de la suppression :', erreur);
    res.status(500).json({ erreur: 'Erreur interne du serveur' });
  }
});

// ============================================================
// Endpoints : Gestion des photos d'interventions
// ============================================================

// POST /api/interventions/:id/photos — Uploader une photo sur une intervention
// Utilise multer (upload.single('image')) pour recevoir le fichier image dans le champ 'image'
// Body (multipart/form-data) : image (fichier) + description (texte optionnel)
app.post('/api/interventions/:id/photos', upload.single('image'), (req, res) => {
  try {
    // Extraction et conversion de l'ID depuis les paramètres URL
    const id = parseInt(req.params.id);

    // Vérification que l'intervention cible existe
    const existante = recupererInterventionParId(id);
    if (!existante) {
      return res.status(404).json({ erreur: 'Intervention non trouvée' });
    }

    // Vérification qu'un fichier a bien été joint à la requête
    if (!req.file) {
      return res.status(400).json({ erreur: 'Aucune image fournie' });
    }

    // Sauvegarde en base de données : nom du fichier sur disque + légende optionnelle
    const description = req.body.description || '';
    const photoId = ajouterPhoto(id, req.file.filename, description);
    const photo = recupererPhotoParId(photoId);

    // Code 201 = Created, retourne l'objet photo complet
    res.status(201).json(photo);
    log('POST', `/api/interventions/${id}/photos`, '📷', `Photo ajoutée (intervention #${id})`);
  } catch (erreur) {
    console.error('Erreur lors de l\'upload de la photo :', erreur);
    res.status(500).json({ erreur: 'Erreur interne du serveur' });
  }
});

// GET /api/interventions/:id/photos — Lister les photos d'une intervention
// Retourne un tableau de photos avec leur URL complète pour l'affichage côté client
app.get('/api/interventions/:id/photos', (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Vérification que l'intervention existe
    const existante = recupererInterventionParId(id);
    if (!existante) {
      return res.status(404).json({ erreur: 'Intervention non trouvée' });
    }

    // Récupération des photos depuis la base
    const photos = recupererPhotos(id);

    // Construction de l'URL de base (protocole + hôte) pour générer les URLs complètes
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Enrichissement de chaque photo avec son URL téléchargeable complète
    const photosAvecUrl = photos.map(p => ({
      ...p,
      url: `${baseUrl}/uploads/${p.filename}`,
    }));

    res.json(photosAvecUrl);
  } catch (erreur) {
    console.error('Erreur lors de la récupération des photos :', erreur);
    res.status(500).json({ erreur: 'Erreur interne du serveur' });
  }
});

// DELETE /api/photos/:id — Supprimer une photo
// Supprime à la fois l'enregistrement en base ET le fichier physique sur le disque
app.delete('/api/photos/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Récupération de la photo pour obtenir le nom du fichier à supprimer du disque
    const photo = recupererPhotoParId(id);
    if (!photo) {
      return res.status(404).json({ erreur: 'Photo non trouvée' });
    }

    // Suppression du fichier physique dans le dossier uploads
    const filePath = path.join(uploadDir, photo.filename);
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      // Ignoré silencieusement : le fichier peut déjà avoir été supprimé manuellement
    }

    // Suppression de l'enregistrement en base de données
    const supprime = supprimerPhoto(id);
    if (!supprime) {
      return res.status(500).json({ erreur: 'Erreur lors de la suppression' });
    }

    res.json({ message: 'Photo supprimée avec succès' });
    log('DELETE', `/api/photos/${id}`, '🗑️', `Photo #${id} supprimée`);
  } catch (erreur) {
    console.error('Erreur lors de la suppression de la photo :', erreur);
    res.status(500).json({ erreur: 'Erreur interne du serveur' });
  }
});

// ============================================================
// Endpoints : Clôture d'intervention
// ============================================================

// PATCH /api/interventions/:id/terminer — Marquer une intervention comme terminée
// Body : { resolution: "Description de la résolution" }
app.patch('/api/interventions/:id/terminer', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { resolution } = req.body;

    // La description de la résolution est obligatoire pour clôturer
    if (!resolution || resolution.trim() === '') {
      return res.status(400).json({ erreur: 'Description de la résolution requise' });
    }

    // Vérification que l'intervention existe
    const existante = recupererInterventionParId(id);
    if (!existante) {
      return res.status(404).json({ erreur: 'Intervention non trouvée' });
    }

    // Mise à jour du statut en base (passe de 'en cours' à 'terminé')
    const terminee = terminerIntervention(id, resolution.trim());
    if (!terminee) {
      return res.status(500).json({ erreur: 'Erreur lors de la terminaison' });
    }

    // Relecture et retour de l'intervention mise à jour
    const interventionTerminee = recupererInterventionParId(id);
    res.json(interventionTerminee);
    log('PATCH', `/api/interventions/${id}/terminer`, '✅', `Intervention #${id} terminée`);
  } catch (erreur) {
    console.error('Erreur lors de la terminaison :', erreur);
    res.status(500).json({ erreur: 'Erreur interne du serveur' });
  }
});

// POST /api/interventions/:id/envoyer — Générer et envoyer le rapport PDF par email
// Vérifie que l'intervention existe, génère le PDF via emailService, et expédie
app.post('/api/interventions/:id/envoyer', limiteurEnvoi, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Vérification que l'intervention cible existe
    const intervention = recupererInterventionParId(id);
    if (!intervention) {
      return res.status(404).json({ erreur: 'Intervention non trouvée' });
    }

    // Récupération des photos associées pour les inclure dans le rapport PDF
    const photos = recupererPhotos(id);

    // Appel au service email : génération du PDF + envoi par SMTP
    const resultat = await envoyerRapport(intervention, photos);

    // Succès : retourne les informations de l'envoi (destinataire, date, etc.)
    res.json(resultat);
    log('POST', `/api/interventions/${id}/envoyer`, '📧', `Rapport envoyé (intervention #${id})`);
  } catch (erreur) {
    console.error('Erreur lors de l\'envoi du rapport :', erreur);
    res.status(500).json({ erreur: "Erreur lors de l'envoi du rapport" });
  }
});

// ============================================================
// Endpoints pour la gestion des chantiers
// ============================================================

// ============================================================
// Endpoints : Création et consultation des chantiers
// ============================================================

// POST /api/chantiers — Créer un nouveau chantier
// Body : { localisation: "Hall A", taches: [{description: "..."}], materiels: [...] }
app.post('/api/chantiers', (req, res) => {
  try {
    const data = req.body;

    // Vérification que les données sont valides
    if (!data) {
      return res.status(400).json({ erreur: 'Données du chantier invalides' });
    }

    // Création du chantier avec ses tâches et matériels (transaction SQL)
    const chantier = creerChantier(data);

    // Réponse avec le chantier créé et un code 201 (Created)
    res.status(201).json(chantier);
    const loc = chantier.localisation || '';
    log('POST', '/api/chantiers', '🏗️', `Chantier #${chantier.id} créé (${chalk.bold(loc)})`);
  } catch (erreur) {
    console.error('Erreur lors de la création du chantier :', erreur);
    res.status(500).json({ erreur: 'Erreur interne du serveur' });
  }
});

// GET /api/chantiers — Liste tous les chantiers
app.get('/api/chantiers', (req, res) => {
  try {
    // Récupération de la liste complète depuis la base SQLite
    const chantiers = recupererTousChantiers();
    res.json(chantiers);
  } catch (erreur) {
    console.error('Erreur lors de la récupération des chantiers :', erreur);
    res.status(500).json({ erreur: 'Erreur interne du serveur' });
  }
});

// GET /api/chantiers/:id — Détail d'un chantier (avec tâches et matériels)
app.get('/api/chantiers/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const chantier = recupererChantierParId(id);

    if (!chantier) {
      return res.status(404).json({ erreur: 'Chantier non trouvé' });
    }

    res.json(chantier);
  } catch (erreur) {
    console.error('Erreur lors de la récupération du chantier :', erreur);
    res.status(500).json({ erreur: 'Erreur interne du serveur' });
  }
});

// Endpoint DELETE pour supprimer un chantier (les tâches, matériels et photos sont supprimés en cascade)
app.delete('/api/chantiers/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const supprime = supprimerChantier(id, uploadDir);

    if (!supprime) {
      return res.status(404).json({ erreur: 'Chantier non trouvé' });
    }

    res.json({ message: 'Chantier supprimé avec succès' });
    log('DELETE', `/api/chantiers/${id}`, '🗑️', `Chantier #${id} supprimé`);
  } catch (erreur) {
    console.error('Erreur lors de la suppression du chantier :', erreur);
    res.status(500).json({ erreur: 'Erreur interne du serveur' });
  }
});

// ============================================================
// Endpoints : Modification des chantiers
// ============================================================

// PUT /api/chantiers/:id — Modifier un chantier complet (localisation, tâches, matériels)
// Body : { localisation, taches: [{description}], materiels: [{nom, quantite, reference}] }
app.put('/api/chantiers/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;

    // Validation des données entrantes
    if (!data) {
      return res.status(400).json({ erreur: 'Données du chantier invalides' });
    }

    // Vérification que le chantier cible existe
    const existant = recupererChantierParId(id);
    if (!existant) {
      return res.status(404).json({ erreur: 'Chantier non trouvé' });
    }

    // Remplacement complet des données (tâches et matériels sont ré-écrits)
    const chantier = modifierChantier(id, data);
    res.json(chantier);
    log('PUT', `/api/chantiers/${id}`, '✏️', `Chantier #${id} modifié`);
  } catch (erreur) {
    console.error('Erreur lors de la modification du chantier :', erreur);
    res.status(500).json({ erreur: 'Erreur interne du serveur' });
  }
});

// ============================================================
// Endpoints : Gestion des tâches de chantier
// ============================================================

// PATCH /api/chantiers/:id/taches/:tacheId — Basculer le statut d'une tâche
// Alterne entre 'à faire' et 'terminé'
app.patch('/api/chantiers/:id/taches/:tacheId', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const tacheId = parseInt(req.params.tacheId);

    // Vérification préalable que le chantier existe
    const existant = recupererChantierParId(id);
    if (!existant) {
      return res.status(404).json({ erreur: 'Chantier non trouvé' });
    }

    // Bascule du statut en base de données
    const tache = toggleTacheStatut(tacheId);
    if (!tache) {
      return res.status(404).json({ erreur: 'Tâche non trouvée' });
    }

    res.json(tache);
  } catch (erreur) {
    console.error('Erreur lors du basculement de la tâche :', erreur);
    res.status(500).json({ erreur: 'Erreur interne du serveur' });
  }
});

// ============================================================
// Endpoints : Clôture des chantiers
// ============================================================

// PATCH /api/chantiers/:id/terminer — Marquer un chantier comme terminé
app.patch('/api/chantiers/:id/terminer', (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Vérification que le chantier existe
    const existant = recupererChantierParId(id);
    if (!existant) {
      return res.status(404).json({ erreur: 'Chantier non trouvé' });
    }

    // Vérification que le chantier n'est pas déjà terminé
    if (existant.statut === 'terminé') {
      return res.status(400).json({ erreur: 'Le chantier est déjà terminé' });
    }

    // Mise à jour du statut
    const terminee = terminerChantier(id);
    if (!terminee) {
      return res.status(500).json({ erreur: 'Erreur lors de la terminaison du chantier' });
    }

    // Retourne le chantier mis à jour
    const chantierTermine = recupererChantierParId(id);
    res.json(chantierTermine);
    log('PATCH', `/api/chantiers/${id}/terminer`, '✅', `Chantier #${id} terminé`);
  } catch (erreur) {
    console.error('Erreur lors de la terminaison du chantier :', erreur);
    res.status(500).json({ erreur: 'Erreur interne du serveur' });
  }
});

// Endpoint POST pour générer et envoyer le rapport d'un chantier par mail
// Vérifie que le chantier existe et est terminé, puis génère le PDF et l'envoie
app.post('/api/chantiers/:id/envoyer', limiteurEnvoi, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Vérification que le chantier existe
    const chantier = recupererChantierParId(id);
    if (!chantier) {
      return res.status(404).json({ erreur: 'Chantier non trouvé' });
    }

    // Récupération des photos associées
    const photos = recupererPhotosChantier(id);

    // Génération du PDF et envoi par mail (appel au service emailService)
    const resultat = await envoyerRapportChantier(chantier, photos);

    // Succès : retourne un message de confirmation
    res.json(resultat);
    log('POST', `/api/chantiers/${id}/envoyer`, '📧', `Rapport envoyé (chantier #${id})`);
  } catch (erreur) {
    console.error('Erreur lors de l\'envoi du rapport :', erreur);
    res.status(500).json({ erreur: "Erreur lors de l'envoi du rapport" });
  }
});

// ============================================================
// Endpoints pour la gestion des photos de chantiers
// ============================================================

// Endpoint POST pour uploader une photo sur un chantier
// Utilise multer (upload.single('image')) pour recevoir le fichier image dans le champ 'image'
// Body (multipart/form-data) : image (fichier) + description (texte optionnel)
app.post('/api/chantiers/:id/photos', upload.single('image'), (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Vérification que le chantier existe
    const existant = recupererChantierParId(id);
    if (!existant) {
      return res.status(404).json({ erreur: 'Chantier non trouvé' });
    }

    // Vérification qu'un fichier a bien été envoyé
    if (!req.file) {
      return res.status(400).json({ erreur: 'Aucune image fournie' });
    }

    // Sauvegarde en base : nom du fichier + légende optionnelle
    const description = req.body.description || '';
    const photoId = ajouterPhotoChantier(id, req.file.filename, description);
    const photo = recupererPhotoChantierParId(photoId);

    res.status(201).json(photo); // Code 201 = Created
    log('POST', `/api/chantiers/${id}/photos`, '📷', `Photo ajoutée (chantier #${id})`);
  } catch (erreur) {
    console.error('Erreur lors de l\'upload de la photo chantier :', erreur);
    res.status(500).json({ erreur: 'Erreur interne du serveur' });
  }
});

// Endpoint GET pour lister les photos d'un chantier
// Retourne un tableau de photos avec leur URL complète pour l'affichage côté mobile
app.get('/api/chantiers/:id/photos', (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Vérification que le chantier existe
    const existant = recupererChantierParId(id);
    if (!existant) {
      return res.status(404).json({ erreur: 'Chantier non trouvé' });
    }

    const photos = recupererPhotosChantier(id);
    // Construction de l'URL de base pour générer les liens complets vers les fichiers
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Ajout du champ 'url' contenant l'URL complète de chaque photo
    const photosAvecUrl = photos.map(p => ({
      ...p,
      url: `${baseUrl}/uploads/${p.filename}`,
    }));

    res.json(photosAvecUrl);
  } catch (erreur) {
    console.error('Erreur lors de la récupération des photos chantier :', erreur);
    res.status(500).json({ erreur: 'Erreur interne du serveur' });
  }
});

// PATCH /api/chantiers/photos/:id — Mettre à jour la description d'une photo de chantier
// Body : { description: "Nouvelle légende" }
app.patch('/api/chantiers/photos/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { description } = req.body;

    // Vérification que la photo existe
    const photo = recupererPhotoChantierParId(id);
    if (!photo) {
      return res.status(404).json({ erreur: 'Photo non trouvée' });
    }

    // Mise à jour de la description
    const modifie = mettreAJourDescriptionPhotoChantier(id, description || '');
    if (!modifie) {
      return res.status(500).json({ erreur: 'Erreur lors de la mise à jour' });
    }

    // Retourne la photo mise à jour
    const photoMaj = recupererPhotoChantierParId(id);
    res.json(photoMaj);
  } catch (erreur) {
    console.error('Erreur lors de la mise à jour de la description :', erreur);
    res.status(500).json({ erreur: 'Erreur interne du serveur' });
  }
});

// DELETE /api/chantiers/photos/:id — Supprimer une photo de chantier
// Supprime à la fois l'enregistrement en base ET le fichier physique sur le disque
app.delete('/api/chantiers/photos/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Récupération de la photo pour connaître le nom du fichier à supprimer
    const photo = recupererPhotoChantierParId(id);
    if (!photo) {
      return res.status(404).json({ erreur: 'Photo non trouvée' });
    }

    // Suppression du fichier physique dans le dossier uploads
    const filePath = path.join(uploadDir, photo.filename);
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      // Ignoré : le fichier peut déjà avoir été supprimé manuellement
    }

    // Suppression de l'enregistrement en base de données
    const supprime = supprimerPhotoChantier(id);
    if (!supprime) {
      return res.status(500).json({ erreur: 'Erreur lors de la suppression' });
    }

    res.json({ message: 'Photo supprimée avec succès' });
    log('DELETE', '/api/chantiers/photos/' + id, '🗑️', `Photo chantier #${id} supprimée`);
  } catch (erreur) {
    console.error('Erreur lors de la suppression de la photo chantier :', erreur);
    res.status(500).json({ erreur: 'Erreur interne du serveur' });
  }
});

// ============================================================
// Routes : Accusé de réception des rapports
// ============================================================

// GET /api/accuse/:token — Page de confirmation de réception du rapport
app.get('/api/accuse/:token', (req, res) => {
  const resultat = confirmerAccuse(req.params.token);
  if (resultat === null) {
    return res.send(`
      <html><body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #B71C1C;">❌ Lien invalide</h1>
        <p style="color: #666;">Ce lien de confirmation n'est pas valide.</p>
      </body></html>
    `);
  }
  if (resultat.dejaConfirme) {
    return res.send(`
      <html><body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #1A1A2E;">✅ Déjà confirmé</h1>
        <p style="color: #666;">Ce rapport a déjà été confirmé le ${new Date(resultat.confirme_le).toLocaleDateString('fr-FR')}.</p>
      </body></html>
    `);
  }
  res.send(`
    <html><body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5;">
      <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="font-size: 64px; margin-bottom: 20px;">✅</div>
        <h1 style="color: #1A1A2E; margin: 0 0 10px 0;">Confirmation enregistrée !</h1>
        <p style="color: #666; font-size: 16px; line-height: 1.5;">
          Merci, votre accusé de réception a bien été pris en compte.
        </p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px;">MaintJojo — Application de maintenance</p>
        </div>
      </div>
    </body></html>
  `);
  log('GET', `/api/accuse/:token`, '✅', 'Accusé confirmé');
});

// GET /api/accuse/statut/:type/:refId — Vérifier l'état d'un accusé
app.get('/api/accuse/statut/:type/:refId', (req, res) => {
  const accuse = recupererAccuse(req.params.type, parseInt(req.params.refId));
  if (!accuse) {
    return res.json({ existe: false });
  }
  res.json({ existe: true, confirme: !!accuse.confirme_le, confirme_le: accuse.confirme_le });
  log('GET', `/api/accuse/statut/${req.params.type}/${req.params.refId}`, '📋', accuse.confirme_le ? 'Confirmé' : 'En attente');
});

// ============================================================
// Routes : Recherche de produits par code-barres (Gemini)
// ============================================================

// GET /api/produits/barcode/:code — Cherche un produit par code-barres
app.get('/api/produits/barcode/:code', async (req, res) => {
  try {
    const code = req.params.code;
    if (!code || code.length < 3) {
      return res.status(400).json({ erreur: 'Code-barres invalide' });
    }

    // Étape 1 : chercher dans le cache local
    const cache = rechercherProduitParCode(code);
    if (cache) {
      log('GET', '/api/produits/barcode', '📦', `Cache: ${cache.nom}`);
      return res.json(cache);
    }

    // Étape 2 : chercher sur Rexel directement
    try {
      const r = await fetch(`https://www.rexel.fr/frx/search?text=${encodeURIComponent(code)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' },
      });
      if (r.ok) {
        const html = await r.text();
        const urlMatch = html.match(/href="([^"]*\/[A-Z0-9]{8,20}\/p\/\d+[^"]*)"/);
        if (urlMatch) {
          const segments = urlMatch[1].split('/');
          const refRexel = segments[segments.length - 3];
          const nomBrut = segments[segments.length - 4].replace(/\+/g, ' ').replace(/%2F/g, '/');
          const nom = decodeURIComponent(nomBrut).replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
          if (nom && nom.length > 2 && refRexel) {
            sauvegarderProduit(code, nom, refRexel);
            log('GET', '/api/produits/barcode', '📦', `Rexel: ${nom}`);
            return res.json({ nom, reference: refRexel });
          }
        }
      }
    } catch (e) {
      console.error('Erreur scraping Rexel:', e.message);
    }

    // Pas trouvé
    log('GET', '/api/produits/barcode', '📦', 'Nouveau code');
    res.json({ nom: '', reference: '', nouveau: true });
  } catch (erreur) {
    console.error('Erreur recherche code-barres:', erreur);
    res.status(500).json({ erreur: 'Erreur lors de la recherche du produit' });
  }
});

// POST /api/produits/barcode/:code — Sauvegarde un produit scanné en cache
app.post('/api/produits/barcode/:code', (req, res) => {
  try {
    const code = req.params.code;
    const { nom, reference } = req.body;
    if (!code || !nom) {
      return res.status(400).json({ erreur: 'Code-barres et nom requis' });
    }
    sauvegarderProduit(code, nom, reference || '');
    log('POST', '/api/produits/barcode', '💾', `${nom} (${code})`);
    res.json({ nom, reference: reference || '' });
  } catch (erreur) {
    res.status(500).json({ erreur: 'Erreur lors de la sauvegarde du produit' });
  }
});

// ============================================================
// Gestion centralisée des erreurs (JSON propre, pas de fuite interne)
// ============================================================

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ erreur: 'Fichier trop volumineux (max 10 Mo)' });
    }
    return res.status(400).json({ erreur: 'Fichier invalide' });
  }
  if (err && typeof err.message === 'string' && err.message.startsWith('Format de fichier non autorisé')) {
    return res.status(400).json({ erreur: 'Format de fichier non autorisé. Utilisez JPEG, PNG, WebP ou GIF.' });
  }
  console.error('Erreur non gérée :', err);
  res.status(500).json({ erreur: 'Erreur interne du serveur' });
});

// ============================================================
// Démarrage du serveur
// ============================================================

app.listen(PORT, () => {
  console.log('');
  console.log(chalk.hex('#FFD700')('  ╔══════════════════════════════════════╗'));
  console.log(chalk.hex('#FFD700')('  ║') + chalk.bold('           MAINTJOJO               ') + chalk.hex('#FFD700')('║'));
  console.log(chalk.hex('#FFD700')('  ║') + chalk.gray('     Application de maintenance      ') + chalk.hex('#FFD700')('║'));
  console.log(chalk.hex('#FFD700')('  ╠══════════════════════════════════════╣'));
  console.log(chalk.hex('#FFD700')('  ║') + chalk.white('  Serveur ') + chalk.cyan(`http://localhost:${PORT}`) + chalk.hex('#FFD700')('       ║'));
  console.log(chalk.hex('#FFD700')('  ║') + chalk.white('  Funnel  ') + chalk.cyan('maintjojo-serveur.tailce5b78.ts.net') + chalk.hex('#FFD700')(' ║'));
  console.log(chalk.hex('#FFD700')('  ║') + chalk.white('  API     ') + chalk.cyan('/interventions, /chantiers') + chalk.hex('#FFD700')('     ║'));
  console.log(chalk.hex('#FFD700')('  ╚══════════════════════════════════════╝'));
  console.log('');
});
