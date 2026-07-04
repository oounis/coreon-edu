// In-platform illustrated storybooks. Read-only (shown as slides, never
// downloadable). One of the user's watercolor illustrations per page, on a soft
// background colour — no drawn/generated artwork.
export const art = n => `${import.meta.env.BASE_URL}art/${n}.png`

export const BOOKS = [
  {
    id: 'calins',
    title: 'Le plus grand des câlins',
    subtitle: 'Une histoire toute douce',
    ages: '2 – 6 ans',
    cover: { img:'c33', bg:'#F6C9C9' },
    pages: [
      { img:'c16', bg:'#FFDEE6', text:'Le matin, je fais un premier câlin à Maman. Un câlin tout doux, pour bien commencer la journée.' },
      { img:'c48', bg:'#D9E8FF', text:'Puis un gros câlin à Papa — si fort qu’il me soulève tout en haut, dans les airs !' },
      { img:'c29', bg:'#E6F1D6', text:'J’adore serrer mon chien dans mes bras. Il remue la queue et me lèche le bout du nez.' },
      { img:'c64', bg:'#ECE3F7', text:'Le chat aussi veut son câlin… quand il est bien d’accord ! Ronron, ronron.' },
      { img:'c36', bg:'#FBE7CE', text:'Chez Papi, les câlins sont chauds comme un gros pull en laine. On ne veut plus les lâcher.' },
      { img:'c15', bg:'#FDE0CE', text:'Avec ma meilleure amie, on se fait des câlins-surprise. Et on rit, et on rit encore !' },
      { img:'c75', bg:'#D7EEEC', text:'Et si je pouvais, je ferais le plus GÉANT des câlins… à un éléphant tout entier !' },
    ],
    end: { bg:'#F6C9C9', img:'c33', title:'Fin', text:'Des grands, des petits, des tout-doux… un câlin, ça réchauffe le cœur pour toute la journée.' },
  },
]
