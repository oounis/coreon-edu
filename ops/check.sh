#!/usr/bin/env bash
# Verdict unique pour toute la chaîne de qualité (cœur, serveur, lint, i18n,
# parcours e2e). Le détail COMPLET va dans /tmp/coreon-check.log ; ce script
# n'imprime qu'un résumé court, pensé pour être lu par un humain ou par Claude
# sans brûler de contexte. Reflète les étapes de .github/workflows/deploy.yml.
#
# Usage : ops/check.sh          (tout)
#         ops/check.sh fast     (cœur + serveur + lint + i18n, SANS build/e2e)
set -uo pipefail
cd "$(dirname "$0")/.."
LOG=/tmp/coreon-check.log
: > "$LOG"

PASS=1
declare -a RESULTS

run_step() {
  local name="$1"; shift
  echo "── $name ──" >> "$LOG"
  if "$@" >> "$LOG" 2>&1; then
    RESULTS+=("✅ $name")
  else
    RESULTS+=("❌ $name — voir $LOG")
    PASS=0
  fi
}

run_step "cœur (node:test)"        bash -c "cd core && npm test"
run_step "serveur (node:test)"     node --test server/test/
run_step "oxlint"                  bash -c "cd app && npx oxlint"
run_step "i18n couverture (95%)"   python3 docs/quality/i18n-audit.py --gate 95
run_step "i18n français brut (8)"  python3 docs/quality/i18n-raw.py --gate 8
run_step "i18n dates"              python3 docs/quality/i18n-audit.py --dates

if [ "${1:-}" != "fast" ]; then
  run_step "build app"               bash -c "cd app && npm run build"
  run_step "parcours e2e (npm run all)" bash -c "cd e2e && npm run all"
else
  RESULTS+=("⏭  build + parcours e2e — sautés (mode fast)")
fi

echo ""
printf '%s\n' "${RESULTS[@]}"
echo ""
if [ "$PASS" = "1" ]; then
  echo "→ TOUT VERT (log complet : $LOG)"
else
  echo "→ ÉCHEC — voir la ligne ❌ ci-dessus, détail dans $LOG"
  echo "  (dernières lignes du log :)"
  tail -n 25 "$LOG"
fi
exit $((1 - PASS))
