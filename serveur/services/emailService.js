require('dotenv').config();
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { creerAccuse } = require('../database');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

/**
 * Échappe les caractères HTML pour éviter toute injection dans les emails
 * lorsque des champs saisis par l'utilisateur sont insérés dans le corps HTML.
 */
function escapeHtml(valeur) {
  return String(valeur == null ? '' : valeur)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Nettoie une chaîne pour l'utiliser dans un nom de fichier joint.
 */
function nomFichierSur(valeur) {
  return String(valeur == null ? '' : valeur).replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'rapport';
}

/**
 * Crée et configure le transporteur SMTP pour l'envoi des emails
 * Utilise les variables d'environnement SMTP_HOST, SMTP_PORT, SMTP_USER et SMTP_PASS
 * Valeurs par défaut : serveur SMTP de l'université de Lorraine, port 587
 */
function creerTransporteur() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.univ-lorraine.fr',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Génère un PDF récapitulatif d'une intervention (version améliorée)
 * - Bandeau d'en-tête noir avec titre doré
 * - Tableau des infos avec fond alterné
 * - Bloc description avec barre latérale dorée
 * - Bloc résolution avec fond vert
 * - Photos encadrées avec légende
 * - Pied de page avec date et numéro de page
 */
async function genererPDF(intervention, photos, accuseToken) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 115, bottom: 40, left: 50, right: 50 },
        info: {
          Title: `Rapport intervention - ${intervention.type}`,
          Author: 'MaintJojo',
          Subject: "Rapport d'intervention technique",
        },
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Palette de couleurs du thème MaintJojo
      const C = {
        dark: '#1A1A2E',
        gold: '#FFD700',
        gray: '#666666',
        lightGray: '#F5F5F5',
        green: '#2E7D32',
        greenBg: '#E8F5E9',
        alternate: '#FAFAFA',
      };

      // Constantes de mise en page
      const ML = 50; // Marge gauche
      const CW = 495; // Largeur du contenu

      const dateFooter = new Date().toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
      });

      // Dessine le bandeau d'en-tête (fond noir + titre doré + ligne de séparation)
      function drawHeader() {
        doc.rect(0, 0, 595.28, 105).fill(C.dark);
        doc.rect(0, 105, 595.28, 3).fill(C.gold);
        doc.fontSize(26).font('Helvetica-Bold').fillColor(C.gold);
        doc.text('MAINTJOJO', 0, 25, { align: 'center', width: 595.28 });
        doc.fontSize(12).font('Helvetica').fillColor('#CCCCCC');
        doc.text("Rapport d'intervention technique", 0, 65, { align: 'center', width: 595.28 });
      }

      // Dessine le pied de page (texte gris avec date et numéro de page)
      function drawFooter(page) {
        doc.fontSize(8).font('Helvetica').fillColor('#AAAAAA');
        doc.text('MaintJojo · G\u00e9n\u00e9r\u00e9 le ' + dateFooter + ' · Page ' + page, ML, 790, { align: 'center', width: CW });
      }

      // Page 1 : en-tête et pied
      drawHeader();
      drawFooter(1);

      let y = 125; // Position Y courante (juste sous l'en-tête)
      let pageNum = 1;

      // Vérifie si on doit passer à une nouvelle page (790 = fin de zone utile)
      function needPage(space) {
        if (y + space > 790) {
          doc.addPage();
          pageNum++;
          drawHeader();
          drawFooter(pageNum);
          y = 125;
          return true;
        }
        return false;
      }

      // === SECTION : Informations générales ===
      // Titre de section avec barre dorée en dessous
      doc.fontSize(16).font('Helvetica-Bold').fillColor(C.dark);
      doc.text('Informations g\u00e9n\u00e9rales', ML, y);
      doc.rect(ML, y + 22, 60, 2).fill(C.gold);
      y += 35;

      // Tableau à 2 colonnes (label / valeur) avec fond alterné
      const infos = [
        ["Type d'intervention", intervention.type || 'Non spécifié'],
        ['Bâtiment', intervention.batiment || 'Non spécifié'],
      ];
      if (intervention.etage && intervention.etage !== 'Non spécifié') {
        infos.push(['Étage', intervention.etage]);
      }
      if (intervention.entree && intervention.entree !== 'Non spécifié') {
        infos.push(['Entrée', intervention.entree]);
      }
      infos.push(
        ['Statut', intervention.statut === 'terminé' ? 'Terminé' : 'En cours'],
        ['Date de création', intervention.date_creation || 'Non spécifiée'],
      );

      for (let i = 0; i < infos.length; i++) {
        needPage(22);
        const ry = y;
        // Ligne sur fond alterné pour la lisibilité
        if (i % 2 === 0) {
          doc.rect(ML, ry, CW, 22).fill(C.alternate);
        }
        // Label (gras, gris foncé)
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#444444');
        doc.text(infos[i][0], ML + 12, ry + 6);
        // Valeur (couleur selon le champ : vert/orange pour le statut)
        if (infos[i][0] === 'Statut') {
          doc.font('Helvetica-Bold').fillColor(infos[i][1] === 'Termin\u00e9' ? C.green : '#FF8F00');
        } else {
          doc.font('Helvetica').fillColor('#000000');
        }
        doc.text(infos[i][1], ML + 182, ry + 6);
        y += 22;
      }

      y += 15;
      needPage(30);

      // === SECTION : Description ===
      // Bloc avec barre latérale dorée et fond gris clair
      doc.fontSize(16).font('Helvetica-Bold').fillColor(C.dark);
      doc.text('Description', ML, y);
      doc.rect(ML, y + 22, 40, 2).fill(C.gold);
      y += 35;

      const descTexte = intervention.description || 'Aucune description';
      const descH = doc.heightOfString(descTexte, { width: CW - 20, align: 'justify', lineGap: 4 });
      const descBH = Math.max(descH + 20, 40);

      needPage(descBH + 10);
      // Barre latérale dorée
      doc.rect(ML, y, 4, descBH).fill('#FFD700');
      // Fond gris clair
      doc.rect(ML + 4, y, CW - 4, descBH).fill(C.lightGray);
      doc.fontSize(10).font('Helvetica').fillColor('#333333');
      doc.text(descTexte, ML + 15, y + 10, { width: CW - 30, align: 'justify', lineGap: 4 });
      y += descBH + 15;

      // === SECTION : Résolution (uniquement si terminée) ===
      // Bloc avec barre latérale verte et fond vert clair
      if (intervention.resolution) {
        needPage(30);
        doc.fontSize(16).font('Helvetica-Bold').fillColor(C.green);
        doc.text('R\u00e9solution', ML, y);
        doc.rect(ML, y + 22, 60, 2).fill(C.green);
        y += 35;

        const resTexte = intervention.resolution;
        const resH = doc.heightOfString(resTexte, { width: CW - 20, align: 'justify', lineGap: 4 });
        const resBH = Math.max(resH + 20, 40);

        needPage(resBH + 10);
        doc.rect(ML, y, 4, resBH).fill(C.green);
        doc.rect(ML + 4, y, CW - 4, resBH).fill(C.greenBg);
        doc.fontSize(10).font('Helvetica').fillColor('#1B5E20');
        doc.text(resTexte, ML + 15, y + 10, { width: CW - 30, align: 'justify', lineGap: 4 });
        y += resBH + 15;
      }

      // === SECTION : Photos ===
      // Chaque photo sur une nouvelle page avec cadre gris clair et légende
      if (photos && photos.length > 0) {
        doc.addPage();
        pageNum++;
        drawHeader();
        drawFooter(pageNum);
        y = 125;

        doc.fontSize(16).font('Helvetica-Bold').fillColor(C.dark);
        doc.text('Photos (' + photos.length + ')', ML, y);
        doc.rect(ML, y + 22, 40, 2).fill(C.gold);
        y += 35;

        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          const cheminPhoto = path.join(UPLOAD_DIR, photo.filename);

          if (fs.existsSync(cheminPhoto)) {
            try {
              const ih = 200;
              if (y + ih + 40 > 790) {
                doc.addPage();
                pageNum++;
                drawHeader();
                drawFooter(pageNum);
                y = 125;
              }

              // Cadre gris clair autour de la photo
              doc.rect(ML, y, CW, ih + 10).fill(C.lightGray);
              const imgX = ML + 5, imgY = y + 5, imgW = CW - 10, imgH = ih;
              doc.image(cheminPhoto, imgX, imgY, { fit: [imgW, imgH], align: 'center', valign: 'center' });
              const photoUrl = `https://maintjojo-serveur.tailce5b78.ts.net/uploads/${photo.filename}${accuseToken ? '?t=' + accuseToken : ''}`;
              doc.link(imgX, imgY, imgW, imgH, photoUrl);
              y += ih + 15;

              // Légende en italique sous la photo
              if (photo.description) {
                doc.fontSize(9).font('Helvetica-Oblique').fillColor('#666666');
                doc.text(photo.description, ML, y, { align: 'center', width: CW });
                y += 20;
              }
              y += 10;
            } catch (e) {
              doc.fontSize(10).font('Helvetica').fillColor('#999999');
              doc.text('[Photo ' + (i + 1) + ' : fichier non disponible]', ML, y, { align: 'center' });
              y += 20;
            }
          } else {
            doc.fontSize(10).font('Helvetica').fillColor('#999999');
            doc.text('[Photo ' + (i + 1) + ' : fichier introuvable]', ML, y, { align: 'center' });
            y += 20;
          }
        }
      }

      doc.end();
    } catch (erreur) {
      reject(erreur);
    }
  });
}

