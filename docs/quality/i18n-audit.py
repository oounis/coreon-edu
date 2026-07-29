#!/usr/bin/env python3
# ════════════════════════════════════════════════════════════════════════════
# L'AUDIT DE TRADUCTION — l'outil qui empêche le franglais de revenir.
#
# Le défaut trouvé le 2026-07-26 : les pages étaient CÂBLÉES sur t() (802 clés)
# mais le dictionnaire ANGLAIS n'en couvrait que 117 → « Teacher » traduit à
# côté de « Élèves notés » resté français, dans la MÊME ligne d'en-tête.
# Personne ne l'avait vu parce que rien ne le mesurait.
#
#   python3 docs/quality/i18n-audit.py             → le rapport de couverture
#   python3 docs/quality/i18n-audit.py --missing en   → les clés à traduire (1/ligne)
#   python3 docs/quality/i18n-audit.py --json /tmp/x.json --missing ar
#   python3 docs/quality/i18n-audit.py --gate 60   → SORT EN ERREUR sous 60 %
#                                                    (c'est la barrière de la CI)
#
# Zéro dépendance : c'est de l'outillage, pas un service.
# ════════════════════════════════════════════════════════════════════════════
import re, sys, json, glob, os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
I18N = os.path.join(ROOT, 'core/src/i18n.js')
# Un fichier par langue depuis 2026-07-28 : les dictionnaires sont des morceaux
# chargés à la demande, plus des passagers du premier téléchargement.
DICT_AR = os.path.join(ROOT, 'core/src/i18n.ar.js')
DICT_EN = os.path.join(ROOT, 'core/src/i18n.en.js')
DICTS = {os.path.basename(DICT_AR), os.path.basename(DICT_EN), 'i18n.js'}

KEY_PATTERNS = [re.compile(r"\bt\(\s*'((?:[^'\\]|\\.)+)'\s*\)"),
                re.compile(r'\bt\(\s*"((?:[^"\\]|\\.)+)"\s*\)')]

def used_keys():
    """Toutes les clés réellement appelées par le code (app + cœur + mobile)."""
    keys = {}
    files = (glob.glob(os.path.join(ROOT, 'app/src/**/*.jsx'), recursive=True)
             + glob.glob(os.path.join(ROOT, 'app/src/**/*.js'), recursive=True)
             + glob.glob(os.path.join(ROOT, 'core/src/*.js'))
             + glob.glob(os.path.join(ROOT, 'mobile/src/**/*.js'), recursive=True))
    for f in files:
        if os.path.basename(f) in DICTS:      # la mécanique et les dictionnaires
            continue                          # ne sont pas des appelants
        src = open(f, encoding='utf-8').read()
        for pat in KEY_PATTERNS:
            for m in pat.finditer(src):
                k = m.group(1).replace("\\'", "'").replace('\\"', '"')
                keys.setdefault(k, set()).add(os.path.relpath(f, ROOT))
    return keys

def dict_keys():
    """Les clés présentes dans chaque dictionnaire.

    Depuis 2026-07-28 chaque langue est un FICHIER à part (i18n.ar.js /
    i18n.en.js), chargé dynamiquement : `i18n.js` ne porte plus que la
    mécanique. L'outil lit donc un fichier par langue.
    """
    def parse(path):
        if not os.path.exists(path):
            raise SystemExit(f'dictionnaire introuvable : {path}')
        src = open(path, encoding='utf-8').read()
        out = set()
        for pat in (r"^\s*'((?:[^'\\]|\\.)+)'\s*:", r'^\s*"((?:[^"\\]|\\.)+)"\s*:'):
            for m in re.finditer(pat, src, re.M):
                out.add(m.group(1).replace("\\'", "'").replace('\\"', '"'))
        return out
    return {'ar': parse(DICT_AR), 'en': parse(DICT_EN)}

