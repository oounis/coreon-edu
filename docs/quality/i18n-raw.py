#!/usr/bin/env python3
# ════════════════════════════════════════════════════════════════════════════
# LE FRANÇAIS QUI N'EST MÊME PAS CÂBLÉ — l'angle mort de i18n-audit.py.
#
# LE DÉFAUT DE MESURE (2026-07-29, signalé par Othman qui a ouvert /#/app et vu
# un écran mixte alors que l'audit annonçait 100 %). `i18n-audit.py` compare les
# clés APPELÉES par `t()` au dictionnaire : il répond à « ce qui est câblé
# est-il traduit ? ». Il ne peut pas répondre à « tout est-il câblé ? ».
# Une page dont le texte n'est JAMAIS passé à `t()` est invisible : elle ne
# manque aucune clé, elle n'en déclare aucune.
#
# Cet outil-ci mesure l'autre moitié : le texte français EN DUR dans le JSX.
#   python3 docs/quality/i18n-raw.py            → le classement par page
#   python3 docs/quality/i18n-raw.py --list app/src/pages/Journal.jsx
#   python3 docs/quality/i18n-raw.py --gate N   → SORT EN ERREUR au-dessus de N
# ════════════════════════════════════════════════════════════════════════════
import re, sys, os, glob

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SKIP = {'i18n.js', 'i18n.ar.js', 'i18n.en.js'}

# Un mot « français » : accent, ou mot-outil fréquent. On veut du TEXTE, pas des
# identifiants techniques.
FR_HINT = re.compile(r'[àâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ]|\b(le|la|les|un|une|des|du|de|et|ou|pour|par|sur|dans|avec|sans|aucun|aucune|tous|toutes|votre|vos|ce|cette|qui|que|est|sont|pas|plus|jamais|déjà)\b', re.I)
# Ce qu'on ne considère jamais comme du texte d'interface.
IGNORE = re.compile(r'^[\s\d\W]*$|^(https?:|/|#|@|\.|[A-Z_]+$)')

def strip_comments(s):
    s = re.sub(r'/\*.*?\*/', '', s, flags=re.S)
    return re.sub(r'^\s*//.*$', '', s, flags=re.M)

def findings(path):
    src = strip_comments(open(path, encoding='utf-8').read())
    out = []
    # 1) TEXTE JSX entre balises : >  Bonjour tout le monde  <
    for m in re.finditer(r'>([^<>{}\n]{4,120})<', src):
        txt = m.group(1).strip()
        if not txt or IGNORE.match(txt) or not FR_HINT.search(txt):
            continue
        out.append((src[:m.start()].count('\n') + 1, txt))
    # 2) PROPS de texte : title="…", sub='…', label=…, placeholder=…
    for m in re.finditer(r'\b(title|sub|label|placeholder|hint|alt|aria-label)\s*=\s*(["\'])([^"\']{4,160})\2', src):
        txt = m.group(3).strip()
        if IGNORE.match(txt) or not FR_HINT.search(txt):
            continue
        out.append((src[:m.start()].count('\n') + 1, f'{m.group(1)}="{txt}"'))
    return out

def main():
    args = sys.argv[1:]
    files = sorted(glob.glob(os.path.join(ROOT, 'app/src/**/*.jsx'), recursive=True))
    files = [f for f in files if os.path.basename(f) not in SKIP]

    if '--list' in args:
        target = args[args.index('--list') + 1]
        p = os.path.join(ROOT, target)
        for line, txt in findings(p):
            print(f'{target}:{line}: {txt}')
        return

    per = {}
    for f in files:
        n = findings(f)
        if n:
            per[os.path.relpath(f, ROOT)] = len(n)
    total = sum(per.values())
    print(f'PHRASES FRANÇAISES EN DUR (jamais passées à t()) : {total}\n')
    for f, n in sorted(per.items(), key=lambda x: -x[1])[:25]:
        print(f'  {n:4d}  {f}')
    if len(per) > 25:
        print(f'  … et {len(per) - 25} autres fichiers')

    if '--gate' in args:
        ceiling = int(args[args.index('--gate') + 1])
        if total > ceiling:
            print(f'\n✗ BARRIÈRE : {total} phrases en dur (plafond {ceiling}).')
            print('  Le plafond ne remonte jamais : câbler avec t() avant de livrer.')
            sys.exit(1)
        print(f'\n✓ Barrière tenue : {total} ≤ {ceiling}.')

main()