/**
 * Génère le PDF d'une intervention et l'envoie par email
 * @param  {Object} intervention - Données de l'intervention (type, batiment, etage, statut...)
 * @param  {Array}  photos       - Liste des photos associées à l'intervention
 * @return {Object}              - Message de confirmation avec l'ID du message envoyé
 */
async function envoyerRapport(intervention, photos) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('Configuration SMTP manquante. V\u00e9rifie le fichier .env (SMTP_USER et SMTP_PASS)');
  }
  if (!process.env.MAIL_TO) {
    throw new Error('Destinataire non configur\u00e9. V\u00e9rifie MAIL_TO dans le fichier .env');
  }

  // Token créé AVANT la génération du PDF : il est inclus dans les liens des photos.
  const accuseToken = creerAccuse('intervention', intervention.id);

  const pdfBuffer = await genererPDF(intervention, photos, accuseToken);

  const date = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const BASE_URL = 'https://maintjojo-serveur.tailce5b78.ts.net';

  const transporteur = creerTransporteur();

  const resultat = await transporteur.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: process.env.MAIL_TO,
    subject: `Rapport d'intervention — ${intervention.type} — ${date}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1A1A2E; border-bottom: 3px solid #FFD700; padding-bottom: 10px;">
          MaintJojo — Rapport d'intervention
        </h1>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 8px; font-weight: bold; color: #333;">Type</td>
              <td style="padding: 8px;">${escapeHtml(intervention.type)}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #333;">Bâtiment</td>
              <td style="padding: 8px;">${escapeHtml(intervention.batiment)}</td></tr>
          ${intervention.etage && intervention.etage !== 'Non spécifié' ?
            '<tr><td style="padding: 8px; font-weight: bold; color: #333;">Étage</td><td style="padding: 8px;">' + escapeHtml(intervention.etage) + '</td></tr>' : ''}
          ${intervention.entree && intervention.entree !== 'Non spécifié' ?
            '<tr><td style="padding: 8px; font-weight: bold; color: #333;">Entrée</td><td style="padding: 8px;">' + escapeHtml(intervention.entree) + '</td></tr>' : ''}
          <tr><td style="padding: 8px; font-weight: bold; color: #333;">Statut</td>
              <td style="padding: 8px;">${intervention.statut === 'terminé' ? '✅ Terminé' : '⏳ En cours'}</td></tr>
        </table>
        <p style="color: #666;">Le rapport complet est en pièce jointe (PDF).</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${BASE_URL}/api/accuse/${accuseToken}"
             style="display: inline-block; padding: 12px 30px; background: #FFD700; color: #1A1A2E;
                    text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            ✅ Confirmer la réception du rapport
          </a>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center;">
          Cliquez sur le bouton ci-dessus pour accuser réception du rapport.
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          Ce message a été envoyé automatiquement depuis l'application MaintJojo.
        </p>
      </div>
    `,
    attachments: [{
      filename: `rapport_intervention_${nomFichierSur(intervention.type)}_${Date.now()}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }],
  });

  return {
    message: 'Rapport envoy\u00e9 avec succ\u00e8s',
    messageId: resultat.messageId,
  };
}

/**
 * Génère un PDF récapitulatif d'un chantier
 * - Bandeau d'en-tête noir avec titre doré
 * - Infos générales : localisation, date, statut
 * - Liste des tâches avec leur statut (terminé/à faire)
 * - Liste des matériels avec quantité et référence
 * - Photos encadrées avec légende
 * - Pied de page avec date et numéro de page
 */
async function genererPDFChantier(chantier, photos, accuseToken) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 115, bottom: 40, left: 50, right: 50 },
        info: {
          Title: `Rapport chantier - ${chantier.localisation}`,
          Author: 'MaintJojo',
          Subject: 'Rapport de chantier',
        },
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Palette de couleurs du thème MaintJojo
      const C = {
        dark: '#1A1A2E',
        gold: '#FFD700',
        gray: '#666666',
        lightGray: '#F5F5F5',
        green: '#2E7D32',
        greenBg: '#E8F5E9',
        alternate: '#FAFAFA',
        red: '#B71C1C',
        orange: '#FF8F00',
      };

      // Constantes de mise en page
      const ML = 50; // Marge gauche
      const CW = 495; // Largeur du contenu

      const dateFooter = new Date().toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
      });

      // Dessine le bandeau d'en-tête (fond noir + titre doré + ligne de séparation)
      function drawHeader() {
        doc.rect(0, 0, 595.28, 105).fill(C.dark);
        doc.rect(0, 105, 595.28, 3).fill(C.gold);
        doc.fontSize(26).font('Helvetica-Bold').fillColor(C.gold);
        doc.text('MAINTJOJO', 0, 25, { align: 'center', width: 595.28 });
        doc.fontSize(12).font('Helvetica').fillColor('#CCCCCC');
        doc.text('Rapport de chantier', 0, 65, { align: 'center', width: 595.28 });
      }

      // Dessine le pied de page (texte gris avec date et numéro de page)
      function drawFooter(page) {
        doc.fontSize(8).font('Helvetica').fillColor('#AAAAAA');
        doc.text('MaintJojo · Généré le ' + dateFooter + ' · Page ' + page, ML, 790, { align: 'center', width: CW });
      }

      // Page 1 : en-tête et pied
      drawHeader();
      drawFooter(1);

      let y = 125; // Position Y courante (juste sous l'en-tête)
      let pageNum = 1;

      // Vérifie si on doit passer à une nouvelle page (790 = fin de zone utile)
      function needPage(space) {
        if (y + space > 790) {
          doc.addPage();
          pageNum++;
          drawHeader();
          drawFooter(pageNum);
          y = 125;
          return true;
        }
        return false;
      }

      // === SECTION : Informations générales ===
      doc.fontSize(16).font('Helvetica-Bold').fillColor(C.dark);
      doc.text('Informations générales', ML, y);
      doc.rect(ML, y + 22, 60, 2).fill(C.gold);
      y += 35;

      // Tableau à 2 colonnes (label / valeur) avec fond alterné
      const infos = [
        ['Localisation', chantier.localisation || 'Non spécifiée'],
        ['Statut', chantier.statut === 'terminé' ? 'Terminé' : 'En cours'],
        ['Date de création', chantier.date_creation || 'Non spécifiée'],
      ];

      for (let i = 0; i < infos.length; i++) {
        needPage(22);
        const ry = y;
        if (i % 2 === 0) {
          doc.rect(ML, ry, CW, 22).fill(C.alternate);
        }
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#444444');
        doc.text(infos[i][0], ML + 12, ry + 6);
        if (infos[i][0] === 'Statut') {
          doc.font('Helvetica-Bold').fillColor(infos[i][1] === 'Terminé' ? C.green : C.orange);
        } else {
          doc.font('Helvetica').fillColor('#000000');
        }
        doc.text(infos[i][1], ML + 182, ry + 6);
        y += 22;
      }

      y += 15;
      needPage(30);

      // === SECTION : Tâches ===
      doc.fontSize(16).font('Helvetica-Bold').fillColor(C.dark);
      doc.text('Tâches', ML, y);
      doc.rect(ML, y + 22, 40, 2).fill(C.gold);
      y += 35;

      const taches = chantier.taches || [];
      if (taches.length === 0) {
        needPage(20);
        doc.fontSize(10).font('Helvetica').fillColor(C.gray);
        doc.text('Aucune tâche enregistrée', ML, y);
        y += 20;
      } else {
        for (let i = 0; i < taches.length; i++) {
          needPage(22);
          const tache = taches[i];
          const ry = y;
          if (i % 2 === 0) {
            doc.rect(ML, ry, CW, 22).fill(C.alternate);
          }
          // Indicateur de statut : [X] vert pour terminé, [ ] gris pour à faire
          // (utilisation de caractères ASCII simples pour garantir la compatibilité avec la police Helvetica du PDF)
          const estTerminee = tache.statut === 'terminé';
          doc.fontSize(10).font('Helvetica-Bold').fillColor(estTerminee ? C.green : C.gray);
          doc.text(estTerminee ? '[X]' : '[ ]', ML + 12, ry + 6);
          doc.font('Helvetica').fillColor('#000000');
          doc.text(tache.description || '', ML + 30, ry + 6, { width: CW - 42 });
          if (estTerminee) {
            doc.fontSize(8).font('Helvetica-Oblique').fillColor(C.green);
            doc.text('Terminée', ML + CW - 60, ry + 6, { width: 55, align: 'right' });
          } else {
            doc.fontSize(8).font('Helvetica-Oblique').fillColor(C.orange);
            doc.text('À faire', ML + CW - 60, ry + 6, { width: 55, align: 'right' });
          }
          y += 22;
        }
      }

      y += 15;
      needPage(30);

      // === SECTION : Matériels ===
      doc.fontSize(16).font('Helvetica-Bold').fillColor(C.dark);
      doc.text('Matériels', ML, y);
      doc.rect(ML, y + 22, 50, 2).fill(C.gold);
      y += 35;

      const materiels = chantier.materiels || [];
      if (materiels.length === 0) {
        needPage(20);
        doc.fontSize(10).font('Helvetica').fillColor(C.gray);
        doc.text('Aucun matériel enregistré', ML, y);
        y += 20;
      } else {
        // En-tête du tableau des matériels
        needPage(22);
        doc.rect(ML, y, CW, 22).fill(C.dark);
        doc.fontSize(10).font('Helvetica-Bold').fillColor(C.gold);
        doc.text('Nom', ML + 12, y + 6, { width: 200 });
        doc.text('Qté', ML + 220, y + 6, { width: 50, align: 'center' });
        doc.text('Référence', ML + 280, y + 6, { width: 200 });
        y += 22;

        for (let i = 0; i < materiels.length; i++) {
          needPage(22);
          const mat = materiels[i];
          const ry = y;
          if (i % 2 === 0) {
            doc.rect(ML, ry, CW, 22).fill(C.alternate);
          }
          doc.fontSize(10).font('Helvetica').fillColor('#000000');
          doc.text(mat.nom || '', ML + 12, ry + 6, { width: 200 });
          doc.text(String(mat.quantite || 1), ML + 220, ry + 6, { width: 50, align: 'center' });
          doc.text(mat.reference || '-', ML + 280, ry + 6, { width: 200 });
          y += 22;
        }
      }

      y += 15;

      // === SECTION : Photos ===
      if (photos && photos.length > 0) {
        needPage(30);
        doc.fontSize(16).font('Helvetica-Bold').fillColor(C.dark);
        doc.text('Photos (' + photos.length + ')', ML, y);
        doc.rect(ML, y + 22, 40, 2).fill(C.gold);
        y += 35;

        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          const cheminPhoto = path.join(UPLOAD_DIR, photo.filename);

          if (fs.existsSync(cheminPhoto)) {
            try {
              const ih = 200;
              if (y + ih + 40 > 790) {
                doc.addPage();
                pageNum++;
                drawHeader();
                drawFooter(pageNum);
                y = 125;
              }

              // Cadre gris clair autour de la photo
              doc.rect(ML, y, CW, ih + 10).fill(C.lightGray);
              const imgX = ML + 5, imgY = y + 5, imgW = CW - 10, imgH = ih;
              doc.image(cheminPhoto, imgX, imgY, { fit: [imgW, imgH], align: 'center', valign: 'center' });
              const photoUrl = `https://maintjojo-serveur.tailce5b78.ts.net/uploads/${photo.filename}${accuseToken ? '?t=' + accuseToken : ''}`;
              doc.link(imgX, imgY, imgW, imgH, photoUrl);
              y += ih + 15;

              // Légende en italique sous la photo
              if (photo.description) {
                doc.fontSize(9).font('Helvetica-Oblique').fillColor('#666666');
                doc.text(photo.description, ML, y, { align: 'center', width: CW });
                y += 20;
              }
              y += 10;
            } catch (e) {
              doc.fontSize(10).font('Helvetica').fillColor('#999999');
              doc.text('[Photo ' + (i + 1) + ' : fichier non disponible]', ML, y, { align: 'center' });
              y += 20;
            }
          } else {
            doc.fontSize(10).font('Helvetica').fillColor('#999999');
            doc.text('[Photo ' + (i + 1) + ' : fichier introuvable]', ML, y, { align: 'center' });
            y += 20;
          }
        }
      }

      doc.end();
    } catch (erreur) {
      reject(erreur);
    }
  });
}

