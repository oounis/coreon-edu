// LA MARQUE KOGIA, côté natif : un simple adaptateur react-native-svg.
// La géométrie vit dans core/src/mark.js, partagée avec le web.
// La baleine (whale.js) n'est PLUS le logo : c'est la mascotte.
// Source : brand/KOGIA_HARMONY.md §4
import Svg, { Path } from 'react-native-svg'
import { MARK_VIEWBOX, MARK_STEM, MARK_FLUKE } from '@core/mark.js'
import { BRAND } from '@core/tokens.js'

export function KogiaMark({ size = 64, color = BRAND.indigo }) {
  return (
    <Svg width={size} height={size} viewBox={MARK_VIEWBOX}>
      <Path d={MARK_STEM.d} stroke={color} strokeWidth={MARK_STEM.width} strokeLinecap="round" fill="none" />
      <Path d={MARK_FLUKE.d} fill={color} />
    </Svg>
  )
}
