// LA MARQUE, côté natif : un adaptateur react-native-svg.
// La géométrie vit une seule fois dans core/src/mark.js, partagée avec le web.
import Svg, { Path } from 'react-native-svg'
import { MARK_VIEWBOX, MARK_RATIO, MARK_BODY, MARK_SPOUT, MARK_SPOUT_WIDTH } from '@core/mark.js'
import { BRAND } from '@core/tokens.js'

export function KogiaMark({ size = 64, color = BRAND.action }) {
  return (
    <Svg width={size} height={size * MARK_RATIO} viewBox={MARK_VIEWBOX}>
      <Path fill={color} fillRule="evenodd" d={MARK_BODY} />
      <Path d={MARK_SPOUT} fill="none" stroke={color} strokeWidth={MARK_SPOUT_WIDTH}
        strokeLinecap="round" opacity={0.85} />
    </Svg>
  )
}
