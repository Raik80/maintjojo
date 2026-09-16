// Port sur lequel le serveur écoute
const PORT = 3000;

// Chemin du fichier de base de données SQLite
const DB_PATH = './interventions.db';

// Clé API pour sécuriser l'accès au serveur (doit être définie dans .env)
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error('API_KEY manquante - définissez-la dans le fichier .env');
}

// Export de la configuration
module.exports = {
  PORT,
  DB_PATH,
  API_KEY,
  UPLOAD_PATH: './uploads',
};
