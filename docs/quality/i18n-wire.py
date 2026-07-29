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

def wire(src):
    changed, skipped = 0, []

    def keep(txt):
        return bool(txt) and not IGNORE.match(txt) and FR_HINT.search(txt)

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
    src = re.sub(PROPS + r'\s*=\s*"([^"]{2,200})"', prop_sub, src)
    src = re.sub(PROPS + r"\s*=\s*'([^']{2,200})'", prop_sub, src)

    # ── 2) texte JSX entre balises : >Texte< → >{t('Texte')}<
    def text_sub(m):
        nonlocal changed
        raw = m.group(1)
        txt = raw.strip()
        if not keep(txt):
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
    args = [a for a in sys.argv[1:] if a not in ('--dry', '--all')]
    dry = '--dry' in sys.argv
    if '--all' in sys.argv:
        args = [os.path.relpath(f, ROOT) for f in glob.glob(os.path.join(ROOT, 'app/src/**/*.jsx'), recursive=True)
                if os.path.basename(f) not in SKIP]
    total, left = 0, []
    for rel in args:
        p = os.path.join(ROOT, rel)
        src = open(p, encoding='utf-8').read()
        new, n, skipped = wire(src)
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
