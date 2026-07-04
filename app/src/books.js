// In-platform illustrated storybooks. Read-only (shown as slides, never
// downloadable). Each page is a painted SVG scene (components/Scenes.jsx) with
// the same watercolor hero (Nour = art 32) placed inside it, so it reads like a
// real picture book — one hero, a real plot, full illustrated worlds.
export const art = n => `${import.meta.env.BASE_URL}art/${n}.png`

export const BOOKS = [
  {
    id: 'etoile',
    title: 'Nour et la petite étoile',
    subtitle: 'Une histoire du soir',
    ages: '3 – 7 ans',
    cover: {
      scene: 'cover',
      figures: [{ n: 32, x: '46%', w: '38%', bottom: '17%' }],
      star: { x: '66%', top: '26%', size: 58, mood: 'happy' },
    },
    pages: [
      { scene:'dusk', figures:[{ n:32, x:'34%', w:'30%' }],
        text:'Ce soir-là, Nour n’avait pas du tout sommeil. Par la fenêtre, elle regardait le ciel qui s’allumait, plein de petites étoiles brillantes.' },

      { scene:'night', figures:[{ n:32, x:'48%', w:'30%', bottom:'27%', flip:true }], star:{ x:'29%', bottom:'25%', size:50, mood:'sad' },
        text:'Soudain… floup ! Une toute petite étoile glissa du ciel et tomba tout doucement dans l’herbe du jardin.' },

      { scene:'night', figures:[{ n:32, x:'54%', w:'31%', bottom:'27%', flip:true }], star:{ x:'31%', bottom:'25%', size:48, mood:'sad' },
        text:'La petite étoile était perdue, loin de sa maison. « N’aie pas peur, murmura Nour. Je vais t’aider à remonter là-haut, tout en haut du ciel. »' },

      { scene:'savanna', figures:[{ n:38, x:'66%', w:'34%' },{ n:32, x:'30%', w:'26%' }], star:{ x:'44%', bottom:'52%', size:34, mood:'happy' },
        text:'Nour appela son amie la girafe, qui avait le plus long cou du monde. « Grimpe sur ma tête, dit la girafe en riant, et tiens-toi bien ! »' },

      { scene:'mountain', figures:[{ n:32, x:'48%', w:'24%', bottom:'26%' }], star:{ x:'60%', bottom:'40%', size:30, mood:'happy' },
        text:'Elles grimpèrent la plus haute montagne, plus haut que les arbres, plus haut que les nuages, jusqu’au sommet tout froid.' },

      { scene:'top', figures:[{ n:32, x:'40%', w:'24%', bottom:'17%' }], star:{ x:'58%', top:'22%', size:66, mood:'happy' },
        text:'Alors Nour leva les bras très fort et rendit la petite étoile au ciel. L’étoile brilla plus que toutes les autres et lui fit un joli clin d’œil.' },

      { scene:'bedroom', figures:[{ n:32, x:'62%', w:'26%', bottom:'26%' }], star:{ x:'80%', top:'20%', size:30, mood:'happy' },
        text:'Le cœur tout content, Nour se glissa sous sa couverture bien chaude. Et cette nuit-là, elle fit les plus beaux rêves du monde entier.' },
    ],
    end: { scene:'end', title:'Fin', text:'Bonne nuit, Nour… et fais de beaux rêves.' },
  },
]