/**
 * Génère le PDF du chantier et l'envoie par email au destinataire configuré
 * Utilise la même configuration SMTP que les rapports d'intervention
 */
async function envoyerRapportChantier(chantier, photos) {
  // Vérification de la configuration SMTP
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('Configuration SMTP manquante. Vérifie le fichier .env (SMTP_USER et SMTP_PASS)');
  }
  if (!process.env.MAIL_TO) {
    throw new Error('Destinataire non configuré. Vérifie MAIL_TO dans le fichier .env');
  }

  // Token créé AVANT la génération du PDF : il est inclus dans les liens des photos.
  const accuseToken = creerAccuse('chantier', chantier.id);

  // Génération du PDF
  const pdfBuffer = await genererPDFChantier(chantier, photos, accuseToken);

  const date = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const BASE_URL = 'https://maintjojo-serveur.tailce5b78.ts.net';

  const transporteur = creerTransporteur();

  // Envoi de l'email avec le PDF en pièce jointe
  const resultat = await transporteur.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: process.env.MAIL_TO,
    subject: `Rapport chantier — ${chantier.localisation} — ${date}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1A1A2E; border-bottom: 3px solid #FFD700; padding-bottom: 10px;">
          MaintJojo — Rapport de chantier
        </h1>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 8px; font-weight: bold; color: #333;">Localisation</td>
              <td style="padding: 8px;">${escapeHtml(chantier.localisation)}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #333;">Statut</td>
              <td style="padding: 8px;">${chantier.statut === 'terminé' ? '✅ Terminé' : '⏳ En cours'}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #333;">Tâches</td>
              <td style="padding: 8px;">${(chantier.taches || []).filter(t => t.statut === 'terminé').length}/${(chantier.taches || []).length} terminées</td></tr>
        </table>
        <p style="color: #666;">Le rapport complet est en pièce jointe (PDF).</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${BASE_URL}/api/accuse/${accuseToken}"
             style="display: inline-block; padding: 12px 30px; background: #FFD700; color: #1A1A2E;
                    text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            ✅ Confirmer la réception du rapport
          </a>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center;">
          Cliquez sur le bouton ci-dessus pour accuser réception du rapport.
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          Ce message a été envoyé automatiquement depuis l'application MaintJojo.
        </p>
      </div>
    `,
    attachments: [{
      filename: `rapport_chantier_${nomFichierSur(chantier.localisation)}_${Date.now()}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }],
  });

  return {
    message: 'Rapport envoyé avec succès',
    messageId: resultat.messageId,
  };
}

process.on('exit', () => {});

module.exports = { envoyerRapport, genererPDF, envoyerRapportChantier, genererPDFChantier };
