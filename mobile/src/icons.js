// Résolution des icônes du cœur, côté Android/iOS.
//
// `core/` désigne ses icônes par leur NOM ("Star", "Radio", …). Ce fichier est
// la moitié native de ce contrat — le web a le sien (`app/src/icons.jsx`, qui
// pointe sur `lucide-react`). Les deux exposent la même chose : <Ic n="Star"/>.
import * as L from 'lucide-react-native'

export const iconOf = name => L[name] || L.Circle

export function Ic({ n, ...rest }) {
  const C = iconOf(n)
  return <C {...rest} />
}
