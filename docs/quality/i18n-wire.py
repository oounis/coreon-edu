#!/usr/bin/env python3
# ════════════════════════════════════════════════════════════════════════════
# CÂBLER le français en dur sur t() — la moitié que i18n-raw.py a révélée.
#
#   python3 docs/quality/i18n-wire.py --dry app/src/pages/Journal.jsx
#   python3 docs/quality/i18n-wire.py app/src/pages/Journal.jsx [autres…]
#   python3 docs/quality/i18n-wire.py --all
#
# CE QU'IL FAIT, ET RIEN D'AUTRE :
#   >Texte<              →  >{t('Texte')}<
#   title="Texte"        →  title={t('Texte')}
# et ajoute `import { t } from '@core/i18n.js'` si le fichier ne l'a pas.
#
# CE QU'IL REFUSE DE TOUCHER (laissé à la main, signalé en fin de passage) :
#   · tout texte contenant { } (interpolation) — la soudure se décide à la main ;
#   · tout ce qui est déjà dans un t(…) ;
#   · les fichiers de dictionnaire.
# Un codemod qui devine est un codemod qui casse : il vaut mieux qu'il en laisse.
# ════════════════════════════════════════════════════════════════════════════
import re, sys, os, glob

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SKIP = {'i18n.js', 'i18n.ar.js', 'i18n.en.js'}
FR_HINT = re.compile(r'[àâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ]|\b(le|la|les|un|une|des|du|de|et|ou|pour|par|sur|dans|avec|sans|aucun|aucune|tous|toutes|votre|vos|ce|cette|qui|que|est|sont|pas|plus|jamais|déjà)\b', re.I)
IGNORE = re.compile(r'^[\s\d\W]*$|^(https?:|/|#|@|\.|[A-Z_]+$)')
PROPS = r'(title|sub|label|placeholder|hint|alt|aria-label)'

def jsq(s):
    """La chaîne JS la plus lisible : on choisit le guillemet qui évite l'échappement."""
    return '"%s"' % s if "'" in s and '"' not in s else "'%s'" % s.replace("'", "\\'")

# ── MODE --words (2026-07-30) ────────────────────────────────────────────────
# `FR_HINT` exige un accent ou un mot-outil : « Annuler », « Enregistrer »,
# « Fermer », « Montant » n'ont ni l'un ni l'autre. Ce sont les LIBELLÉS DE
# BOUTONS — le texte le plus vu du produit — et une bonne partie était DÉJÀ
# traduite : l'écran restait français parce que l'appel ne demandait rien.
#
# Ce mode câble le MOT d'interface, sans exiger d'indice français. Il ne touche
# QUE des nœuds de texte JSX (`>Annuler<`), jamais une clé d'objet : au niveau
# module, `t()` s'évaluerait avant `loadDict()` dans les pages chargées tôt
# (Login, Landing) et figerait le français. Les tables d'étiquettes se traduisent
# À LA LECTURE, à la main.
NOT_TEXT = re.compile(
    r'^(Coreon( Edu)?|coreon|edu|Kogia( ?Group)?|E-mail|Ctrl( K)?|esc|Esc|OK|CSV|PDF|'
    r'ZIP|API|URL|ID|sourcedId|manifest|Gradebook|Clever|Wonde|LMS)$', re.I)
WORDISH = re.compile(r'^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\'’·\-– ,\.!?]{0,60}$')
TAGNAME = re.compile(
    r'^(br|hr|div|span|p|b|i|em|strong|code|pre|td|th|tr|li|ul|ol|option|'
    r'button|input|label|form|section|main|nav|header|footer|small|sup|sub)$')
# LE PIÈGE, RENCONTRÉ DEUX FOIS. Le motif `>…<` travaille au texte, pas à
# l'arbre : entre le `>` d'une balise et le `<` de la suivante il peut y avoir
# du JS. `return <div …>` a donné `{t('return')} <div …>` — un mot-clé câblé.
# Sans indice français, plus rien ne distinguait le mot du code : il faut donc
# nommer les mots-clés, ET refuser un nœud qui saute une ligne (un libellé de
# bouton vit sur la même ligne que sa balise ; ce qui traverse un saut de ligne
# est presque toujours du code). Le mode accentué, lui, garde les deux.
KEYWORD = re.compile(
    r'^(return|const|let|var|if|else|for|while|function|class|export|import|'
    r'default|null|undefined|true|false|await|async|new|typeof|instanceof|'
    r'this|props|children|case|break|continue|switch|try|catch|finally|throw|'
    r'delete|void|yield|extends|super|do|in|of)$')


