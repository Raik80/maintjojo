// ============================================================
// Test de référence de l'analyse des interventions
// ------------------------------------------------
// Vérifie la détection du type, de l'étage, du bâtiment, de
// l'entrée et du poste sur un large jeu de phrases.
//
// Usage : node scripts/test-analyse-intervention.js
//
// Le module testé est en ESM ; il est importé via une data URL
// pour rester compatible avec l'exécution CommonJS.
// ============================================================

const fs = require('fs');
const path = require('path');

let nbOk = 0;
let nbKo = 0;

async function chargerModule() {
  const chemin = path.join(__dirname, '..', 'services', 'analyseIntervention.js');
  const source = fs.readFileSync(chemin, 'utf8');
  const url = 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
  return import(url);
}

// Cas de test : seul le champ attendu est vérifié
const CAS = [
  // --- Étages : RDC / RDJ ---
  { t: 'rdc', etage: 'RDC' },
  { t: 'RDC', etage: 'RDC' },
  { t: 'rez de chaussee', etage: 'RDC' },
  { t: 'rez-de-chaussée', etage: 'RDC' },
  { t: 'rez', etage: 'RDC' },
  { t: 'rdj', etage: 'RDJ' },
  { t: 'RDJ', etage: 'RDJ' },
  { t: 'rez de jardin', etage: 'RDJ' },

  // --- Étages : particuliers ---
  { t: 'mezzanine', etage: 'Mezzanine' },
  { t: 'entresol', etage: 'Entresol' },

  // --- Étages : sous-sol ---
  { t: 'sous-sol', etage: 'Sous-sol' },
  { t: 'sous sol', etage: 'Sous-sol' },
  { t: 'sous-sol 1', etage: 'Sous-sol 1' },
  { t: 'S1', etage: 'Sous-sol 1' },
  { t: '-1', etage: 'Sous-sol 1' },
  { t: 'niveau -1', etage: 'Sous-sol 1' },
  { t: 'SS', etage: 'Sous-sol' },

  // --- Étages : R+x ---
  { t: 'R+1', etage: '1' },
  { t: 'R+2', etage: '2' },

  // --- Étages : étage / niveau / N ---
  { t: 'etage 3', etage: '3' },
  { t: 'étage 3', etage: '3' },
  { t: 'niveau 3', etage: '3' },
  { t: 'N3', etage: '3' },
  { t: 'N 5', etage: '5' },
  { t: '3e étage', etage: '3' },
  { t: '3ème étage', etage: '3' },
  { t: '3eme étage', etage: '3' },
  { t: '3ieme etage', etage: '3' },
  { t: '3ième étage', etage: '3' },
  { t: '1er étage', etage: '1' },
  { t: '1ère étage', etage: '1' },
  { t: '2nd étage', etage: '2' },
  { t: 'au 3', etage: '3' },
  { t: 'bât A 3ème étage', etage: '3' },
  { t: '1er', etage: '1' },
  { t: '2eme', etage: '2' },
  { t: '3e', etage: '3' },
  { t: 'S2', etage: 'Sous-sol 2' },
  { t: 'niveau -2', etage: 'Sous-sol 2' },
  { t: 'R + 1', etage: '1' },
  { t: 'ÉTAGE 3 BÂTIMENT A', etage: '3', batiment: 'Bâtiment A' },

  // --- Bâtiments (dont anti-faux-positifs) ---
  { t: 'probleme bureau', batiment: 'Non spécifié' },
  { t: 'rez de chaussee', batiment: 'Non spécifié' },
  { t: 'intervention aip', batiment: 'AIP' },
  { t: 'batiment a', batiment: 'Bâtiment A' },
  { t: 'bat B', batiment: 'Bâtiment B' },
  { t: 'magasin central', batiment: 'Magasin Central' },
  { t: 'probleme 1 cycle', batiment: '1 cycle' },
  { t: 'cryogénie', batiment: 'Cryogénie' },
  { t: 'armoire iecl', batiment: 'IECL' },

  // --- Types ---
  { t: 'disjonction prise', type: 'Disjonction prises' },
  { t: 'disjonction eclairage', type: 'Disjonction éclairage' },
  { t: 'disjoncteur', type: 'Disjonction' },
  { t: 'prise rj45', type: 'Prise RJ45' },
  { t: 'probleme reseau', type: 'Prise RJ45' },
  { t: 'controle d acces', type: 'Contrôle d\'accès' },
  { t: 'contrôle d\'accès', type: 'Contrôle d\'accès' },
  { t: 'badge hs', type: 'Contrôle d\'accès' },
  { t: 'lumiere couloir', type: 'Lumière' },
  { t: 'eclairage salle', type: 'Lumière' },
  { t: 'remplacement prises', type: 'Prises' },
  { t: 'depannage telephone', type: 'Téléphonie' },
  { t: 'incident SIP', type: 'Téléphonie' },
  { t: 'poste numerique', type: 'Téléphonie' },
  { t: 'anomalie poste', type: 'Téléphonie' },
  { t: 'annomalie poste', type: 'Téléphonie' },

  // --- Entrées ---
  { t: 'entrée 1A batiment A', entree: '1A' },
  { t: 'porte 2B batiment B', entree: '2B' },
  { t: 'entree 3', entree: '3' },

  // --- Poste téléphonique ---
  { t: 'poste 45043', type: 'Téléphonie', telephone: '45043' },
  { t: '45043', type: 'Téléphonie', telephone: '45043' },
  { t: 'disjonction 45043', type: 'Disjonction', telephone: '' },
  { t: 'prise 45043', type: 'Prises', telephone: '' },
  { t: 'telephone 4512', telephone: '' },

  // --- Cas complets ---
  {
    t: 'depannage telephone poste 45043 batiment A entree 1A etage 3',
    type: 'Téléphonie', etage: '3', batiment: 'Bâtiment A', entree: '1A', telephone: '45043',
  },
  {
    t: 'remplacement prise 3ème étage batiment A',
    type: 'Prises', etage: '3', batiment: 'Bâtiment A',
  },
  {
    t: 'probleme R+1',
    etage: '1',
  },
  {
    t: 'probleme RDJ',
    etage: 'RDJ',
  },
];

async function main() {
  console.log('\n=== TEST ANALYSE INTERVENTION ===\n');
  const { analyserIntervention } = await chargerModule();

  const champs = ['type', 'etage', 'batiment', 'entree', 'telephone'];

  for (const cas of CAS) {
    const fiche = analyserIntervention(cas.t);
    const attendus = champs.filter(c => cas[c] !== undefined);
    const echecs = attendus.filter(c => fiche[c] !== cas[c]);

    if (echecs.length === 0) {
      nbOk++;
      console.log(`  ✓ ${JSON.stringify(cas.t)}`);
    } else {
      nbKo++;
      const details = echecs.map(c => `${c}: attendu « ${cas[c]} » reçu « ${fiche[c]} »`).join(' | ');
      console.log(`  ✗ ${JSON.stringify(cas.t)} → ${details}`);
    }
  }

  console.log(`\n=== RÉSULTAT : ${nbOk} OK, ${nbKo} KO ===\n`);
  process.exit(nbKo === 0 ? 0 : 1);
}

main().catch((erreur) => {
  console.error('\nErreur pendant le test :', erreur);
  process.exit(1);
});
