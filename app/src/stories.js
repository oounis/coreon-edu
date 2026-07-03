// "Le Coin des Histoires" — petits magazines illustrés pour enfants.
// Chaque histoire = pages {img (public/library/N.jpg), texte court en français simple}.
const A=import.meta.env.BASE_URL
const img=n=>`${A}library/${n}.jpg`

export const STORIES=[
  {
    id:'ecole', title:'Une belle journée à l’école', subtitle:'On apprend, on joue, on grandit', color:'#6C5CE7', cover:49, cat:'École',
    pages:[
      {n:37, t:'Le matin, le bus jaune vient chercher les enfants. Tout le monde est content d’aller à l’école !'},
      {n:49, t:'En classe, la maîtresse lit une belle histoire. Les enfants écoutent avec de grands yeux.'},
      {n:35, t:'On apprend les lettres : A, B, C… Bientôt, on saura lire tout seul !'},
      {n:32, t:'Sur l’ordinateur, on découvre plein de choses. Apprendre, c’est magique.'},
      {n:12, t:'À la récréation, on court, on rit et on joue avec les copains.'},
      {n:46, t:'Avant de rentrer, on dessine notre plus beau souvenir de la journée.'},
    ],
  },
  {
    id:'saisons', title:'Le tour des quatre saisons', subtitle:'Hiver, printemps, été, automne', color:'#22C55E', cover:24, cat:'Saisons',
    pages:[
      {n:9,  t:'En hiver, la neige tombe. On construit un grand bonhomme de neige !'},
      {n:3,  t:'On glisse sur la neige à toute vitesse. On tient bien l’équilibre !'},
      {n:18, t:'Au printemps, les petites graines se réveillent et poussent doucement.'},
      {n:19, t:'Le tournesol grandit, grandit… et devient plus grand que nous !'},
      {n:24, t:'En été, le soleil brille très fort. On joue dehors toute la journée.'},
      {n:33, t:'En automne, les feuilles tombent. Que de jolies couleurs !'},
    ],
  },
  {
    id:'planete', title:'Protégeons notre planète', subtitle:'La Terre est notre maison', color:'#0EA5E9', cover:6, cat:'Écologie',
    pages:[
      {n:6,  t:'La Terre est notre maison à tous. Il faut en prendre bien soin !'},
      {n:11, t:'On plante des arbres pour avoir plus d’ombre et un air tout propre.'},
      {n:50, t:'Tous ensemble, on s’occupe du jardin de l’école.'},
      {n:18, t:'On arrose les plantes, et elles grandissent un peu chaque jour.'},
      {n:20, t:'Les fleurs rendent le monde plus beau. Regardons-les sans les cueillir !'},
    ],
  },
  {
    id:'sante', title:'Propre et en bonne santé', subtitle:'De bonnes habitudes chaque jour', color:'#FF6B81', cat:'Santé', cover:36,
    pages:[
      {n:36, t:'Avant de manger, on se lave bien les mains avec du savon.'},
      {n:31, t:'On mange de bons fruits et légumes pour être fort et en forme.'},
      {n:29, t:'Quand on est malade, le docteur nous soigne avec douceur.'},
      {n:21, t:'Même les animaux aiment être propres ! Celui-là a un peu froid.'},
    ],
  },
  {
    id:'aventure', title:'Grande aventure en plein air', subtitle:'Partons explorer le monde', color:'#F59E0B', cat:'Aventure', cover:48,
    pages:[
      {n:27, t:'On met le sac à dos et on part marcher dans la montagne.'},
      {n:39, t:'Sur le petit bateau, on essaie d’attraper un poisson.'},
      {n:48, t:'Le soir, on plante la tente et on dort sous les étoiles.'},
      {n:45, t:'En voiture, toute la famille part en voyage. Youpi !'},
      {n:47, t:'Le petit train nous emmène vers de nouvelles aventures.'},
    ],
  },
]
export const storyImg=img
