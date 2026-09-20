// Importation de better-sqlite3 pour la gestion de la base de données SQLite
const Database = require('better-sqlite3');
// Importation de la configuration (chemin de la base)
const { DB_PATH } = require('./config');
// Importation de path pour la gestion des chemins
const path = require('path');

// Chemin absolu du fichier de base de données (dans le dossier serveur)
const dbPath = path.join(__dirname, DB_PATH);

// Initialisation de la connexion à la base de données
const db = new Database(dbPath);

// Activation du mode WAL (Write-Ahead Logging) pour de meilleures performances
db.pragma('journal_mode = WAL');
// Activation des clés étrangères pour les suppressions en cascade
db.pragma('foreign_keys = ON');

// Création de la table accuses pour les accusés de réception des rapports
db.exec(`
  CREATE TABLE IF NOT EXISTS accuses (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    type      TEXT    NOT NULL,
    ref_id    INTEGER NOT NULL,
    token     TEXT    NOT NULL UNIQUE,
    confirme_le DATETIME DEFAULT NULL,
    cree_le   DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Création de la table interventions si elle n'existe pas
db.exec(`
  CREATE TABLE IF NOT EXISTS interventions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL DEFAULT 'Non spécifié',
    batiment TEXT NOT NULL DEFAULT 'Non spécifié',
    etage TEXT NOT NULL DEFAULT 'Non spécifié',
    entree TEXT NOT NULL DEFAULT 'Non spécifié',
    telephone TEXT NOT NULL DEFAULT '',
    personne TEXT NOT NULL DEFAULT '',
    abyla TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    statut TEXT NOT NULL DEFAULT 'en cours',
    resolution TEXT NOT NULL DEFAULT '',
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Migration : ajout des colonnes statut et resolution si elles n'existent pas
try { db.exec(`ALTER TABLE interventions ADD COLUMN statut TEXT NOT NULL DEFAULT 'en cours'`); } catch (e) {}
try { db.exec(`ALTER TABLE interventions ADD COLUMN resolution TEXT NOT NULL DEFAULT ''`); } catch (e) {}
// Migration : ajout de la colonne telephone (numéro de poste) si elle n'existe pas
try { db.exec(`ALTER TABLE interventions ADD COLUMN telephone TEXT NOT NULL DEFAULT ''`); } catch (e) {}
// Migration : ajout de la colonne personne (nom associé au poste) si elle n'existe pas
try { db.exec(`ALTER TABLE interventions ADD COLUMN personne TEXT NOT NULL DEFAULT ''`); } catch (e) {}
// Migration : ajout de la colonne abyla (numéro de pièce affiché sur les portes) si elle n'existe pas
try { db.exec(`ALTER TABLE interventions ADD COLUMN abyla TEXT NOT NULL DEFAULT ''`); } catch (e) {}

// Création de la table photos pour stocker les images liées aux interventions
// Chaque photo est liée à une intervention via intervention_id (clé étrangère)
// ON DELETE CASCADE : supprime les photos si l'intervention est supprimée
db.exec(`
  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    intervention_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    description TEXT DEFAULT '',
    date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE
  )
`);

// Migration silencieuse : ajoute la colonne description si elle n'existe pas (bases créées avant cette mise à jour)
// Le try/catch ignore l'erreur si la colonne existe déjà
try { db.exec(`ALTER TABLE photos ADD COLUMN description TEXT DEFAULT ''`); } catch (e) {}

// Création de la table chantiers si elle n'existe pas
db.exec(`
  CREATE TABLE IF NOT EXISTS chantiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    localisation TEXT NOT NULL DEFAULT '',
    statut TEXT NOT NULL DEFAULT 'en cours',
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Création de la table taches_chantier si elle n'existe pas
// Chaque tâche est liée à un chantier via chantier_id (clé étrangère)
// ON DELETE CASCADE : supprime les tâches si le chantier est supprimé
db.exec(`
  CREATE TABLE IF NOT EXISTS taches_chantier (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chantier_id INTEGER NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    statut TEXT NOT NULL DEFAULT 'à faire',
    FOREIGN KEY (chantier_id) REFERENCES chantiers(id) ON DELETE CASCADE
  )
`);

// Création de la table materiels_chantier si elle n'existe pas
// Chaque matériel est lié à un chantier via chantier_id (clé étrangère)
// ON DELETE CASCADE : supprime les matériels si le chantier est supprimé
db.exec(`
  CREATE TABLE IF NOT EXISTS materiels_chantier (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chantier_id INTEGER NOT NULL,
    nom TEXT NOT NULL DEFAULT '',
    quantite INTEGER NOT NULL DEFAULT 1,
    reference TEXT DEFAULT '',
    FOREIGN KEY (chantier_id) REFERENCES chantiers(id) ON DELETE CASCADE
  )
`);

// Création de la table produits pour le cache des scan code-barres
db.exec(`
  CREATE TABLE IF NOT EXISTS produits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code_barre TEXT NOT NULL UNIQUE,
    nom TEXT NOT NULL,
    reference TEXT DEFAULT '',
    derniere_utilisation DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Création de la table photos_chantier pour stocker les images liées aux chantiers
// Chaque photo est liée à un chantier via chantier_id (clé étrangère)
// ON DELETE CASCADE : supprime les photos si le chantier est supprimé
db.exec(`
  CREATE TABLE IF NOT EXISTS photos_chantier (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chantier_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    description TEXT DEFAULT '',
    date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chantier_id) REFERENCES chantiers(id) ON DELETE CASCADE
  )
`);

// Préparation des requêtes SQL pour de meilleures performances
const insertStmt = db.prepare(`
  INSERT INTO interventions (type, batiment, etage, entree, telephone, personne, description)
  VALUES (@type, @batiment, @etage, @entree, @telephone, @personne, @description)
`);

const getAllStmt = db.prepare('SELECT * FROM interventions ORDER BY date_creation DESC');

const getByIdStmt = db.prepare('SELECT * FROM interventions WHERE id = ?');

const deleteStmt = db.prepare('DELETE FROM interventions WHERE id = ?');

const updateStmt = db.prepare(`
  UPDATE interventions SET type = @type, batiment = @batiment, etage = @etage,
  entree = @entree, telephone = @telephone, personne = @personne, description = @description WHERE id = @id
`);

// Fonction pour ajouter une intervention
function ajouterIntervention(fiche) {
  const resultat = insertStmt.run({
    type: fiche.type,
    batiment: fiche.batiment,
    etage: fiche.etage,
    entree: fiche.entree,
    telephone: fiche.telephone || '',
    personne: fiche.personne || '',
    description: fiche.description,
  });
  return resultat.lastInsertRowid; // Retourne l'ID de l'intervention créée
}

// Fonction pour récupérer toutes les interventions
function recupererToutesInterventions() {
  return getAllStmt.all();
}

// Fonction pour récupérer une intervention par son ID
function recupererInterventionParId(id) {
  return getByIdStmt.get(id);
}

// Fonction pour supprimer une intervention
function supprimerIntervention(id) {
  const resultat = deleteStmt.run(id);
  return resultat.changes > 0; // Retourne true si une ligne a été supprimée
}

// Fonction pour modifier une intervention existante
function modifierIntervention(id, fiche) {
  const resultat = updateStmt.run({
    id: id,
    type: fiche.type,
    batiment: fiche.batiment,
    etage: fiche.etage,
    entree: fiche.entree,
    telephone: fiche.telephone || '',
    personne: fiche.personne || '',
    description: fiche.description,
  });
  return resultat.changes > 0; // Retourne true si la modification a été effectuée
}

// Met à jour uniquement le numéro Abyla (pièce) d'une intervention
function mettreAJourAbyla(id, abyla) {
  const resultat = db.prepare('UPDATE interventions SET abyla = @abyla WHERE id = @id').run({
    id,
    abyla: abyla || '',
  });
  return resultat.changes > 0;
}

// Récupère toutes les interventions liées à une pièce (numéro Abyla), les plus récentes d'abord
function recupererInterventionsParAbyla(abyla) {
  return db.prepare('SELECT * FROM interventions WHERE abyla = ? ORDER BY date_creation DESC').all(abyla);
}

// Ajoute une photo à une intervention dans la base de données
// interventionId : ID de l'intervention parente
// filename : nom du fichier image stocké sur le serveur
// description : légende optionnelle de la photo
function ajouterPhoto(interventionId, filename, description) {
  const stmt = db.prepare(`
    INSERT INTO photos (intervention_id, filename, description)
    VALUES (@interventionId, @filename, @description)
  `);
  const resultat = stmt.run({ interventionId, filename, description: description || '' });
  return resultat.lastInsertRowid; // Retourne l'ID de la photo créée
}

// Récupère toutes les photos d'une intervention, triées par date d'ajout (ordre chronologique)
function recupererPhotos(interventionId) {
  const stmt = db.prepare('SELECT * FROM photos WHERE intervention_id = ? ORDER BY date_added ASC');
  return stmt.all(interventionId);
}

// Récupère une photo spécifique par son ID (utile pour les vérifications)
function recupererPhotoParId(id) {
  const stmt = db.prepare('SELECT * FROM photos WHERE id = ?');
  return stmt.get(id);
}

// Supprime une photo de la base de données par son ID
// Retourne true si une ligne a été supprimée, false sinon
function supprimerPhoto(id) {
  const resultat = db.prepare('DELETE FROM photos WHERE id = ?').run(id);
  return resultat.changes > 0;
}

// Compte le nombre de photos associées à une intervention
// Utilisé pour afficher un compteur dans la liste des interventions
function compterPhotos(interventionId) {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM photos WHERE intervention_id = ?');
  return stmt.get(interventionId).count;
}

// Fonction pour marquer une intervention comme terminée
function terminerIntervention(id, resolution) {
  const stmt = db.prepare(`
    UPDATE interventions SET statut = 'terminé', resolution = @resolution
    WHERE id = @id
  `);
  const resultat = stmt.run({ id, resolution });
  return resultat.changes > 0;
}

// ============================================================
// Fonctions pour la gestion des photos de chantiers
// ============================================================

// Préparation des requêtes SQL pour les photos de chantier
const insertPhotoChantierStmt = db.prepare(`
  INSERT INTO photos_chantier (chantier_id, filename, description)
  VALUES (@chantier_id, @filename, @description)
`);
const getPhotosChantierStmt = db.prepare('SELECT * FROM photos_chantier WHERE chantier_id = ? ORDER BY date_added ASC');
const getPhotoChantierByIdStmt = db.prepare('SELECT * FROM photos_chantier WHERE id = ?');
const deletePhotoChantierStmt = db.prepare('DELETE FROM photos_chantier WHERE id = ?');
const updatePhotoChantierDescriptionStmt = db.prepare(`
  UPDATE photos_chantier SET description = @description WHERE id = @id
`);

// Ajoute une photo à un chantier dans la base de données
// chantierId : ID du chantier parent
// filename : nom du fichier image stocké sur le serveur
// description : légende optionnelle de la photo
function ajouterPhotoChantier(chantierId, filename, description) {
  const resultat = insertPhotoChantierStmt.run({
    chantier_id: chantierId,
    filename: filename,
    description: description || '',
  });
  return resultat.lastInsertRowid;
}

// Récupère toutes les photos d'un chantier
function recupererPhotosChantier(chantierId) {
  return getPhotosChantierStmt.all(chantierId);
}

// Récupère une photo de chantier par son ID
function recupererPhotoChantierParId(id) {
  return getPhotoChantierByIdStmt.get(id);
}

// Supprime une photo de chantier de la base de données
function supprimerPhotoChantier(id) {
  const resultat = deletePhotoChantierStmt.run(id);
  return resultat.changes > 0;
}

// Met à jour la description (légende) d'une photo de chantier
function mettreAJourDescriptionPhotoChantier(id, description) {
  const resultat = updatePhotoChantierDescriptionStmt.run({
    id,
    description: description || '',
  });
  return resultat.changes > 0;
}

// Compte le nombre de photos pour un chantier
function compterPhotosChantier(chantierId) {
  const resultat = db.prepare('SELECT COUNT(*) as count FROM photos_chantier WHERE chantier_id = ?').get(chantierId);
  return resultat.count;
}

// ============================================================
// Fonctions pour la gestion des chantiers
// ============================================================

// Prépare une requête pour insérer un chantier
const insertChantierStmt = db.prepare(`
  INSERT INTO chantiers (localisation)
  VALUES (@localisation)
`);

// Prépare une requête pour insérer une tâche liée à un chantier
const insertTacheStmt = db.prepare(`
  INSERT INTO taches_chantier (chantier_id, description)
  VALUES (@chantier_id, @description)
`);

// Prépare une requête pour insérer un matériel lié à un chantier
const insertMaterielStmt = db.prepare(`
  INSERT INTO materiels_chantier (chantier_id, nom, quantite, reference)
  VALUES (@chantier_id, @nom, @quantite, @reference)
`);

// Prépare une requête pour récupérer toutes les tâches d'un chantier
const getTachesByChantierStmt = db.prepare('SELECT * FROM taches_chantier WHERE chantier_id = ? ORDER BY id ASC');

// Prépare une requête pour récupérer tous les matériels d'un chantier
const getMaterielsByChantierStmt = db.prepare('SELECT * FROM materiels_chantier WHERE chantier_id = ? ORDER BY id ASC');

// Crée un chantier avec ses tâches et ses matériels dans une transaction
// data : { localisation, taches: [{description}], materiels: [{nom, quantite, reference}] }
// Retourne le chantier créé avec ses tâches et matériels
function creerChantier(data) {
  // Utilisation d'une transaction pour garantir l'intégrité des données
  const creer = db.transaction(() => {
    // Insertion du chantier
    const resultat = insertChantierStmt.run({
      localisation: data.localisation || '',
    });
    const chantierId = resultat.lastInsertRowid;

    // Insertion des tâches si présentes
    if (data.taches && data.taches.length > 0) {
      for (const tache of data.taches) {
        insertTacheStmt.run({
          chantier_id: chantierId,
          description: tache.description || '',
        });
      }
    }

    // Insertion des matériels si présents
    if (data.materiels && data.materiels.length > 0) {
      for (const materiel of data.materiels) {
        insertMaterielStmt.run({
          chantier_id: chantierId,
          nom: materiel.nom || '',
          quantite: materiel.quantite || 1,
          reference: materiel.reference || '',
        });
      }
    }

    return chantierId;
  });

  // Exécution de la transaction
  const id = creer();
  // Retourne le chantier complet avec ses relations
  return recupererChantierParId(id);
}

// Récupère tous les chantiers avec le nombre de tâches et de matériels
function recupererTousChantiers() {
  const chantiers = db.prepare('SELECT * FROM chantiers ORDER BY date_creation DESC').all();
  // Ajoute le compteur de tâches et de matériels pour chaque chantier
  for (const chantier of chantiers) {
    chantier.nb_taches = getTachesByChantierStmt.all(chantier.id).length;
    chantier.nb_materiels = getMaterielsByChantierStmt.all(chantier.id).length;
  }
  return chantiers;
}

// Récupère un chantier par son ID avec ses tâches et matériels
function recupererChantierParId(id) {
  const chantier = db.prepare('SELECT * FROM chantiers WHERE id = ?').get(id);
  if (!chantier) return null;
  // Ajoute les tâches et matériels associés
  chantier.taches = getTachesByChantierStmt.all(id);
  chantier.materiels = getMaterielsByChantierStmt.all(id);
  return chantier;
}

// Supprime un chantier, ses dépendances (cascade automatique) et les fichiers photos du disque
function supprimerChantier(id, uploadDir) {
  // Suppression des fichiers photos sur le disque avant la suppression en base
  try {
    const photos = recupererPhotosChantier(id);
    for (const photo of photos) {
      const filePath = path.join(uploadDir, photo.filename);
      try { require('fs').unlinkSync(filePath); } catch (e) {
        // Ignoré si le fichier n'existe plus
      }
    }
  } catch (e) {
    // Ignoré si la table n'existe pas encore
  }

  const resultat = db.prepare('DELETE FROM chantiers WHERE id = ?').run(id);
  return resultat.changes > 0;
}

// Met à jour un chantier complet (localisation + remplacement des tâches et matériels)
// data : { localisation, taches: [{description}], materiels: [{nom, quantite, reference}] }
function modifierChantier(id, data) {
  // Utilisation d'une transaction pour garantir l'intégrité des données
  const modifier = db.transaction(() => {
    // Mise à jour de la localisation du chantier
    db.prepare('UPDATE chantiers SET localisation = @localisation WHERE id = @id').run({
      id,
      localisation: data.localisation || '',
    });

    // Suppression de toutes les anciennes tâches et matériels
    db.prepare('DELETE FROM taches_chantier WHERE chantier_id = ?').run(id);
    db.prepare('DELETE FROM materiels_chantier WHERE chantier_id = ?').run(id);

    // Réinsertion des tâches
    if (data.taches && data.taches.length > 0) {
      for (const tache of data.taches) {
        insertTacheStmt.run({
          chantier_id: id,
          description: tache.description || '',
        });
      }
    }

    // Réinsertion des matériels
    if (data.materiels && data.materiels.length > 0) {
      for (const materiel of data.materiels) {
        insertMaterielStmt.run({
          chantier_id: id,
          nom: materiel.nom || '',
          quantite: materiel.quantite || 1,
          reference: materiel.reference || '',
        });
      }
    }
  });

  // Exécution de la transaction
  modifier();
  // Retourne le chantier mis à jour avec ses relations
  return recupererChantierParId(id);
}

// Marque un chantier comme terminé en mettant son statut à 'terminé'
function terminerChantier(id) {
  const stmt = db.prepare(`
    UPDATE chantiers SET statut = 'terminé' WHERE id = @id
  `);
  const resultat = stmt.run({ id });
  return resultat.changes > 0; // Retourne true si la mise à jour a été effectuée
}

// Bascule le statut d'une tâche (à faire → terminé ou terminé → à faire)
function toggleTacheStatut(id) {
  // Récupération de la tâche pour connaître son statut actuel
  const tache = db.prepare('SELECT * FROM taches_chantier WHERE id = ?').get(id);
  if (!tache) return null;

  // Inversion du statut
  const nouveauStatut = tache.statut === 'terminé' ? 'à faire' : 'terminé';
  db.prepare('UPDATE taches_chantier SET statut = @statut WHERE id = @id').run({
    id,
    statut: nouveauStatut,
  });

  // Retourne la tâche avec le nouveau statut
  return { ...tache, statut: nouveauStatut };
}

// Crée un token d'accusé de réception pour un rapport
function creerAccuse(type, refId) {
  const { v4: uuidv4 } = require('uuid');
  const token = uuidv4();
  db.prepare(`
    INSERT INTO accuses (type, ref_id, token) VALUES (@type, @refId, @token)
  `).run({ type, refId, token });
  return token;
}

// Marque un accusé comme confirmé (retourne true si confirmé, false si déjà fait ou token invalide)
function confirmerAccuse(token) {
  const accuse = db.prepare('SELECT * FROM accuses WHERE token = ?').get(token);
  if (!accuse) return null;
  if (accuse.confirme_le) return { dejaConfirme: true, confirme_le: accuse.confirme_le };
  db.prepare('UPDATE accuses SET confirme_le = datetime(\'now\') WHERE token = ?').run(token);
  return { dejaConfirme: false, confirme_le: new Date().toISOString() };
}

// Récupère l'état d'un accusé pour un type et ref_id donné
function recupererAccuse(type, refId) {
  const accuse = db.prepare('SELECT * FROM accuses WHERE type = ? AND ref_id = ?').get(type, refId);
  if (!accuse) return null;
  return { token: accuse.token, confirme_le: accuse.confirme_le, cree_le: accuse.cree_le };
}

// Récupère un accusé (rapport) à partir de son token
function recupererAccuseParToken(token) {
  if (typeof token !== 'string') return null;
  return db.prepare('SELECT * FROM accuses WHERE token = ?').get(token) || null;
}

// Vérifie qu'un fichier photo appartient bien au rapport (type + ref_id) donné.
// Sert à autoriser l'affichage des photos d'un rapport via son token, sans clé API.
function photoAppartientARapport(filename, type, refId) {
  if (!filename || typeof filename !== 'string') return false;
  if (type === 'intervention') {
    const photo = db.prepare('SELECT intervention_id FROM photos WHERE filename = ?').get(filename);
    return !!photo && photo.intervention_id === refId;
  }
  if (type === 'chantier') {
    const photo = db.prepare('SELECT chantier_id FROM photos_chantier WHERE filename = ?').get(filename);
    return !!photo && photo.chantier_id === refId;
  }
  return false;
}

// Cherche un produit par code-barres dans le cache local
function rechercherProduitParCode(codeBarre) {
  const produit = db.prepare('SELECT * FROM produits WHERE code_barre = ?').get(codeBarre);
  if (!produit) return null;
  db.prepare('UPDATE produits SET derniere_utilisation = datetime(\'now\') WHERE id = ?').run(produit.id);
  return { nom: produit.nom, reference: produit.reference };
}

// Sauvegarde un produit scanné dans le cache local (insert ou update)
function sauvegarderProduit(codeBarre, nom, reference) {
  db.prepare(`
    INSERT INTO produits (code_barre, nom, reference) VALUES (@codeBarre, @nom, @reference)
    ON CONFLICT(code_barre) DO UPDATE SET nom = @nom, reference = @reference, derniere_utilisation = datetime('now', 'localtime')
  `).run({ codeBarre, nom, reference });
  return { nom, reference };
}

// Export des fonctions pour les utiliser dans index.js
module.exports = {
  ajouterIntervention,
  recupererToutesInterventions,
  recupererInterventionParId,
  supprimerIntervention,
  modifierIntervention,
  terminerIntervention,
  mettreAJourAbyla,
  recupererInterventionsParAbyla,
  ajouterPhoto,
  recupererPhotos,
  recupererPhotoParId,
  supprimerPhoto,
  compterPhotos,
  ajouterPhotoChantier,
  recupererPhotosChantier,
  recupererPhotoChantierParId,
  supprimerPhotoChantier,
  mettreAJourDescriptionPhotoChantier,
  compterPhotosChantier,
  creerChantier,
  recupererTousChantiers,
  recupererChantierParId,
  supprimerChantier,
  modifierChantier,
  terminerChantier,
  toggleTacheStatut,
  creerAccuse,
  confirmerAccuse,
  recupererAccuse,
  recupererAccuseParToken,
  photoAppartientARapport,
  rechercherProduitParCode,
  sauvegarderProduit,
};
