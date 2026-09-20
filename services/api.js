import { File } from 'expo-file-system';

// URL de base du serveur (URL fixe Tailscale Funnel)
const BASE_URL = 'https://maintjojo-serveur.tailce5b78.ts.net';

// Clé API partagée avec le serveur (doit correspondre à API_KEY dans .env du serveur)
// Chargée depuis le fichier .env à la racine (EXPO_PUBLIC_API_KEY) — jamais en dur dans le code
const API_KEY = process.env.EXPO_PUBLIC_API_KEY;
if (!API_KEY) {
  throw new Error(
    'EXPO_PUBLIC_API_KEY manquante. Crée un fichier .env à la racine avec ' +
    'EXPO_PUBLIC_API_KEY=<même valeur que API_KEY dans serveur/.env>'
  );
}

// Helper d'appel sécurisé : injecte automatiquement la clé API dans toutes les requêtes
async function authFetch(url, options = {}) {
  const headers = {
    ...(options.headers || {}),
    'x-api-key': API_KEY,
  };
  return fetch(url, { ...options, headers });
}

// Export de BASE_URL (et de la clé API pour les requêtes WebView) 
export { BASE_URL, API_KEY };

// Fonction utilitaire pour gérer les réponses de l'API
async function handleResponse(response) {
  // Si la réponse n'est pas OK (hors 2xx), on lance une erreur
  if (!response.ok) {
    const erreur = await response.json().catch(() => ({ erreur: 'Erreur inconnue' }));
    throw new Error(erreur.erreur || `Erreur HTTP ${response.status}`);
  }
  // Retourne les données JSON de la réponse
  return response.json();
}

// Envoie une intervention au serveur pour la sauvegarder
export async function envoyerIntervention(fiche) {
  try {
    // Requête POST vers l'API avec les données de l'intervention
    const response = await authFetch(`${BASE_URL}/api/interventions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // Indique qu'on envoie du JSON
      },
      body: JSON.stringify(fiche), // Conversion de l'objet en JSON
    });

    // Retourne l'intervention créée (avec son ID et sa date)
    return await handleResponse(response);
  } catch (erreur) {
    // En cas d'erreur réseau ou serveur, on relance l'erreur
    throw new Error(`Impossible d'enregistrer l'intervention: ${erreur.message}`);
  }
}

// Récupère la liste de toutes les interventions depuis le serveur
export async function recupererInterventions() {
  try {
    // Requête GET vers l'API
    const response = await authFetch(`${BASE_URL}/api/interventions`);
    // Retourne la liste des interventions
    return await handleResponse(response);
  } catch (erreur) {
    throw new Error(`Impossible de récupérer les interventions: ${erreur.message}`);
  }
}

// Récupère une intervention spécifique par son ID
export async function recupererInterventionParId(id) {
  try {
    const response = await authFetch(`${BASE_URL}/api/interventions/${id}`);
    return await handleResponse(response);
  } catch (erreur) {
    throw new Error(`Impossible de récupérer l'intervention: ${erreur.message}`);
  }
}

// Modifie une intervention existante par son ID
export async function modifierIntervention(id, fiche) {
  try {
    const response = await authFetch(`${BASE_URL}/api/interventions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fiche),
    });
    return await handleResponse(response);
  } catch (erreur) {
    throw new Error(`Impossible de modifier l'intervention: ${erreur.message}`);
  }
}

// Marque une intervention comme terminée avec une résolution
export async function terminerIntervention(id, resolution) {
  try {
    const response = await authFetch(`${BASE_URL}/api/interventions/${id}/terminer`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution }),
    });
    return await handleResponse(response);
  } catch (erreur) {
    throw new Error(`Impossible de terminer l'intervention: ${erreur.message}`);
  }
}

// Met à jour uniquement le numéro Abyla (pièce) d'une intervention
export async function modifierAbyla(id, abyla) {
  try {
    const response = await authFetch(`${BASE_URL}/api/interventions/${id}/abyla`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ abyla }),
    });
    return await handleResponse(response);
  } catch (erreur) {
    throw new Error(`Impossible de mettre à jour le numéro de pièce: ${erreur.message}`);
  }
}

// Récupère l'historique des interventions liées à une pièce (numéro Abyla)
export async function recupererInterventionsParAbyla(abyla) {
  try {
    const response = await authFetch(`${BASE_URL}/api/interventions?abyla=${encodeURIComponent(abyla)}`);
    return await handleResponse(response);
  } catch (erreur) {
    throw new Error(`Impossible de récupérer l'historique de la pièce: ${erreur.message}`);
  }
}

