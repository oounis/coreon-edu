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
# …ni du CODE attrapé entre un « > » arithmétique et un « < » plus loin. Le
# détecteur travaille au motif, pas à l'arbre : ces marqueurs lèvent les faux
# positifs (constatés dans Live.jsx : `i.type==='Santé'&&i.status==='open'`).
CODEISH = re.compile(r'===|!==|&&|\|\||=>|\breturn\b|\bconst\b|\.\w+\(|\)\s*$')

def strip_comments(s):
    s = re.sub(r'/\*.*?\*/', '', s, flags=re.S)
    return re.sub(r'^\s*//.*$', '', s, flags=re.M)

# ── LES DEUX ANGLES MORTS DE LA PREMIÈRE VERSION (trouvés le 2026-07-30) ─────
# Le « 0 phrase en dur » du 2026-07-29 était honnête DANS SA DÉFINITION, et
# cette définition laissait passer le français le plus visible de tous :
#
#   1. LES MOTS SANS INDICE FRANÇAIS. `FR_HINT` exige un accent ou un mot-outil.
#      « Annuler », « Enregistrer », « Fermer », « Montant », « Retenues » n'ont
#      ni l'un ni l'autre : ce sont les LIBELLÉS DE BOUTONS, et 15 d'entre eux
#      étaient DÉJÀ traduits au dictionnaire — l'écran restait français parce que
#      l'appel ne demandait jamais la traduction. Invisible aux DEUX outils :
#      l'audit ne voit pas une clé qu'on ne lui demande pas, et le détecteur ne
#      voyait pas un mot sans accent.
#   2. LES CLÉS D'OBJET PORTEUSES DE TEXTE. On ne regardait que sept props JSX.
#      Les tables d'étiquettes (`{present:'Présent', due:'Impayé'}`), les
#      descriptions de modules (`desc:`), les colonnes (`what:`) sont du texte
#      d'interface qui n'a jamais vu `t()`.
#
# Ce qui n'est PAS du texte à traduire, et qu'on nomme ici une fois pour toutes
# plutôt que de le redécouvrir à chaque passage :
NOT_TEXT = re.compile(
    r'^(Coreon( Edu)?|coreon|edu|Kogia( ?Group)?|E-mail|Ctrl( K)?|esc|Esc|OK|CSV|PDF|'
    r'ZIP|API|URL|ID|OneRoster.*|sourcedId|manifest|Gradebook|Clever|Wonde|LMS|'
    r'English|Français|العربية)$', re.I)
# Ce que le motif `>…<` attrape ENCORE, et qui n'est pas du texte : une lecture de
# propriété (`x.avg` entre le `>` d'une flèche et le `<` d'une comparaison), un
# identifiant camelCase (`classId`), une variable d'une lettre. L'outil travaille
# au motif : il ne peut pas le SAVOIR, on le lui NOMME.
NOT_PROSE = re.compile(r'^([a-z][A-Za-z0-9_]*\.[a-z]|[a-z]+[A-Z][A-Za-z]*$|.$)')
# Clés d'objet qui ne portent jamais de texte d'interface (style, technique).
NOT_TEXT_KEY = re.compile(
    r'^(fontFamily|font|className|class|style|color|background|border|src|href|to|'
    r'path|route|key|id|type|icon|size|variant|align|dir|lang|locale|format|'
    r'currency|method|mode|role|tag|name)$')
# Un mot ou une expression : au moins une lettre, pas une expression de code.
WORDISH = re.compile(r'^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\'’·\-– ,\.!?]{0,60}$')
# Les balises JSX elles-mêmes, attrapées par le motif `>…<` sur un saut de ligne.
TAGNAME = re.compile(
    r'^(br|hr|div|span|p|b|i|em|strong|code|pre|td|th|tr|li|ul|ol|option|'
    r'button|input|label|form|section|main|nav|header|footer|small|sup|sub)$')


