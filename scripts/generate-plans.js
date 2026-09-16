// ============================================================
// Script de génération des fichiers HTML de plans interactifs
// 
// Prend chaque fichier HTML source (RDC.html, RDJ.html, etc.)
// qui contient le SVG avec les pièces détectées + les données ROOMS,
// et génère des fichiers HTML auto-suffisants (plan-RDC.html, etc.)
// en les injectant dans le template interactif.
//
// Usage : node scripts/generate-plans.js
// ============================================================

const fs = require('fs');
const path = require('path');

// Dossier contenant les fichiers source et le template
const plansDir = path.join(__dirname, '..', 'serveur', 'public', 'plans');

// Charge le template HTML interactif
const template = fs.readFileSync(path.join(plansDir, 'template.html'), 'utf8');

// Liste des étages : ID, fichier source, libellé
const floors = [
  { id: 'RDC', file: 'RDC.html',       label: 'Rez-de-chaussée' },
  { id: 'RDJ', file: 'RDJ.html',       label: 'Rez-de-jardin' },
  { id: '1',   file: '1 etages.html',  label: '1er étage' },
  { id: '2',   file: '2 etage.html',   label: '2ème étage' },
  { id: '3',   file: '3 etages.html',  label: '3ème étage' },
  { id: '4',   file: '4 etages.html',  label: '4ème étage' },
];

floors.forEach(floor => {
  // Lit le fichier HTML source (contient le SVG inline + const ROOMS = [...])
  const src = fs.readFileSync(path.join(plansDir, floor.file), 'utf8');

  // Extrait le SVG complet (du premier <svg> au </svg>)
  const svgMatch = src.match(/<svg[\s\S]*?<\/svg>/);
  if (!svgMatch) {
    console.log(`[${floor.id}] ERREUR : SVG introuvable dans ${floor.file}`);
    return;
  }
  const svg = svgMatch[0];

  // Extrait les données des pièces (const ROOMS = [...];)
  const roomsMatch = src.match(/const ROOMS\s*=\s*(\[[\s\S]*?\]);/);
  if (!roomsMatch) {
    console.log(`[${floor.id}] ERREUR : ROOMS introuvable dans ${floor.file}`);
    return;
  }
  const rooms = roomsMatch[1];

  // Injecte le SVG et les ROOMS dans le template
  const output = template
    .replace('%%SVG%%', svg)
    .replace('%%ROOMS%%', rooms);

  // Écrit le fichier HTML auto-suffisant
  const outFile = path.join(plansDir, `plan-${floor.id}.html`);
  fs.writeFileSync(outFile, output);
  console.log(`[${floor.id}] OK → plan-${floor.id}.html (${(output.length / 1024).toFixed(0)} KB)`);
});

console.log('Génération terminée !');