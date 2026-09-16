// ============================================================
// Test de fumée de l'API MaintJojo
// ------------------------------------------------
// Vérifie que l'API répond correctement (création, lecture,
// modification, suppression, photos, chantiers, sécurité).
// Le serveur doit être démarré avant de lancer ce script.
//
//   node smoke-test.js
//
// Le script nettoie les données qu'il crée.
// ============================================================

require('dotenv').config();

const PORT = require('./config').PORT;
const API_KEY = require('./config').API_KEY;
const { creerAccuse } = require('./database');
const BASE = `http://localhost:${PORT}`;

const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

const JPEG_1x1 = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==',
  'base64'
);

let nbOk = 0;
let nbKo = 0;

function verifier(nom, condition, detail) {
  if (condition) {
    nbOk++;
    console.log(`  ✓ ${nom}`);
  } else {
    nbKo++;
    console.log(`  ✗ ${nom}${detail ? ' → ' + detail : ''}`);
  }
}

async function appel(path, { method = 'GET', key = API_KEY, json, form } = {}) {
  const headers = {};
  if (key) headers['x-api-key'] = key;
  let body;
  if (json) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form) {
    body = form;
  }
  const res = await fetch(BASE + path, { method, headers, body });
  const type = res.headers.get('content-type') || '';
  const data = type.includes('application/json') ? await res.json() : await res.text();
  return { status: res.status, data, headers: res.headers };
}

