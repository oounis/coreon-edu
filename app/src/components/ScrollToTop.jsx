import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// À chaque changement de PAGE, on remonte en haut. Sans ça, cliquer « Demandes »
// depuis le bas d'une longue page ouvrait la nouvelle page à mi-hauteur.
//
// Robustesse : (1) on écrit scrollTop DIRECTEMENT sur l'élément qui défile —
// c'est instantané et ça IGNORE html{scroll-behavior:smooth} (contrairement à
// scrollTo, qui lui obéit et animerait) ; (2) les pages sont chargées à la
// demande (React.lazy + Suspense) : leur contenu — souvent plus grand — n'est
// monté qu'aux ticks suivants, et le navigateur peut restaurer la position de
// l'ancienne page. On remet donc en haut TOUT DE SUITE, puis à la frame
// suivante, puis après un court délai, pour couvrir le montage tardif.
function toTop() {
  const el = document.scrollingElement || document.documentElement
  if (el) el.scrollTop = 0
  if (document.body) document.body.scrollTop = 0
  window.scrollTo(0, 0)
}

export default function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    toTop()
    const r = requestAnimationFrame(toTop)
    const t = setTimeout(toTop, 80)
    return () => { cancelAnimationFrame(r); clearTimeout(t) }
  }, [pathname])
  return null
}
