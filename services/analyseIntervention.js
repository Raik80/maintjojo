// ============================================================
// Analyse d'une description d'intervention
// ------------------------------------------------------------
// Extrait automatiquement le type, l'étage, le bâtiment,
// l'entrée et le poste téléphonique à partir du texte saisi.
//
// Toute l'analyse s'appuie sur une normalisation préalable
// (minuscules, sans accents, séparateurs uniformisés) pour être
// robuste aux différentes façons d'écrire (3ème / 3eme / 3e...).
// ============================================================

// Liste des types d'intervention possibles avec leurs mots-clés associés
// (mots-clés normalisés : minuscules, sans accent).
// Attention : les types les plus spécifiques doivent être en premier.
const TYPES_INTERVENTION = [
  { id: 'Disjonction prises', motsCles: ['disjonction prise', 'disjonction prises'] },
  { id: 'Disjonction éclairage', motsCles: ['disjonction eclairage', 'disjonction lumiere'] },
  { id: 'Disjonction', motsCles: ['disjonct'] },
  { id: 'Prise RJ45', motsCles: ['rj45', 'reseau', 'ethernet', 'internet'] },
  { id: 'Contrôle d\'accès', motsCles: ['controle d acces', 'controle dacces', 'badge', 'portier', 'interphone', 'lecteur', 'uca', 'interface ip'] },
  { id: 'Lumière', motsCles: ['lumiere', 'lampe', 'eclairage', 'neon', 'pave led', 'spot', 'downlight', 'ballast', 'radar', 'interrupteur', 'telerupteur', 'bouton'] },
  { id: 'Prises', motsCles: ['prise'] },
  { id: 'Téléphonie', motsCles: ['telephon', 'sip', 'numeriqu', 'poste numerique', 'poste sip', 'anomal', 'annomal'] },
];

// Liste des bâtiments et de leurs entrées associées
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