// Supprime une intervention par son ID
export async function supprimerIntervention(id) {
  try {
    const response = await authFetch(`${BASE_URL}/api/interventions/${id}`, {
      method: 'DELETE',
    });
    return await handleResponse(response);
  } catch (erreur) {
    throw new Error(`Impossible de supprimer l'intervention: ${erreur.message}`);
  }
}

// Upload d'une photo vers le serveur pour une intervention donnée
// interventionId : ID de l'intervention concernée
// imageUri : URI locale de l'image sur l'appareil
// description : légende optionnelle de la photo
export async function uploadPhoto(interventionId, imageUri, description) {
  try {
    // Construction du FormData pour l'envoi multipart (image + description)
    const formData = new FormData();

    // Le fetch d'Expo (SDK 54+) n'accepte plus l'ancien format React Native
    // { uri, name, type }. On envoie directement un objet File (nom + type MIME).
    // (Le Blob de React Native ne supporte pas les ArrayBuffer, donc on ne
    // construit pas de Blob à partir des octets.)
    formData.append('image', new File(imageUri));
    formData.append('description', description || '');

    const response = await authFetch(`${BASE_URL}/api/interventions/${interventionId}/photos`, {
      method: 'POST',
      body: formData,
    });
    return await handleResponse(response);
  } catch (erreur) {
    throw new Error(`Impossible d'uploader la photo: ${erreur.message}`);
  }
}

// Récupère la liste des photos d'une intervention (retourne les URLs complètes)
export async function fetchPhotos(interventionId) {
  try {
    const response = await authFetch(`${BASE_URL}/api/interventions/${interventionId}/photos`);
    return await handleResponse(response);
  } catch (erreur) {
    throw new Error(`Impossible de récupérer les photos: ${erreur.message}`);
  }
}

// Envoie le rapport d'une intervention par mail (PDF généré côté serveur)
export async function envoyerRapportParMail(id) {
  try {
    const response = await authFetch(`${BASE_URL}/api/interventions/${id}/envoyer`, {
      method: 'POST',
    });
    return await handleResponse(response);
  } catch (erreur) {
    throw new Error(`Impossible d'envoyer le rapport: ${erreur.message}`);
  }
}

// Vérifie si le responsable a confirmé la réception du rapport
export async function recupererStatutAccuse(type, refId) {
  try {
    const response = await authFetch(`${BASE_URL}/api/accuse/statut/${type}/${refId}`);
    return await handleResponse(response);
  } catch (erreur) {
    return { existe: false };
  }
}

// Recherche le nom associé à un poste téléphonique dans l'annuaire UL
// Retourne { trouve, personnes: [...] }
export async function rechercherAnnuaireParPoste(poste) {
  try {
    const response = await authFetch(`${BASE_URL}/api/annuaire/${poste}`);
    return await handleResponse(response);
  } catch (erreur) {
    return { trouve: false, personnes: [] };
  }
}

// ============================================================
// Fonctions pour la gestion des chantiers
// ============================================================

