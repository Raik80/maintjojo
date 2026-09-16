#!/bin/bash
export PATH="/home/jonathan/.nvm/versions/node/v20.20.2/bin:$PATH"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

cleanup() {
  echo ""
  echo "Arrêt en cours..."
  kill $SERVER_PID $EXPO_PID 2>/dev/null
  wait $SERVER_PID $EXPO_PID 2>/dev/null
  echo "Tout est arrêté"
  exit 0
}

trap cleanup SIGINT SIGTERM

echo "=== Maintjojo — Lancement ==="
echo ""

# 1. Serveur Express
node index.js &
SERVER_PID=$!
echo "Serveur Express lancé (PID: $SERVER_PID)"

sleep 1

# 2. Tunnel Tailscale Funnel (service système, pas de PID à gérer)
tailscale funnel --bg 3000 > /tmp/tailscale-maintjojo.log 2>&1
echo "Tailscale Funnel lancé"
echo "URL : https://maintjojo-serveur.tailce5b78.ts.net"
echo ""

# 3. Expo
cd /home/jonathan/Bureau/Maintjojo
npx expo start &
EXPO_PID=$!
echo "Expo lancé (PID: $EXPO_PID)"
echo "Scanne le QR code avec Expo Go"
echo ""
echo "Appuie sur Ctrl+C pour tout arrêter."

wait