async function main() {
  console.log(`\n=== SMOKE TEST API (${BASE}) ===\n`);
  const cree = { interventionId: null, photoId: null, chantierId: null };

  try {
    console.log('Authentification');
    const sansCle = await appel('/api/interventions', { key: null });
    verifier('Accès refusé sans clé (401)', sansCle.status === 401, `reçu ${sansCle.status}`);
    const avecCle = await appel('/api/interventions');
    verifier('Accès autorisé avec clé (200)', avecCle.status === 200, `reçu ${avecCle.status}`);

    console.log('\nEn-têtes de sécurité');
    verifier('X-Content-Type-Options présent', !!avecCle.headers.get('x-content-type-options'));
    verifier('Content-Security-Policy présente', !!avecCle.headers.get('content-security-policy'));

    console.log('\nRoutes publiques / protégées');
    const statutSansCle = await appel('/api/accuse/statut/intervention/1', { key: null });
    verifier('Statut accusé protégé sans clé (401)', statutSansCle.status === 401, `reçu ${statutSansCle.status}`);
    const accusePublic = await appel('/api/accuse/00000000-0000-0000-0000-000000000000', { key: null });
    verifier('Lien d\'accusé public accessible (200)', accusePublic.status === 200, `reçu ${accusePublic.status}`);

    const planSansCle = await appel('/public/plans/plan-RDJ.html', { key: null });
    verifier('Plan protégé sans clé (401)', planSansCle.status === 401, `reçu ${planSansCle.status}`);
    const planAvecCle = await appel('/public/plans/plan-RDJ.html');
    verifier('Plan accessible avec clé (200)', planAvecCle.status === 200, `reçu ${planAvecCle.status}`);

    console.log('\nInterventions');
    const creation = await appel('/api/interventions', {
      method: 'POST',
      json: { type: 'Test', batiment: 'Bâtiment Test', etage: 'RDC', entree: 'A', description: 'Smoke test' },
    });
    cree.interventionId = creation.data && creation.data.id;
    verifier('Création intervention (201)', creation.status === 201, `reçu ${creation.status}`);

    const lecture = await appel(`/api/interventions/${cree.interventionId}`);
    verifier('Lecture intervention (200)', lecture.status === 200 && lecture.data.id === cree.interventionId);

    const modif = await appel(`/api/interventions/${cree.interventionId}`, {
      method: 'PUT',
      json: { type: 'Test modifié', batiment: 'Bâtiment Test', etage: 'RDC', entree: 'A', description: 'Smoke test modifié' },
    });
    verifier('Modification intervention (200)', modif.status === 200 && modif.data.type === 'Test modifié');

    const fin = await appel(`/api/interventions/${cree.interventionId}/terminer`, {
      method: 'PATCH',
      json: { resolution: 'Résolution de test' },
    });
    verifier('Clôture intervention (200)', fin.status === 200 && fin.data.statut === 'terminé');

    console.log('\nPhotos');
    const formPng = new FormData();
    formPng.append('image', new Blob([PNG_1x1], { type: 'image/png' }), 'test.png');
    formPng.append('description', 'Photo PNG');
    const uploadPng = await appel(`/api/interventions/${cree.interventionId}/photos`, { method: 'POST', form: formPng });
    cree.photoId = uploadPng.data && uploadPng.data.id;
    verifier('Upload photo PNG (201)', uploadPng.status === 201, `reçu ${uploadPng.status} ${JSON.stringify(uploadPng.data)}`);

    const formJpg = new FormData();
    formJpg.append('image', new Blob([JPEG_1x1], { type: 'image/jpeg' }), 'camera.jpg');
    const uploadJpg = await appel(`/api/interventions/${cree.interventionId}/photos`, { method: 'POST', form: formJpg });
    verifier('Upload photo JPEG (201)', uploadJpg.status === 201, `reçu ${uploadJpg.status}`);

    const formFaux = new FormData();
    formFaux.append('image', new Blob([Buffer.from('<html><script>alert(1)</script></html>')], { type: 'image/jpeg' }), 'piege.html');
    const uploadFaux = await appel(`/api/interventions/${cree.interventionId}/photos`, { method: 'POST', form: formFaux });
    verifier('Fichier .html déguisé accepté mais stocké en image (201)', uploadFaux.status === 201, `reçu ${uploadFaux.status}`);

    // Partie multipart sans en-tête Content-Type (comme certains clients mobiles) :
    // le serveur doit se fier à l'extension .jpg du nom de fichier.
    const boundary = '----SmokeTestBoundary1234567890';
    const corpsBrut =
      `--${boundary}\r\n` +
      'Content-Disposition: form-data; name="image"; filename="photo.jpg"\r\n' +
      '\r\n' +
      'donnees-jpeg-fictives' +
      `\r\n--${boundary}--\r\n`;
    const uploadSansType = await fetch(`${BASE}/api/interventions/${cree.interventionId}/photos`, {
      method: 'POST',
      headers: { 'x-api-key': API_KEY, 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body: corpsBrut,
    });
    verifier('Upload sans type MIME mais extension .jpg (201)', uploadSansType.status === 201, `reçu ${uploadSansType.status}`);

    const photos = await appel(`/api/interventions/${cree.interventionId}/photos`);
    verifier('Liste photos (200, >= 3)', photos.status === 200 && Array.isArray(photos.data) && photos.data.length >= 3);

    const photoJpg = (photos.data || []).find(p => p.filename && p.filename.endsWith('.jpg'));
    if (photoJpg) {
      const img = await fetch(photoJpg.url, { headers: { 'x-api-key': API_KEY } });
      const ct = img.headers.get('content-type') || '';
      const nosniff = img.headers.get('x-content-type-options') || '';
      verifier('Photo servie avec clé (200)', img.status === 200, `reçu ${img.status}`);
      verifier('Non exécutable (image/* + nosniff)', ct.startsWith('image/') && nosniff === 'nosniff', `content-type=${ct}, nosniff=${nosniff}`);
    }

    console.log('\nPhotos via token (liens PDF)');
    const token = creerAccuse('intervention', cree.interventionId);
    const nomFichier = photos.data[0].filename;
    const avecToken = await appel(`/uploads/${nomFichier}?t=${token}`, { key: null });
    verifier('Photo accessible via token sans clé (200)', avecToken.status === 200, `reçu ${avecToken.status}`);
    const tokenInvalide = await appel(`/uploads/${nomFichier}?t=00000000-0000-0000-0000-000000000000`, { key: null });
    verifier('Token invalide refusé (401)', tokenInvalide.status === 401, `reçu ${tokenInvalide.status}`);
    const fichierEtranger = await appel('/uploads/photo-inexistant.jpg?t=' + token, { key: null });
    verifier('Fichier hors rapport refusé (401)', fichierEtranger.status === 401, `reçu ${fichierEtranger.status}`);
    const sansToken = await appel(`/uploads/${nomFichier}`, { key: null });
    verifier('Photo sans token ni clé refusée (401)', sansToken.status === 401, `reçu ${sansToken.status}`);

    if (cree.photoId) {
      const supprPhoto = await appel(`/api/photos/${cree.photoId}`, { method: 'DELETE' });
      verifier('Suppression photo (200)', supprPhoto.status === 200, `reçu ${supprPhoto.status}`);
    }

    console.log('\nChantiers');
    const chantier = await appel('/api/chantiers', {
      method: 'POST',
      json: {
        localisation: 'Localisation test',
        taches: [{ description: 'Tâche 1' }, { description: 'Tâche 2' }],
        materiels: [{ nom: 'Vis', quantite: 10, reference: 'REF-1' }],
      },
    });
    cree.chantierId = chantier.data && chantier.data.id;
    verifier('Création chantier (201)', chantier.status === 201, `reçu ${chantier.status}`);

    const chantierLu = await appel(`/api/chantiers/${cree.chantierId}`);
    verifier('Lecture chantier avec tâches (200)', chantierLu.status === 200 && (chantierLu.data.taches || []).length === 2);

    const tacheId = chantierLu.data.taches[0].id;
    const toggle = await appel(`/api/chantiers/${cree.chantierId}/taches/${tacheId}`, { method: 'PATCH' });
    verifier('Bascule tâche (200)', toggle.status === 200 && toggle.data.statut === 'terminé');

    const finChantier = await appel(`/api/chantiers/${cree.chantierId}/terminer`, { method: 'PATCH' });
    verifier('Clôture chantier (200)', finChantier.status === 200 && finChantier.data.statut === 'terminé');

    console.log('\nNettoyage');
    const supprChantier = await appel(`/api/chantiers/${cree.chantierId}`, { method: 'DELETE' });
    verifier('Suppression chantier (200)', supprChantier.status === 200, `reçu ${supprChantier.status}`);
    const supprIntervention = await appel(`/api/interventions/${cree.interventionId}`, { method: 'DELETE' });
    verifier('Suppression intervention (200)', supprIntervention.status === 200, `reçu ${supprIntervention.status}`);
  } catch (erreur) {
    console.error('\nErreur pendant le test :', erreur.message);
    nbKo++;
  }

  console.log(`\n=== RÉSULTAT : ${nbOk} OK, ${nbKo} KO ===\n`);
  process.exit(nbKo === 0 ? 0 : 1);
}

main();