// Crée un chantier avec ses tâches et matériels
// data : { localisation, taches: [{description}], materiels: [{nom, quantite, reference}] }
export async function creerChantier(data) {
  try {
    const response = await authFetch(`${BASE_URL}/api/chantiers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return await handleResponse(response);
  } catch (erreur) {
    throw new Error(`Impossible de créer le chantier: ${erreur.message}`);
  }
}

// Récupère la liste de tous les chantiers
export async function recupererChantiers() {
  try {
    const response = await authFetch(`${BASE_URL}/api/chantiers`);
    return await handleResponse(response);
  } catch (erreur) {
    throw new Error(`Impossible de récupérer les chantiers: ${erreur.message}`);
  }
}

// Récupère un chantier spécifique par son ID (avec tâches et matériels)
export async function recupererChantierParId(id) {
  try {
    const response = await authFetch(`${BASE_URL}/api/chantiers/${id}`);
    return await handleResponse(response);
  } catch (erreur) {
    throw new Error(`Impossible de récupérer le chantier: ${erreur.message}`);
  }
}

// Supprime un chantier par son ID
export async function supprimerChantier(id) {
  try {
    const response = await authFetch(`${BASE_URL}/api/chantiers/${id}`, {
      method: 'DELETE',
    });
    return await handleResponse(response);
  } catch (erreur) {
    throw new Error(`Impossible de supprimer le chantier: ${erreur.message}`);
  }
}

// Modifie un chantier existant (localisation, tâches et matériels)
// data : { localisation, taches: [{description}], materiels: [{nom, quantite, reference}] }
export async function modifierChantier(id, data) {
  try {
    const response = await authFetch(`${BASE_URL}/api/chantiers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return await handleResponse(response);
  } catch (erreur) {
    throw new Error(`Impossible de modifier le chantier: ${erreur.message}`);
  }
}

// Bascule le statut d'une tâche (à faire ↔ terminé)
export async function toggleTacheStatut(chantierId, tacheId) {
  try {
    const response = await authFetch(`${BASE_URL}/api/chantiers/${chantierId}/taches/${tacheId}`, {
      method: 'PATCH',
    });
    return await handleResponse(response);
  } catch (erreur) {
    throw new Error(`Impossible de mettre à jour la tâche: ${erreur.message}`);
  }
}

// Marque un chantier comme terminé
export async function terminerChantier(id) {
  try {
    const response = await authFetch(`${BASE_URL}/api/chantiers/${id}/terminer`, {
      method: 'PATCH',
    });
    return await handleResponse(response);
  } catch (erreur) {
    throw new Error(`Impossible de terminer le chantier: ${erreur.message}`);
  }
}

// Envoie le rapport d'un chantier par mail (PDF généré côté serveur)
export async function envoyerRapportChantierParMail(id) {
  try {
    const response = await authFetch(`${BASE_URL}/api/chantiers/${id}/envoyer`, {
      method: 'POST',
    });
    return await handleResponse(response);
  } catch (erreur) {
    throw new Error(`Impossible d'envoyer le rapport: ${erreur.message}`);
  }
}

// Supprime une photo par son ID (supprime aussi le fichier sur le serveur)
export async function deletePhoto(photoId) {
  try {
    const response = await authFetch(`${BASE_URL}/api/photos/${photoId}`, {
      method: 'DELETE',
    });
    return await handleResponse(response);
  } catch (erreur) {
    throw new Error(`Impossible de supprimer la photo: ${erreur.message}`);
  }
}

// Upload d'une photo vers le serveur pour un chantier donné
// chantierId : ID du chantier concerné
// imageUri : URI locale de l'image sur l'appareil
// description : légende optionnelle de la photo
export async function uploadPhotoChantier(chantierId, imageUri, description) {
  try {
    // Construction du FormData pour l'envoi multipart (image + description)
    const formData = new FormData();

    // Le fetch d'Expo (SDK 54+) n'accepte plus l'ancien format React Native
    // { uri, name, type }. On envoie directement un objet File (nom + type MIME).
    // (Le Blob de React Native ne supporte pas les ArrayBuffer, donc on ne
    // construit pas de Blob à partir des octets.)
    formData.append('image', new File(imageUri));
    formData.append('description', description || '');

    const response = await authFetch(`${BASE_URL}/api/chantiers/${chantierId}/photos`, {
      method: 'POST',
      body: formData,
    });
    return await handleResponse(response);
  } catch (erreur) {
    throw new Error(`Impossible d'uploader la photo chantier: ${erreur.message}`);
  }
}

// Récupère la liste des photos d'un chantier (retourne les URLs complètes)
export async function fetchPhotosChantier(chantierId) {
  try {
    const response = await authFetch(`${BASE_URL}/api/chantiers/${chantierId}/photos`);
    return await handleResponse(response);
  } catch (erreur) {
    throw new Error(`Impossible de récupérer les photos chantier: ${erreur.message}`);
  }
}

// Met à jour la description d'une photo de chantier
export async function updateDescriptionPhotoChantier(photoId, description) {
  try {
    const response = await authFetch(`${BASE_URL}/api/chantiers/photos/${photoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    });
    return await handleResponse(response);
  } catch (erreur) {
    throw new Error(`Impossible de mettre à jour la description: ${erreur.message}`);
  }
}

// Supprime une photo de chantier par son ID (supprime aussi le fichier sur le serveur)
export async function deletePhotoChantier(photoId) {
  try {
    const response = await authFetch(`${BASE_URL}/api/chantiers/photos/${photoId}`, {
      method: 'DELETE',
    });
    return await handleResponse(response);
  } catch (erreur) {
    throw new Error(`Impossible de supprimer la photo chantier: ${erreur.message}`);
  }
}

// Interroge l'API serveur pour trouver un produit par code-barres (cache local)
export async function rechercherProduitParCodeBarre(code) {
  try {
    const response = await authFetch(`${BASE_URL}/api/produits/barcode/${code}`);
    return await handleResponse(response);
  } catch (erreur) {
    throw new Error(`Erreur recherche produit: ${erreur.message}`);
  }
}

// Sauvegarde un produit scanné dans le cache du serveur
export async function sauvegarderProduitScanne(code, nom, reference) {
  try {
    const response = await authFetch(`${BASE_URL}/api/produits/barcode/${code}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, reference }),
    });
    return await handleResponse(response);
  } catch (erreur) {
    throw new Error(`Erreur sauvegarde produit: ${erreur.message}`);
  }
}
