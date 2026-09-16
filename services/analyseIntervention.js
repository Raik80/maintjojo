// Liste des types d'intervention possibles avec leurs mots-clés associés
// Attention : les types les plus spécifiques doivent être en premier pour éviter les faux positifs
const TYPES_INTERVENTION = [
  { id: 'Disjonction prises', motsCles: ['disjonction prise', 'disjonction prises'] },
  { id: 'Disjonction éclairage', motsCles: ['disjonction éclairage', 'disjonction eclairage', 'disjonction lumière', 'disjonction lumiere'] },
  { id: 'Disjonction', motsCles: ['disjonction', 'disjoncteur', 'disjoncte'] },
  { id: 'Prise RJ45', motsCles: ['prise rj45', 'rj45', 'réseau', 'reseau', 'ethernet', 'internet'] },
  { id: 'Contrôle d\'accès', motsCles: ['contrôle d\'accès', 'contrôle d accès', 'controle d\'acces', 'controle d acces', 'badge', 'badges', 'portier', 'interphone', 'lecteur', 'uca', 'interphase ip', 'interface ip'] },
  { id: 'Lumière', motsCles: ['lumiere', 'lumières', 'lumière', 'lampes', 'lampe', 'éclairage', 'eclairage', 'néon', 'neon', 'pavé led', 'pave led', 'spots', 'downlight', 'ballast', 'radar', 'interrupteur', 'télérupteur', 'telerupteur', 'bouton', 'bouton poussoir', 'bouton poussoire'] },
  { id: 'Prises', motsCles: ['prise', 'prises'] },
];

// Liste des bâtiments avec leurs alias et entrées associées
const BATIMENTS = [
  { id: 'AIP' },
  { id: 'Atela' },
  { id: 'ESA' },
  { id: 'SSE' },
  { id: 'BU' },
  { id: 'IECL' },
  { id: 'Cryogénie' },
  { id: '1 cycle' },
  { id: 'Bâtiment A', entrees: ['1A', '2A', '3A', '4A', '5A'] },
  { id: 'Bâtiment B', entrees: ['1B', '2B', '3B', '4B'] },
  { id: 'Bâtiment C' },
  { id: 'Magasin Central' },
];

// Fonction pour détecter le type d'intervention à partir du texte
function extraireType(texte) {
  // Mise en minuscule du texte pour une comparaison insensible à la casse
  const texteBas = texte.toLowerCase();

  // Parcours de tous les types disponibles
  for (const type of TYPES_INTERVENTION) {
    // Vérifie si l'un des mots-clés du type est présent dans le texte
    const trouve = type.motsCles.some(mot => texteBas.includes(mot));
    if (trouve) {
      return type.id; // Retourne l'identifiant du type trouvé
    }
  }

  return 'Non spécifié'; // Aucun type trouvé
}

// Fonction pour extraire le numéro d'étage à partir du texte
function extraireEtage(texte) {
  // Mise en minuscule du texte
  const texteBas = texte.toLowerCase();

  // Cherche des motifs comme "étage 3", "etage 1", "rdc", "rez-de-chaussée"
  const motifs = [
    { regex: /étage\s*(\d+)/i, index: 1 }, // "étage 2"
    { regex: /etage\s*(\d+)/i, index: 1 }, // "etage 2" (sans accent)
    { regex: /niveau\s*(\d+)/i, index: 1 }, // "niveau 3"
    { regex: /\bn\s*(\d+)\b/i, index: 1 }, // "N3", "N 5"
    { regex: /\b(\d+)e?\s*étage\b/i, index: 1 }, // "3e étage"
    { regex: /\b(\d+)e?\s*etage\b/i, index: 1 }, // "3e etage"
    { regex: /\brdc\b/i, index: 0 }, // "rdc" -> rez-de-chaussée
    { regex: /rez[\s-]de[\s-]chaussée/i, index: 0 }, // "rez-de-chaussée"
    { regex: /rez[\s-]de[\s-]chaussee/i, index: 0 }, // "rez-de-chaussee"
    { regex: /sous[\s-]sol/i, index: 0 }, // "sous-sol"
  ];

  for (const motif of motifs) {
    const resultat = texteBas.match(motif.regex);
    if (resultat) {
      if (motif.index === 0) {
        // Mot-clé sans numéro (rdc, sous-sol)
        if (resultat[0].includes('rdc') || resultat[0].includes('rez')) return 'RDC';
        if (resultat[0].includes('sous-sol') || resultat[0].includes('sous sol')) return 'Sous-sol';
      } else {
        return resultat[motif.index]; // Retourne le numéro trouvé
      }
    }
  }

  return 'Non spécifié'; // Aucun étage trouvé
}