# ── LA BARRIÈRE DES DATES (2026-07-29) ──────────────────────────────────────
# Une date n'est pas une clé `t()` : la couverture ci-dessus ne la voit pas.
# Le produit pouvait donc afficher 95 % d'anglais et 100 % de dates FRANÇAISES.
# C'était le cas : 51 appels `{ locale: fr }` (date-fns) et 12 `toLocaleDateString
# ('fr-FR')` répartis dans 28 fichiers. Un seul endroit décide désormais —
# `app/src/datefns.js` (df(), pour date-fns) et `dateLocale()` du cœur (pour Intl).
# Cette barrière refuse que le français revienne en dur.
DATE_LEAKS = [
    (re.compile(r"locale:\s*fr\b"),                        "date-fns « { locale: fr } » → { locale: df() }"),
    (re.compile(r"toLocale(?:Date|Time)?String\(\s*'fr-FR'"), "Intl « 'fr-FR' » en dur → dateLocale()"),
    (re.compile(r"from 'date-fns/locale'"),                 "import direct d'un repère date-fns → app/src/datefns.js"),
]
# Les deux seuls fichiers autorisés : celui qui DÉCIDE, et un courriel en français.
DATE_ALLOW = {'app/src/datefns.js', 'app/src/pages/MotDePasseOublie.jsx'}

def date_leaks():
    out = []
    for f in sorted(glob.glob(os.path.join(ROOT, 'app/src/**/*.jsx'), recursive=True)
                    + glob.glob(os.path.join(ROOT, 'app/src/**/*.js'), recursive=True)):
        rel = os.path.relpath(f, ROOT)
        if rel in DATE_ALLOW:
            continue
        src = open(f, encoding='utf-8').read()
        for pat, why in DATE_LEAKS:
            for m in pat.finditer(src):
                if src[:m.start()].rstrip().endswith('//'):   # une ligne de commentaire
                    continue
                out.append((rel, src[:m.start()].count('\n') + 1, why))
    return out


def main():
    args = sys.argv[1:]

    if '--dates' in args:
        leaks = date_leaks()
        if leaks:
            print(f'✗ BARRIÈRE DES DATES : {len(leaks)} repère(s) français EN DUR.')
            for rel, line, why in leaks:
                print(f'  {rel}:{line} — {why}')
            print('\n  Le repère de dates suit le LECTEUR, pas le développeur :')
            print('  web → import { df } from \'…/datefns.js\'  ·  Intl → dateLocale() du cœur')
            sys.exit(1)
        print('✓ Barrière des dates : aucun repère français en dur.')
        return

    used, dicts = used_keys(), dict_keys()
    total = len(used)
    cover = {l: len([k for k in used if k in dicts[l]]) for l in ('en', 'ar')}

    if '--missing' in args:
        loc = args[args.index('--missing') + 1]
        missing = sorted(k for k in used if k not in dicts[loc])
        if '--json' in args:
            path = args[args.index('--json') + 1]
            json.dump([{'fr': k, 'files': sorted(used[k])} for k in missing],
                      open(path, 'w'), ensure_ascii=False, indent=1)
            print(f'{len(missing)} clés manquantes en {loc} → {path}')
        else:
            for k in missing:
                print(k)
        return

    print(f'CLÉS UTILISÉES PAR LE CODE : {total}')
    for loc in ('en', 'ar'):
        pct = 100 * cover[loc] // max(total, 1)
        bar = '█' * (pct // 4) + '·' * (25 - pct // 4)
        print(f'  {loc.upper()} {bar} {pct:3d}%  ({cover[loc]}/{total}, manquantes : {total - cover[loc]})')

    # Les pages les moins couvertes : par où continuer.
    per_file = {}
    for k, files in used.items():
        for f in files:
            d = per_file.setdefault(f, [0, 0])
            d[0] += 1
            if k not in dicts['en']:
                d[1] += 1
    worst = sorted((v[1], v[0], f) for f, v in per_file.items() if v[1])[-12:]
    if worst:
        print('\nÀ TRADUIRE EN PRIORITÉ (clés EN manquantes) :')
        for miss, tot, f in reversed(worst):
            print(f'  {miss:4d}/{tot:<4d} {f}')

    if '--gate' in args:
        floor = int(args[args.index('--gate') + 1])
        low = [l for l in ('en', 'ar') if 100 * cover[l] // max(total, 1) < floor]
        if low:
            print(f'\n✗ BARRIÈRE : {", ".join(l.upper() for l in low)} sous {floor} %.')
            print('  Traduire avant de livrer : python3 docs/quality/i18n-audit.py --missing en')
            sys.exit(1)
        print(f'\n✓ Barrière passée : EN et AR ≥ {floor} %.')

if __name__ == '__main__':
    main()
