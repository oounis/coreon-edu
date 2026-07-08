// ── The single source of truth for subject & place iconography. ──
// Every module that shows a subject or a school place (live map, timetable,
// evaluation, homework…) uses these lucide icons + colours, so the whole
// product speaks one visual language. No raster images.
import { Calculator, FlaskConical, BookOpen, BookText, Languages, Music, Palette, Monitor,
  Dumbbell, MoonStar, Landmark, UtensilsCrossed, Trees, LogIn, LogOut, NotebookPen } from 'lucide-react'

const RULES=[
  [/math/,               Calculator,   '#6C5CE7'],
  [/scien|éveil|eveil/,  FlaskConical, '#10B981'],
  [/fran/,               BookOpen,     '#4F84E0'],
  [/arabe/,              BookText,     '#E59A12'],
  [/angl/,               Languages,    '#0BA5D8'],
  [/musi/,               Music,        '#DB2777'],
  [/art|dessin/,         Palette,      '#F43F5E'],
  [/info|techno/,        Monitor,      '#0D9488'],
  [/sport|physique|éduc/,Dumbbell,     '#F97316'],
  [/islam|coran/,        MoonStar,     '#8B5CF6'],
  [/civi/,               Landmark,     '#64748B'],
]
export function subjectMeta(label=''){
  const l=String(label).toLowerCase()
  for(const [re,Icon,color] of RULES) if(re.test(l)) return {Icon,color}
  return {Icon:NotebookPen,color:'#6C5CE7'}
}
// Places of the school day (arrival, recess, canteen…) — same visual family.
export const PLACES={
  arrivee:{Icon:LogIn,            color:'#7C8698'},
  sortie: {Icon:LogOut,           color:'#7C8698'},
  recre:  {Icon:Trees,            color:'#22C55E'},
  cantine:{Icon:UtensilsCrossed,  color:'#F59E0B'},
  etude:  {Icon:NotebookPen,      color:'#6C5CE7'},
}
// Small colour-coded icon tile for a subject (lists, grids, timetable cells).
export function SubjectDot({ label, size=36, iconSize=17, radius='rounded-xl', className='' }){
  const {Icon,color}=subjectMeta(label)
  return <span className={`${radius} grid place-items-center shrink-0 ${className}`}
    style={{width:size,height:size,background:color+'16',color}}><Icon size={iconSize}/></span>
}