// Fonction pour trouver un bâtiment dans le texte
function trouverBatimentDansTexte(texteBas) {
  // Ordre de recherche : on vérifie d'abord les noms composés (plus longs) pour éviter les faux positifs
  // "1 cycle" doit être testé avant "cycle" seul
  const ordreRecherche = [
    { recherche: 'bâtiment a', id: 'Bâtiment A' },
    { recherche: 'batiment a', id: 'Bâtiment A' },
    { recherche: 'bât a', id: 'Bâtiment A' },
    { recherche: 'bat a', id: 'Bâtiment A' },
    { recherche: 'bâtiment b', id: 'Bâtiment B' },
    { recherche: 'batiment b', id: 'Bâtiment B' },
    { recherche: 'bât b', id: 'Bâtiment B' },
    { recherche: 'bat b', id: 'Bâtiment B' },
    { recherche: 'bâtiment c', id: 'Bâtiment C' },
    { recherche: 'batiment c', id: 'Bâtiment C' },
    { recherche: 'bât c', id: 'Bâtiment C' },
    { recherche: 'bat c', id: 'Bâtiment C' },
    { recherche: 'aip', id: 'AIP' },
    { recherche: 'atela', id: 'Atela' },
    { recherche: 'esa', id: 'ESA' },
    { recherche: 'sse', id: 'SSE' },
    { recherche: 'bu', id: 'BU' },
    { recherche: 'iecl', id: 'IECL' },
    { recherche: 'cryogénie', id: 'Cryogénie' },
    { recherche: 'cryogenie', id: 'Cryogénie' },
    { recherche: '1 cycle', id: '1 cycle' },
    { recherche: 'premier cycle', id: '1 cycle' },
    { recherche: 'batiment a', id: 'Bâtiment A' },
    { recherche: 'batiment b', id: 'Bâtiment B' },
    { recherche: 'batiment c', id: 'Bâtiment C' },
    { recherche: 'magasin central', id: 'Magasin Central' },
    { recherche: 'mag central', id: 'Magasin Central' },
  ];

  for (const entree of ordreRecherche) {
    if (texteBas.includes(entree.recherche)) {
      return entree.id; // Retourne l'identifiant du bâtiment trouvé
    }
  }

  return null; // Aucun bâtiment trouvé
}

// Fonction pour extraire le bâtiment à partir du texte
function extraireBatiment(texte) {
  // Mise en minuscule du texte
  const texteBas = texte.toLowerCase();

  // Cherche aussi les motifs comme "bâtiment X" où X peut être un mot quelconque
  const motifsRegex = [
    { regex: /bâtiment\s+(\w+)/i },
    { regex: /batiment\s+(\w+)/i },
    { regex: /bât\s+(\w+)/i },
    { regex: /bat\s+(\w+)/i },
  ];

  // Priorité à la recherche par nom de bâtiment dans la liste
  const batimentListe = trouverBatimentDansTexte(texteBas);
  if (batimentListe) {
    return batimentListe;
  }

  // Sinon, on essaie d'extraire par motif générique
  for (const motif of motifsRegex) {
    const resultat = texteBas.match(motif.regex);
    if (resultat) {
      return resultat[1].charAt(0).toUpperCase() + resultat[1].slice(1); // Retourne avec la première lettre en majuscule
    }
  }

  return 'Non spécifié'; // Aucun bâtiment trouvé
}

// Fonction pour extraire l'entrée à partir du texte et du bâtiment trouvé
function extraireEntree(texte, batiment) {
  // Mise en minuscule du texte
  const texteBas = texte.toLowerCase();

  // Liste des codes d'entrée possibles selon le bâtiment
  let codesEntrees = [];

  // Recherche du bâtiment dans la liste pour récupérer ses entrées associées
  const batimentTrouve = BATIMENTS.find(b => b.id === batiment);
  if (batimentTrouve && batimentTrouve.entrees) {
    codesEntrees = batimentTrouve.entrees;
  }

  // Cherche des motifs comme "entrée 1A", "entree 2B", ou directement "1A", "2A"
  if (codesEntrees.length > 0) {
    // Parcourt les codes d'entrée valides pour ce bâtiment
    for (const code of codesEntrees) {
      // Cherche "entrée X", "entree X", "porte X", ou juste le code
      const regexEntree = new RegExp(`(entrée\\s*${code}|entree\\s*${code}|porte\\s*${code}|\\b${code}\\b)`, 'i');
      if (regexEntree.test(texteBas)) {
        return code; // Retourne le code d'entrée trouvé
      }
    }
  } else {
    // Pour les bâtiments sans entrée définie, cherche quand même un code générique comme "entrée 1" ou "entrée A"
    const motifs = [
      { regex: /entrée\s*(\d+[a-z]?)/i, index: 1 },
      { regex: /entree\s*(\d+[a-z]?)/i, index: 1 },
      { regex: /porte\s*(\d+[a-z]?)/i, index: 1 },
    ];

    for (const motif of motifs) {
      const resultat = texteBas.match(motif.regex);
      if (resultat) {
        return resultat[motif.index].toUpperCase();
      }
    }
  }

  return 'Non spécifié'; // Aucune entrée trouvée
}

// Fonction principale qui analyse le texte et retourne un objet structuré
export function analyserIntervention(texte) {
  // Vérification que le texte n'est pas vide
  if (!texte || texte.trim() === '') {
    return {
      type: 'Non spécifié',
      etage: 'Non spécifié',
      batiment: 'Non spécifié',
      entree: 'Non spécifié',
      description: '', // Texte original vide
    };
  }

  // Extraction de chaque information
  const type = extraireType(texte);
  const etage = extraireEtage(texte);
  const batiment = extraireBatiment(texte);
  const entree = extraireEntree(texte, batiment);

  // Retourne l'objet structuré avec toutes les infos extraites
  return {
    type,
    etage,
    batiment,
    entree,
    description: texte.trim(), // On garde le texte original complet
  };
}
