// ============================================================
// Service de recherche dans l'annuaire de l'Université de Lorraine
// ------------------------------------------------------------
// L'annuaire expose une API JSON publique :
//   GET https://annuaire-web.univ-lorraine.fr/rest/ldapsearch
//       ?valeur=<recherche>&filtervalue=&withvac=
//
// Les numéros de téléphone renvoyés sont « chiffrés » par un
// simple décalage de +1 sur le code de chaque caractère ; on les
// déchiffre ici pour pouvoir les comparer aux postes internes.
//
// Poste interne (5 chiffres, ex. 45043) = 5 derniers chiffres du
// numéro complet (ex. +33 3 72 74 50 43).
// ============================================================

const ANNUAIRE_URL = 'https://annuaire-web.univ-lorraine.fr/rest/ldapsearch';
const DELAI_MS = 8000; // Timeout de la requête annuaire

// Déchiffre une valeur de l'annuaire (email, téléphone...)
// Chaque caractère a été décalé de +1 côté annuaire.
function dechiffrer(valeur) {
  if (valeur == null) return '';
  let resultat = '';
  for (let i = 0; i < valeur.length; i++) {
    let code = valeur.charCodeAt(i);
    if (code >= 8364) code = 128; // Caractère € : traité comme 128 avant décalage
    resultat += String.fromCharCode(code - 1);
  }
  return resultat;
}

// Vérifie qu'un poste est valide : 5 chiffres commençant par 45
function posteValide(poste) {
  return /^45\d{3}$/.test(poste);
}

// Extrait les chiffres d'un numéro de téléphone déchiffré
function chiffres(numero) {
  return (numero || '').replace(/\D/g, '');
}

// Recherche les personnes dont un numéro se termine par le poste donné.
// Retourne un tableau de noms (displayName) dédupliqués, éventuellement vide.
async function rechercherPersonnesParPoste(poste) {
  if (!posteValide(poste)) return [];

  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), DELAI_MS);

  try {
    const url = `${ANNUAIRE_URL}?valeur=${encodeURIComponent(poste)}&filtervalue=&withvac=`;
    const reponse = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      signal: controleur.signal,
    });
    if (!reponse.ok) return [];

    const donnees = await reponse.json();
    const items = Array.isArray(donnees.items) ? donnees.items : [];

    const noms = [];
    for (const item of items) {
      const numeros = dechiffrer(item.telephone).split(';');
      const correspond = numeros.some(n => chiffres(n).endsWith(poste));
      if (correspond && item.displayName && !noms.includes(item.displayName)) {
        noms.push(item.displayName);
      }
    }
    return noms;
  } catch (erreur) {
    // Annuaire injoignable : on ne bloque pas l'intervention
    console.error('Erreur annuaire UL :', erreur.message);
    return [];
  } finally {
    clearTimeout(minuteur);
  }
}

module.exports = { rechercherPersonnesParPoste, dechiffrer, posteValide };
