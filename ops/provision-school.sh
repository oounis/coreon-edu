#!/usr/bin/env bash
# Provisionne UNE école pilote : sa propre base Turso + son propre service Render.
#
# Pourquoi une instance par école plutôt qu'un multi-locataire applicatif :
# le serveur Coreon héberge une seule école par conception (un blob `school`,
# un blob `auth`). Construire le multi-locataire, c'est des semaines de travail
# ET un risque de fuite entre écoles à chaque requête mal filtrée. Ici
# l'isolation est PHYSIQUE : deux écoles ne partagent rien, aucune requête ne
# peut fuir. Coût : un service gratuit de plus. À revoir vers 10+ écoles.
#
# Usage : ./ops/provision-school.sh <slug-ecole> "<Nom lisible>"
#   ex.  ./ops/provision-school.sh alnour "École Al Nour"
set -euo pipefail

SLUG="${1:?slug requis (ex: alnour) — minuscules, chiffres, tirets}"
LABEL="${2:-$SLUG}"

[[ "$SLUG" =~ ^[a-z0-9-]+$ ]] || { echo "slug invalide: $SLUG" >&2; exit 1; }

source ~/.config/kogia/secrets.env
TURSO_ORG="oounis"
RENDER_OWNER="tea-d1ppcgjipnbc7389lan0"
DB_NAME="coreon-${SLUG}"
SVC_NAME="coreon-${SLUG}-api"

echo "== 1/4 base de données dédiée : $DB_NAME"
# API plateforme plutôt que le CLI : pas de session à renouveler, donc
# reproductible depuis n'importe quelle machine ou depuis la CI.
curl -s -X POST -H "Authorization: Bearer $TURSO_API_TOKEN" -H "Content-Type: application/json" \
  "https://api.turso.tech/v1/organizations/$TURSO_ORG/databases" \
  -d "{\"name\":\"$DB_NAME\",\"group\":\"default\"}" >/dev/null
DB_HOST=$(curl -s -H "Authorization: Bearer $TURSO_API_TOKEN" \
  "https://api.turso.tech/v1/organizations/$TURSO_ORG/databases/$DB_NAME" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['database']['Hostname'])")
DB_URL="libsql://$DB_HOST"
DB_TOKEN=$(curl -s -X POST -H "Authorization: Bearer $TURSO_API_TOKEN" \
  "https://api.turso.tech/v1/organizations/$TURSO_ORG/databases/$DB_NAME/auth/tokens" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['jwt'])")

echo "== 2/4 données de départ (école de démonstration)"
cd "$(dirname "$0")/.."
TURSO_DATABASE_URL="$DB_URL" TURSO_AUTH_TOKEN="$DB_TOKEN" node server/import.mjs --demo

echo "== 3/4 service dédié : $SVC_NAME"
CREATE=$(curl -s -X POST -H "Authorization: Bearer $RENDER_API_KEY" -H "Content-Type: application/json" \
  https://api.render.com/v1/services -d "$(cat <<JSON
{"type":"web_service","name":"$SVC_NAME","ownerId":"$RENDER_OWNER",
 "repo":"https://github.com/oounis/coreon-edu","branch":"main","autoDeploy":"yes",
 "rootDir":"server","serviceDetails":{"env":"node","region":"frankfurt","plan":"free",
 "envSpecificDetails":{"buildCommand":"npm install","startCommand":"node server.mjs"}}}
JSON
)")
SVC_ID=$(echo "$CREATE" | python3 -c "import json,sys; print(json.load(sys.stdin)['service']['id'])")
SVC_URL=$(echo "$CREATE" | python3 -c "import json,sys; print(json.load(sys.stdin)['service']['serviceDetails']['url'])")

echo "== 4/4 configuration + déploiement"
curl -s -X PUT -H "Authorization: Bearer $RENDER_API_KEY" -H "Content-Type: application/json" \
  "https://api.render.com/v1/services/$SVC_ID/env-vars" -d "$(python3 - <<PY
import json
print(json.dumps([
 {"key":"TURSO_DATABASE_URL","value":"$DB_URL"},
 {"key":"TURSO_AUTH_TOKEN","value":"$DB_TOKEN"},
 {"key":"COREON_ORIGINS","value":"https://edu.kogiagroup.com"},
 {"key":"SENTRY_DSN","value":"${SENTRY_DSN_COREON_EDU:-}"},
]))
PY
)" >/dev/null
# Le déploiement n'attend que les checks CI : cohérent avec les autres services.
curl -s -X PATCH -H "Authorization: Bearer $RENDER_API_KEY" -H "Content-Type: application/json" \
  "https://api.render.com/v1/services/$SVC_ID" -d '{"autoDeployTrigger":"checksPass"}' >/dev/null
curl -s -X POST -H "Authorization: Bearer $RENDER_API_KEY" -H "Content-Type: application/json" \
  "https://api.render.com/v1/services/$SVC_ID/deploys" -d '{}' >/dev/null

cat <<EOF

École provisionnée : $LABEL
  API        : $SVC_URL
  Base       : $DB_NAME (isolée — aucune autre école n'y a accès)
  Service    : $SVC_ID

Étapes restantes (manuelles, volontairement) :
  1. Attendre que le déploiement soit "live", puis vérifier :
       curl $SVC_URL/api/health   → {"ok":true,...}
  2. Dans le navigateur de l'école, une seule fois :
       localStorage.setItem('coreon_api', '$SVC_URL')
  3. Ajouter un moniteur Better Stack sur $SVC_URL/api/health
  4. Consigner l'école dans Linear (projet Coreon EDU) avec sa date de pilote.
EOF
