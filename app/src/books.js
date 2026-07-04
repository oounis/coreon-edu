// In-platform illustrated storybooks. Text is written to match each watercolor
// illustration (artist-2 transparent set, app/public/art/*.png). Read-only —
// shown as slides in the reader, never downloadable.
export const art = n => `${import.meta.env.BASE_URL}art/${n}.png`

export const THEMES = {
  cover:   { bg:'linear-gradient(160deg,#4534A8 0%,#211C52 100%)', ink:'#FFFFFF', sub:'#C9CDF7', frame:'rgba(255,255,255,.35)', panel:'rgba(255,255,255,.12)', stars:true },
  night:   { bg:'linear-gradient(160deg,#2A3576 0%,#4A3A8C 100%)', ink:'#FFFFFF', sub:'#D3D8FA', frame:'rgba(255,255,255,.30)', panel:'rgba(255,255,255,.14)', stars:true },
  kitchen: { bg:'linear-gradient(160deg,#FFF6E6 0%,#FFE1C4 100%)', ink:'#6A4A2E', sub:'#9A7A55', frame:'#F0C892', panel:'#FFFFFF' },
  jungle:  { bg:'linear-gradient(160deg,#E7F6E3 0%,#C4E9C6 100%)', ink:'#2F5233', sub:'#5A7B5E', frame:'#A6D6A8', panel:'#FFFFFF' },
  sea:     { bg:'linear-gradient(160deg,#DBF1F6 0%,#A7DCEB 100%)', ink:'#124C5E', sub:'#4A7E8C', frame:'#8FCEDD', panel:'#FFFFFF' },
  sky:     { bg:'linear-gradient(160deg,#EAF2FF 0%,#CBE0FF 100%)', ink:'#264060', sub:'#5A7196', frame:'#A9C8F0', panel:'#FFFFFF' },
  warm:    { bg:'linear-gradient(160deg,#FFEAEE 0%,#FFD6CC 100%)', ink:'#7A3B4A', sub:'#A9707C', frame:'#F3B7B0', panel:'#FFFFFF' },
  end:     { bg:'linear-gradient(160deg,#4534A8 0%,#211C52 100%)', ink:'#FFFFFF', sub:'#C9CDF7', frame:'rgba(255,255,255,.35)', panel:'rgba(255,255,255,.12)', stars:true },
}

export const BOOKS = [
  {
    id: 'grand',
    title: 'Quand je serai grand',
    subtitle: 'Une histoire pour rêver grand',
    ages: '3 – 7 ans',
    cover: { theme:'cover', art:[94] },
    pages: [
      { theme:'night',   art:[76],       text:'Quand je serai grand, je m’envolerai très, très haut… jusqu’aux étoiles. Je serai astronaute, et je dirai bonjour à la Lune !' },
      { theme:'kitchen', art:[73],       text:'Ou alors, je serai chef cuisinier. Je préparerai de bons petits plats qui sentent tout bon dans toute la maison.' },
      { theme:'jungle',  art:[75,38],    text:'Peut-être que j’explorerai la grande jungle verte… et que je deviendrai l’ami d’une girafe toute douce et un peu rigolote.' },
      { theme:'sea',     art:[88],       text:'Sur les mers bleues, je serai un pirate courageux, à la recherche d’un trésor caché tout au bout du monde.' },
      { theme:'sky',     art:[102,100],  text:'Je serai peut-être bâtisseur. Je construirai de jolies maisons solides, où les familles vivront bien au chaud.' },
      { theme:'warm',    art:[41],       text:'Mais tu sais quoi ? Aujourd’hui, je suis déjà un enfant qui rêve très fort… et ça, c’est le plus beau des métiers.' },
    ],
    end: { theme:'end', title:'Fin', text:'Et toi, que veux-tu devenir quand tu seras grand ?' },
  },
]
