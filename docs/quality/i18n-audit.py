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
        if f.endswith('i18n.js'):
            continue
        src = open(f, encoding='utf-8').read()
        for pat in KEY_PATTERNS:
            for m in pat.finditer(src):
                k = m.group(1).replace("\\'", "'").replace('\\"', '"')
                keys.setdefault(k, set()).add(os.path.relpath(f, ROOT))
    return keys

def dict_keys():
    """Les clés présentes dans chaque dictionnaire (AR puis EN)."""
    src = open(I18N, encoding='utf-8').read()
    cut = src.find('export const EN = {')
    if cut < 0:
        raise SystemExit('i18n.js : bloc EN introuvable')
    def parse(block):
        out = set()
        for pat in (r"^\s*'((?:[^'\\]|\\.)+)'\s*:", r'^\s*"((?:[^"\\]|\\.)+)"\s*:'):
            for m in re.finditer(pat, block, re.M):
                out.add(m.group(1).replace("\\'", "'").replace('\\"', '"'))
        return out
    return {'ar': parse(src[:cut]), 'en': parse(src[cut:])}

def main():
    args = sys.argv[1:]
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
