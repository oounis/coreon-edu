// Printable cards: a flat 2D vector motif (same lucide icon family as the rest
// of the product) + a short attractive line, on a muted colour with a decorative
// frame. Exported as a print-ready PDF. No raster illustrations — design rule.
import { Home, Heart, Dog, Cat, MoonStar, Smile, BookOpen, Sparkles, Users, Trophy, CloudMoon, Flower2 } from 'lucide-react'

export const CARDS = [
  { id:'famille', Icon:Home,     text:'En famille, tout est plus doux.',      bg:'#FCE7E9', accent:'#E8748A', ink:'#8A3D4C' },
  { id:'maman',   Icon:Heart,    text:'Dans les bras de Maman.',              bg:'#FFEEDF', accent:'#F0955A', ink:'#9A5A2E' },
  { id:'chien',   Icon:Dog,      text:'Mon meilleur ami a quatre pattes.',    bg:'#EBF3DC', accent:'#7CAE4E', ink:'#4F6E2E' },
  { id:'chat',    Icon:Cat,      text:'Un câlin qui ronronne.',               bg:'#EFE7F8', accent:'#9B7BD0', ink:'#5E4690' },
  { id:'reve',    Icon:MoonStar, text:'Rêve grand, aime plus fort.',          bg:'#DFF1EF', accent:'#4FB0A6', ink:'#2E6E68' },
  { id:'sourire', Icon:Smile,    text:'Ton sourire illumine tout.',           bg:'#FFF6D9', accent:'#EDB53A', ink:'#8F6E17' },
  { id:'livre',   Icon:BookOpen, text:'Un livre, mille aventures.',           bg:'#FFF0D8', accent:'#E0912F', ink:'#8A5A17' },
  { id:'lire2',   Icon:Sparkles, text:'Lire à deux, c’est magique.',          bg:'#DEEBFF', accent:'#4F84E0', ink:'#2E518F' },
  { id:'amis',    Icon:Users,    text:'Les amis rendent tout plus beau.',     bg:'#E7F3D9', accent:'#5FA83C', ink:'#3E6E22' },
  { id:'effort',  Icon:Trophy,   text:'Aujourd’hui, je fais de mon mieux !',  bg:'#DBEFEC', accent:'#3FA79C', ink:'#256E64' },
  { id:'rever',   Icon:CloudMoon,text:'Prends le temps de rêver.',            bg:'#EEE6F8', accent:'#8A6FC0', ink:'#57408F' },
  { id:'mamie',   Icon:Flower2,  text:'Auprès de Mamie, on se sent bien.',    bg:'#FDE8EC', accent:'#E06A86', ink:'#8F3A4E' },
]
