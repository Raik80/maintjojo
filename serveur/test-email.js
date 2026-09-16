// Script de test pour le service d'envoi de mail
// Utilisation :
//   1. Configure d'abord le fichier .env (SMTP_USER, SMTP_PASS, MAIL_TO)
//   2. Lance le test : node test-email.js
//   3. Pour tester uniquement le PDF (sans envoyer de mail) : node test-email.js --pdf-only

require('dotenv').config();
const { genererPDF, envoyerRapport } = require('./services/emailService');

// === Données de test ===
const interventionTest = {
  id: 999,
  type: 'Électricité',
  batiment: 'Bâtiment A',
  etage: '2ème étage',
  entree: 'Entrée principale',
  description: 'Prise électrique défectueuse dans la salle de cours 204. Les étudiants ont signalé des étincelles en branchant un ordinateur.',
  statut: 'terminé',
  resolution: 'Remplacement complet de la prise électrique et vérification du disjoncteur. Installation conforme aux normes en vigueur.',
  date_creation: '2025-05-31 10:30:00',
};

// Photos simulées (on utilisera uniquement les fichiers qui existent)
const photosTest = [];

// === Test 1 : Génération du PDF uniquement ===
async function testPDF() {
  console.log('=== Test : Génération du PDF ===');
  try {
    const pdfBuffer = await genererPDF(interventionTest, photosTest);
    console.log(`✓ PDF généré avec succès (${(pdfBuffer.length / 1024).toFixed(1)} Ko)`);
    return pdfBuffer;
  } catch (erreur) {
    console.error('✗ Erreur génération PDF :', erreur.message);
    throw erreur;
  }
}

// === Test 2 : Envoi du mail complet (SMTP réel) ===
async function testEnvoi() {
  console.log('\n=== Test : Envoi du rapport par mail ===');

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('⚠  SMTP_USER ou SMTP_PASS non configurés dans .env');
    console.log('   Configure le fichier .env et relance le test.');
    console.log('   Test SMTP ignoré.');
    return;
  }

  if (!process.env.MAIL_TO) {
    console.log('⚠  MAIL_TO non configuré dans .env');
    console.log('   Ajoute l\'adresse du destinataire dans .env');
    return;
  }

  try {
    const resultat = await envoyerRapport(interventionTest, photosTest);
    console.log('✓ Rapport envoyé avec succès !');
    console.log(`  Message ID : ${resultat.messageId}`);
    console.log(`  Destinataire : ${process.env.MAIL_TO}`);
  } catch (erreur) {
    console.error('✗ Erreur envoi mail :', erreur.message);
    console.error('  Vérifie :');
    console.error('  - SMTP_USER et SMTP_PASS dans .env');
    console.error('  - Connexion à smtp.univ-lorraine.fr:587 (VPN UL nécessaire ?)');
  }
}

// === Test 3 : Test curl (à faire séparément avec le serveur) ===
function afficherInstructionsCurl() {
  console.log('\n=== Test via le serveur (curl) ===');
  console.log('1. Démarre le serveur : node index.js');
  console.log('2. Crée une intervention avec une résolution');
  console.log('3. Lance la requête :');
  console.log('   curl -X POST http://localhost:3000/api/interventions/<ID>/envoyer');
  console.log('');
  console.log('   Exemple avec l\'ID 1 :');
  console.log('   curl -X POST http://localhost:3000/api/interventions/1/envoyer');
}

// === Lancement ===
async function main() {
  const pdfOnly = process.argv.includes('--pdf-only');

  console.log('=== TEST SERVICE EMAIL MAINTJOJO ===\n');

  // Test 1 : PDF
  await testPDF();

  if (!pdfOnly) {
    // Test 2 : Envoi SMTP (nécessite .env configuré)
    await testEnvoi();
  } else {
    console.log('\n⚠  Mode --pdf-only : envoi SMTP ignoré');
  }

  // Test 3 : Instructions curl
  afficherInstructionsCurl();

  console.log('\n=== Fin des tests ===');
}

main().catch((erreur) => {
  console.error('\n✗ Test échoué :', erreur.message);
  process.exit(1);
});