// Normalise un texte pour rendre l'analyse robuste :
// - minuscules
// - suppression des accents (é → e, è → e, à → a, ç → c...)
// - apostrophes / underscores → espaces
// - tirets entre lettres → espaces (rez-de-chaussée → rez de chaussee)
//   tout en conservant les tirets des nombres négatifs (-1)
// - espaces multiples compressés
function normaliser(texte) {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’`_]/g, ' ')
    .replace(/([a-z])-([a-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

// Teste la présence d'un mot-clé dans un texte déjà normalisé.
// - un mot-clé court (<= 4 caractères, ex. "sip", "rj45") doit être un mot entier
// - un mot-clé plus long est cherché en début de mot (racine : "telephon" → téléphone, téléphonie)
// - un mot-clé contenant un espace est cherché comme expression
function motCorrespond(texteNorm, mot) {
  if (mot.includes(' ')) {
    return texteNorm.includes(mot);
  }
  const echappe = mot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (mot.length <= 4) {
    return new RegExp(`\\b${echappe}\\b`).test(texteNorm);
  }
  return new RegExp(`\\b${echappe}`).test(texteNorm);
}

// Détecte le type d'intervention à partir du texte
function extraireType(texteNorm) {
  for (const type of TYPES_INTERVENTION) {
    if (type.motsCles.some(mot => motCorrespond(texteNorm, mot))) {
      return type.id;
    }
  }
  return 'Non spécifié';
}

// Détecte l'étage à partir du texte (texte déjà normalisé)
function extraireEtage(texteNorm) {
  const t = texteNorm;

  // Rez-de-jardin (à tester avant RDC car "rez" est commun aux deux)
  if (/\brdj\b/.test(t) || /rez de jardin/.test(t)) return 'RDJ';

  // Rez-de-chaussée
  if (/\brdc\b/.test(t) || /rez de chaussee/.test(t) || /\brez\b/.test(t)) return 'RDC';

  // Niveaux particuliers
  if (/mezzanine/.test(t)) return 'Mezzanine';
  if (/entresol/.test(t)) return 'Entresol';

  // Sous-sol avec numéro : "sous sol 1", "S1"
  const sousSolNum = t.match(/sous sol\s*(\d+)/) || t.match(/\bs\s?(\d+)\b/);
  if (sousSolNum) return `Sous-sol ${sousSolNum[1]}`;
  if (/sous sol/.test(t) || /\bss\b/.test(t)) return 'Sous-sol';

  // Niveau négatif : "-1", "niveau -1"
  const negatif = t.match(/(?:niveau\s*)?-\s*(\d+)/);
  if (negatif) return `Sous-sol ${negatif[1]}`;

  // "R+1", "R+2" → étage 1, 2
  const rplus = t.match(/\br\s*\+\s*(\d+)/);
  if (rplus) return rplus[1];

  // "étage 3", "niveau 3", "étage n3"
  const apres = t.match(/(?:etage|niveau)\s*(?:n\s*)?(\d+)/);
  if (apres) return apres[1];

  // "3ème étage", "1er étage", "3e étage", "2nd étage"
  const ordinal = t.match(/(\d+)\s*(?:er|ere|eme|ieme|e|nd|nde)?\s*(?:etage|niveau)/);
  if (ordinal) return ordinal[1];

  // "N3", "N 5"
  const nSeul = t.match(/\bn\s*(\d+)\b/);
  if (nSeul) return nSeul[1];

  // Ordinal seul, sans le mot "étage" : "1er", "2eme", "3e"
  const ordinalSeul = t.match(/\b(\d+)\s*(?:ere|er|ieme|eme|e)\b/);
  if (ordinalSeul) return ordinalSeul[1];

  // "au 3" (priorité basse)
  const au = t.match(/\bau\s+(\d+)\b/);
  if (au) return au[1];

  return 'Non spécifié';
}

// Détecte le bâtiment à partir du texte (texte déjà normalisé)
// Les sigles courts sont ancrés par des frontières de mots pour éviter
// les faux positifs ("bureau" ne doit pas donner BU, "chaussee" ni SSE).
const ALIAS_BATIMENTS = [
  { motif: /\bbatiment\s+a\b/, id: 'Bâtiment A' },
  { motif: /\bbat\s+a\b/, id: 'Bâtiment A' },
  { motif: /\bbatiment\s+b\b/, id: 'Bâtiment B' },
  { motif: /\bbat\s+b\b/, id: 'Bâtiment B' },
  { motif: /\bbatiment\s+c\b/, id: 'Bâtiment C' },
  { motif: /\bbat\s+c\b/, id: 'Bâtiment C' },
  { motif: /\baip\b/, id: 'AIP' },
  { motif: /\batela\b/, id: 'Atela' },
  { motif: /\besa\b/, id: 'ESA' },
  { motif: /\bsse\b/, id: 'SSE' },
  { motif: /\bbu\b/, id: 'BU' },
  { motif: /\biecl\b/, id: 'IECL' },
  { motif: /\bcryogenie\b/, id: 'Cryogénie' },
  { motif: /\b1 cycle\b/, id: '1 cycle' },
  { motif: /\bpremier cycle\b/, id: '1 cycle' },
  { motif: /\bmagasin central\b/, id: 'Magasin Central' },
  { motif: /\bmag central\b/, id: 'Magasin Central' },
];

function extraireBatiment(texteNorm) {
  for (const alias of ALIAS_BATIMENTS) {
    if (alias.motif.test(texteNorm)) {
      return alias.id;
    }
  }

  // Repli : "bâtiment X" / "bât X" avec un nom non répertorié
  const generique = texteNorm.match(/\bbatiment\s+([a-z0-9]+)/) || texteNorm.match(/\bbat\s+([a-z0-9]+)/);
  if (generique) {
    return generique[1].charAt(0).toUpperCase() + generique[1].slice(1);
  }

  return 'Non spécifié';
}

// Détecte l'entrée à partir du texte normalisé et du bâtiment trouvé
function extraireEntree(texteNorm, batiment) {
  // Récupère les entrées connues du bâtiment (ex. Bâtiment A → 1A, 2A...)
  const batimentTrouve = BATIMENTS.find(b => b.id === batiment);
  const codesEntrees = batimentTrouve && batimentTrouve.entrees ? batimentTrouve.entrees : [];

  if (codesEntrees.length > 0) {
    for (const code of codesEntrees) {
      const codeMin = code.toLowerCase();
      const regexEntree = new RegExp(`(entree\\s*${codeMin}|porte\\s*${codeMin}|\\b${codeMin}\\b)`, 'i');
      if (regexEntree.test(texteNorm)) {
        return code;
      }
    }
  } else {
    // Bâtiment sans entrée définie : cherche un code générique "entrée 1" / "porte A"
    const generique = texteNorm.match(/(?:entree|porte)\s*(\d+[a-z]?|[a-z])/);
    if (generique) {
      return generique[1].toUpperCase();
    }
  }

  return 'Non spécifié';
}

// Détecte le numéro de poste téléphonique (extension 45xxx, ex. "45043")
function extraireTelephone(texteNorm) {
  const resultat = texteNorm.match(/\b45\d{3}\b/);
  return resultat ? resultat[0] : '';
}

// Fonction principale : analyse le texte et retourne un objet structuré
export function analyserIntervention(texte) {
  if (!texte || texte.trim() === '') {
    return {
      type: 'Non spécifié',
      etage: 'Non spécifié',
      batiment: 'Non spécifié',
      entree: 'Non spécifié',
      telephone: '',
      description: '',
    };
  }

  const texteNorm = normaliser(texte);

  const typeDetecte = extraireType(texteNorm);
  const etage = extraireEtage(texteNorm);
  const batiment = extraireBatiment(texteNorm);
  const entree = extraireEntree(texteNorm, batiment);
  const telephoneDetecte = extraireTelephone(texteNorm);

  // Un poste 45xxx sur une description sans type précis → intervention téléphonique
  let type = typeDetecte;
  if (telephoneDetecte && type === 'Non spécifié') {
    type = 'Téléphonie';
  }

  // Le téléphone n'est conservé que pour les interventions téléphoniques
  const telephone = type === 'Téléphonie' ? telephoneDetecte : '';

  return {
    type,
    etage,
    batiment,
    entree,
    telephone,
    description: texte.trim(),
  };
}
