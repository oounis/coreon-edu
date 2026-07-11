// Jetons visuels partagés des écrans natifs — même langage que le web
// (canvas doux, cartes blanches arrondies, encre sombre, accent par rôle).
import { StyleSheet } from 'react-native'

export const C = {
  canvas: '#F7F8FC',
  card: '#FFFFFF',
  ink: '#10162B',
  muted: '#6B7280',
  line: '#E5E7EB',
  danger: '#E5484D',
}

// Familles Nunito (chargées dans App.js) — la même voix que le web.
export const F = {
  black: 'Nunito_800ExtraBold',
  bold: 'Nunito_700Bold',
  semi: 'Nunito_600SemiBold',
}

export const S = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.canvas },
  card: {
    backgroundColor: C.card, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: C.line,
  },
  h1: { fontSize: 26, fontFamily: F.black, fontWeight: '800', color: C.ink },
  sub: { fontSize: 14, fontFamily: F.semi, color: C.muted, marginTop: 2 },
  label: { fontSize: 12, fontFamily: F.semi, fontWeight: '600', color: C.muted },
  value: { fontSize: 22, fontFamily: F.black, fontWeight: '800', color: C.ink },
})
