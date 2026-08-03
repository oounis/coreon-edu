#!/usr/bin/env bash
# « Commis ≠ poussé ≠ EN LIGNE. » Ce script pilote la même vérification que
# le job smoke-prod de .github/workflows/deploy.yml : la page répond-elle,
# et le JS effectivement SERVI contient-il les marqueurs attendus ? Un déploiement
# GitHub Pages « vert » qui sert encore l'ancien bundle (cache CDN, propagation)
# passerait un simple curl -I — ce script ne se contente pas de ça.
#
# Usage : ops/verify-live.sh                      (marqueurs par défaut : cœur+AR+EN)
#         ops/verify-live.sh "chaîne à chercher"   (marqueur additionnel, ex. un
#                                                    texte tout juste traduit/ajouté)
set -uo pipefail
URL="https://edu.kogiagroup.com/"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT
cd "$WORKDIR"

EXTRA_MARKER="${1:-}"

echo "Interrogation de $URL ..."
ok=0
for i in $(seq 1 10); do
  code=$(curl -s -o page.html -w "%{http_code}" "$URL" || echo 000)
  if [ "$code" = "200" ] && grep -q '<div id="root">' page.html; then
    ok=1; break
  fi
  echo "  essai $i : HTTP $code, nouvelle tentative dans 10s..."
  sleep 10
done
if [ "$ok" != "1" ]; then
  echo "❌ Le site n'a pas répondu 200 avec la coquille de l'app."
  exit 1
fi

assets=$(grep -oE 'assets/[^"]+\.js' page.html | sort -u)
mkdir -p .chunks
fetch_all() {
  for a in $1; do
    n=$(echo "$a" | tr '/' '_')
    [ -f ".chunks/$n" ] || curl -s -o ".chunks/$n" "$URL$a" || true
  done
}
fetch_all "$assets"
# 2e niveau : imports dynamiques nommés DANS les morceaux (chemins relatifs, ex.
# "./i18n.ar-XXXX.js") — voir le commentaire équivalent dans deploy.yml.
nested=$(cat .chunks/* 2>/dev/null | grep -oE '\./[A-Za-z0-9._-]+\.js' | sed 's#^\./#assets/#' | sort -u)
fetch_all "$nested"

found_core=0; found_ar=0; found_en=0; found_extra=1
for f in .chunks/*; do
  grep -q "coreon_db" "$f" 2>/dev/null && found_core=1
  grep -q "لوحة المتابعة" "$f" 2>/dev/null && found_ar=1
  grep -q "Report cards & promotion" "$f" 2>/dev/null && found_en=1
done
if [ -n "$EXTRA_MARKER" ]; then
  found_extra=0
  for f in .chunks/*; do
    grep -qF "$EXTRA_MARKER" "$f" 2>/dev/null && found_extra=1 && break
  done
fi

status=0
[ "$found_core" = "1" ]  || { echo "❌ cœur (coreon_db) absent des bundles servis"; status=1; }
[ "$found_ar" = "1" ]    || { echo "❌ arabe absent des bundles servis"; status=1; }
[ "$found_en" = "1" ]    || { echo "❌ anglais absent des bundles servis"; status=1; }
if [ -n "$EXTRA_MARKER" ]; then
  [ "$found_extra" = "1" ] || { echo "❌ marqueur \"$EXTRA_MARKER\" absent des bundles servis"; status=1; }
fi

sha_local=$(git -C "$REPO_DIR" rev-parse HEAD 2>/dev/null || echo "?")
if [ "$status" = "0" ]; then
  echo "✅ EN LIGNE : page, cœur, AR, EN présents dans le bundle servi."
  [ -n "$EXTRA_MARKER" ] && echo "   marqueur \"$EXTRA_MARKER\" trouvé."
  echo "   (HEAD local = $sha_local — vérifier qu'il correspond au commit attendu)"
else
  echo "→ échec ci-dessus. Rappel : cache Pages max-age=600, laisser 10 min et Ctrl+Shift+R avant de conclure."
fi
exit $status