def findings(path):
    src = strip_comments(open(path, encoding='utf-8').read())
    out = []
    seen = set()

    def add(line, what):
        if (line, what) not in seen:
            seen.add((line, what))
            out.append((line, what))

    # 1) TEXTE JSX entre balises : >  Bonjour tout le monde  <
    for m in re.finditer(r'>([^<>{}\n]{4,120})<', src):
        txt = m.group(1).strip()
        if not txt or IGNORE.match(txt) or CODEISH.search(txt) or not FR_HINT.search(txt):
            continue
        # « Français » porte une cédille : l'indice français le désigne, alors
        # que c'est un NOM DE LANGUE — un sélecteur écrit chaque langue dans la
        # sienne. Cette famille-ci ne consultait pas la liste des non-textes.
        if NOT_TEXT.match(txt):
            continue
        add(src[:m.start()].count('\n') + 1, txt)
    # 1 bis) ANGLE MORT 1 — le MOT d'interface, même sans accent ni mot-outil.
    for m in re.finditer(r'>([^<>{}\n]{2,60})<', src):
        txt = m.group(1).strip()
        if (not txt or IGNORE.match(txt) or CODEISH.search(txt) or NOT_PROSE.match(txt)
                or TAGNAME.match(txt) or NOT_TEXT.match(txt) or not WORDISH.match(txt)):
            continue
        add(src[:m.start()].count('\n') + 1, txt)
    # 2) PROPS de texte : title="…", sub='…', label=…, placeholder=…
    for m in re.finditer(r'\b(title|sub|label|placeholder|hint|alt|aria-label)\s*=\s*(["\'])([^"\']{4,160})\2', src):
        txt = m.group(3).strip()
        if IGNORE.match(txt) or not FR_HINT.search(txt):
            continue
        add(src[:m.start()].count('\n') + 1, f'{m.group(1)}="{txt}"')
    # 2 bis) ANGLE MORT 2 — toute CLÉ D'OBJET qui porte du texte français.
    #
    # MAIS une table d'étiquettes n'est PAS un défaut : c'est le bon patron.
    # `{paid:'Payé'}` lu par `t(COL_FR[p.status])` est correctement traduit — le
    # français y est la CLÉ du dictionnaire, exactement comme `t('Payé')`. Au
    # niveau module c'est même la SEULE forme correcte : `t()` évalué à
    # l'import s'exécuterait avant `loadDict()` dans les pages chargées tôt et
    # figerait le français.
    # On ne signale donc que ce qui n'est lu par AUCUN `t(…)` : on relève les
    # jetons cités dans les appels à `t()` (le nom de la table, `COL_FR`, et les
    # propriétés lues, `.label`, `.what`), et on épargne les définitions qui en
    # font partie. Sans cela l'outil accusait 70 lignes déjà traduites, et un
    # « 0 » devenait impossible à atteindre — donc ininterprétable.
    wired = set()
    for c in re.finditer(r'\bt\(([^()]*(?:\([^()]*\)[^()]*)*)\)', src):
        inner = c.group(1)
        wired.update(re.findall(r'[A-Za-z_][A-Za-z0-9_]*', inner))
    for m in re.finditer(r'\b([a-z][a-zA-Z]{1,14})\s*:\s*(["\'])([^"\'\n]{3,200})\2', src):
        key, txt = m.group(1), m.group(3).strip()
        if NOT_TEXT_KEY.match(key) or IGNORE.match(txt) or NOT_TEXT.match(txt):
            continue
        if not FR_HINT.search(txt):
            continue
        if key in wired:
            continue
        # la table qui contient cette ligne : `const COL_FR = {` le plus proche
        head = src.rfind('const ', 0, m.start())
        owner = None
        if head != -1:
            mo = re.match(r'const\s+([A-Za-z_][A-Za-z0-9_]*)', src[head:head + 80])
            if mo and '\n\n' not in src[head:m.start()]:
                owner = mo.group(1)
        if owner and owner in wired:
            continue
        add(src[:m.start()].count('\n') + 1, f'{key}: {txt}')
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