def wire(src, words=False):
    changed, skipped = 0, []

    def keep(txt, raw=None):
        if not txt or IGNORE.match(txt):
            return False
        if FR_HINT.search(txt):
            return True
        # mode --words : un mot d'interface, même sans accent ni mot-outil
        if not words:
            return False
        if raw is not None and '\n' in raw:
            return False
        return bool(WORDISH.match(txt) and not TAGNAME.match(txt)
                    and not NOT_TEXT.match(txt) and not KEYWORD.match(txt))

    # ── 1) props : title="…" → title={t('…')}
    # DEUX motifs, un par sorte de guillemet : une apostrophe française dans une
    # valeur entre guillemets doubles (`sub="Ce que l'école a partagé"`) est
    # parfaitement légale — un motif unique en [^"\'] la manquait en silence.
    def prop_sub(m):
        nonlocal changed
        name, txt = m.group(1), m.group(2).strip()
        if not keep(txt):
            return m.group(0)
        if '{' in txt or '}' in txt:
            skipped.append(f'{name}={txt}'); return m.group(0)
        changed += 1
        return '%s={t(%s)}' % (name, jsq(txt))
    # En mode --words on NE touche PAS aux props : le motif `label='…'` attrape
    # aussi un PARAMÈTRE PAR DÉFAUT déstructuré, et sans indice français le
    # filtre ne rattraperait plus la différence. Les props françaises sont déjà
    # câblées par le mode normal ; les rares restantes se font à la main.
    if not words:
        src = re.sub(PROPS + r'\s*=\s*"([^"]{2,200})"', prop_sub, src)
        src = re.sub(PROPS + r"\s*=\s*'([^']{2,200})'", prop_sub, src)

    # ── 2) texte JSX entre balises : >Texte< → >{t('Texte')}<
    def text_sub(m):
        nonlocal changed
        raw = m.group(1)
        txt = raw.strip()
        if not keep(txt, raw):
            return m.group(0)
        if '{' in raw or '}' in raw:
            skipped.append(txt); return m.group(0)
        changed += 1
        lead = raw[:len(raw) - len(raw.lstrip())]
        tail = raw[len(raw.rstrip()):]
        return '>%s{t(%s)}%s<' % (lead, jsq(txt), tail)
    src = re.sub(r'>([^<>{}]{2,200})<', text_sub, src)

    return src, changed, skipped

def ensure_import(src):
    if re.search(r"import\s*\{[^}]*\bt\b[^}]*\}\s*from\s*'@core/i18n\.js'", src):
        return src
    m = re.search(r"^import \{([^}]*)\} from '@core/i18n\.js'\n", src, re.M)
    if m:
        return src[:m.start()] + "import { %s, t } from '@core/i18n.js'\n" % m.group(1).strip() + src[m.end():]
    m2 = re.search(r'^import .*\n', src, re.M)
    return src[:m2.end()] + "import { t } from '@core/i18n.js'\n" + src[m2.end():]

def main():
    args = [a for a in sys.argv[1:] if a not in ('--dry', '--all', '--words')]
    dry = '--dry' in sys.argv
    words = '--words' in sys.argv
    if '--all' in sys.argv:
        args = [os.path.relpath(f, ROOT) for f in glob.glob(os.path.join(ROOT, 'app/src/**/*.jsx'), recursive=True)
                if os.path.basename(f) not in SKIP]
    total, left = 0, []
    for rel in args:
        p = os.path.join(ROOT, rel)
        src = open(p, encoding='utf-8').read()
        new, n, skipped = wire(src, words=words)
        if n:
            new = ensure_import(new)
            total += n
            if not dry:
                open(p, 'w', encoding='utf-8').write(new)
            print('%s  %+d' % (rel, n))
        for s in skipped:
            left.append((rel, s))
    print('\n%d chaînes câblées%s' % (total, ' (essai à blanc)' if dry else ''))
    if left:
        print('%d laissées à la main (interpolation) :' % len(left))
        for rel, s in left[:40]:
            print('   %s — %s' % (rel, s[:90]))

main()
