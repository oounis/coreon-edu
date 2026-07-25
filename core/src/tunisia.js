// Référentiel scolaire — désormais PILOTÉ PAR LE PACK DE PAYS ACTIF (locales.js).
// Ce fichier garde son nom et ses exports pour ne rien casser, mais tout ce qui
// est propre à un pays (régions, pièce d'identité, cadre légal) délègue au pack :
// la Tunisie reste le défaut, sans être une supposition (CR-004).
import { regions as packRegions, idLabelFor as packIdLabel, validId as packValidId, legal as packLegal, regionLabel as packRegionLabel } from './locales.js'

// Les régions du pays choisi (les 24 gouvernorats en Tunisie, la liste du pays
// actif ailleurs). Fonctions : le pack peut changer à l'exécution.
export const regionsOf = () => packRegions()
export const regionLabel = () => packRegionLabel()

// Fonctions du personnel d'un établissement scolaire tunisien (groupées)
export const STAFF_POSITIONS=[
  {group:"Direction", items:["Directeur","Directrice","Directeur adjoint"]},
  {group:"Enseignement", items:["Instituteur","Institutrice","Professeur","Maître d'application","Enseignant suppléant"]},
  {group:"Vie scolaire", items:["Surveillant général","Surveillant","Conseiller principal d'éducation (CPE)"]},
  {group:"Administration", items:["Censeur","Secrétaire","Agent administratif","Adjoint administratif"]},
  {group:"Finance", items:["Économe / Intendant","Comptable"]},
  {group:"Support", items:["Documentaliste","Infirmier(ère)","Technicien de laboratoire","Psychologue scolaire","Agent d'entretien","Concierge","Chauffeur"]},
]
export const ALL_POSITIONS=STAFF_POSITIONS.flatMap(g=>g.items)

// Pièces à fournir selon le type de profil
export const DOC_TYPES={
  student:["Extrait de naissance","Photo d'identité","Certificat de scolarité / Bulletin","Carnet de vaccination","Copie CIN du tuteur","Certificat médical"],
  teacher:["Copie CIN","Diplôme(s)","CV","Contrat de travail","Bulletin n°3 (casier judiciaire)","RIB bancaire","Photo d'identité"],
  staff:["Copie CIN","Diplôme(s)","CV","Contrat de travail","Bulletin n°3 (casier judiciaire)","RIB bancaire","Photo d'identité"],
  parent:["Copie CIN","Justificatif de domicile"],
}
export const docTypesFor=role=> role==='parent'?DOC_TYPES.parent : role==='teacher'?DOC_TYPES.teacher : DOC_TYPES.staff

// Pièce d'identité : le libellé ET la validation viennent du pack de pays.
// validCIN garde son nom (des écrans l'importent) mais valide selon le pack :
// 8 chiffres en Tunisie, règle souple ailleurs tant qu'on ne connaît pas le pays.
export const idLabelFor=role=> packIdLabel(role)
export const validCIN=v=> packValidId(v)

// Demandes — schémas détaillés par type (champs + circuit de validation)
export const REQUEST_DEFS={
  "Demande de congé":{group:"RH",audience:["teacher","supervisor","admin"],chain:["schooladmin"],doc:false,
    note:"Selon la réglementation locale du travail et le contrat de l'employé. Maladie : justificatif requis.",
    fields:[{k:"leaveType",l:"Type de congé",t:"select",o:["Congé annuel","Congé maladie","Congé maternité","Congé paternité","Congé sans solde","Congé exceptionnel (familial)"],req:1},
      {k:"from",l:"Du",t:"date",req:1},{k:"to",l:"Au",t:"date",req:1},{k:"days",l:"Nombre de jours",t:"number"},
      {k:"reason",l:"Motif",t:"textarea"},{k:"replacement",l:"Remplaçant / passation",t:"text"},{k:"cert",l:"Certificat médical (si maladie)",t:"attach"}]},
  "Autorisation d'absence":{group:"RH",audience:["teacher","supervisor","admin"],chain:["schooladmin"],doc:false,
    fields:[{k:"date",l:"Date",t:"date",req:1},{k:"duration",l:"Durée",t:"select",o:["Journée complète","Matinée","Après-midi","Heures précises"]},
      {k:"fromH",l:"De (heure)",t:"time"},{k:"toH",l:"À (heure)",t:"time"},{k:"reason",l:"Motif",t:"textarea",req:1},{k:"justif",l:"Justificatif",t:"attach"}]},
  "Attestation de travail":{group:"Documents",audience:["teacher","supervisor","admin"],chain:["admin","schooladmin"],doc:true,
    fields:[{k:"addressedTo",l:"Destinataire (à qui de droit / organisme)",t:"text"},{k:"purpose",l:"Usage / motif",t:"text"},{k:"copies",l:"Nombre de copies",t:"number"}]},
  "Attestation de salaire":{group:"Documents",audience:["teacher","supervisor","admin"],chain:["admin","schooladmin"],doc:true,
    fields:[{k:"addressedTo",l:"Destinataire (banque / organisme)",t:"text"},{k:"purpose",l:"Motif",t:"text"},{k:"copies",l:"Nombre de copies",t:"number"}]},
  "Avance sur salaire":{group:"RH",audience:["teacher","supervisor","admin"],chain:["admin","schooladmin","owner"],doc:false,
    note:"Remboursement par mensualités, selon la politique de l'école et la réglementation locale du travail.",
    fields:[{k:"amount",l:"Montant demandé",t:"number",req:1},{k:"reason",l:"Motif",t:"textarea",req:1},{k:"months",l:"Remboursement (nb de mensualités)",t:"number"}]},
  "Demande de mutation":{group:"RH",audience:["teacher","supervisor","admin"],chain:["schooladmin","owner"],doc:false,
    fields:[{k:"target",l:"Établissement / affectation souhaitée",t:"text",req:1},{k:"reasonType",l:"Motif",t:"select",o:["Rapprochement familial","Raison de santé","Convenance personnelle","Autre"]},{k:"date",l:"Date souhaitée",t:"date"},{k:"details",l:"Détails",t:"textarea"}]},
  "Demande de formation":{group:"RH",audience:["teacher","supervisor","admin"],chain:["schooladmin","owner"],doc:false,
    fields:[{k:"title",l:"Intitulé de la formation",t:"text",req:1},{k:"org",l:"Organisme",t:"text"},{k:"from",l:"Du",t:"date"},{k:"to",l:"Au",t:"date"},{k:"cost",l:"Coût estimé",t:"number"},{k:"goal",l:"Objectif",t:"textarea"}]},
  "Demande de matériel":{group:"Logistique",audience:["teacher","supervisor","admin"],chain:["admin","schooladmin"],doc:false,
    fields:[{k:"items",l:"Articles demandés",t:"textarea",req:1},{k:"qty",l:"Quantité totale",t:"number"},{k:"budget",l:"Budget estimé",t:"number"},{k:"justif",l:"Justification",t:"textarea"}]},
  "Certificat de scolarité":{group:"Élève",audience:["parent"],chain:["admin"],doc:true,
    fields:[{k:"child",l:"Enfant",t:"child",req:1},{k:"year",l:"Année scolaire",t:"text",def:"2026 / 2027"},{k:"addressedTo",l:"Destinataire",t:"text"},{k:"copies",l:"Nombre de copies",t:"number"}]},
  "Autorisation de sortie":{group:"Élève",audience:["parent"],chain:["schooladmin"],doc:false,
    fields:[{k:"child",l:"Enfant",t:"child",req:1},{k:"event",l:"Sortie / événement",t:"text",req:1},{k:"date",l:"Date",t:"date"},{k:"discharge",l:"Je décharge l'établissement de toute responsabilité durant la sortie",t:"checkbox"}]},
  "Justificatif d'absence (élève)":{group:"Élève",audience:["parent"],chain:["schooladmin"],doc:false,
    fields:[{k:"child",l:"Enfant",t:"child",req:1},{k:"from",l:"Du",t:"date",req:1},{k:"to",l:"Au",t:"date"},{k:"reason",l:"Motif",t:"textarea"},{k:"justif",l:"Justificatif",t:"attach"}]},
  "Réclamation":{group:"Élève",audience:["parent"],chain:["admin","schooladmin"],doc:false,
    fields:[{k:"subject",l:"Objet",t:"text",req:1},{k:"child",l:"Élève concerné",t:"child"},{k:"description",l:"Description (dates, lieux, personnes)",t:"textarea",req:1},{k:"expected",l:"Résolution souhaitée",t:"textarea"}]},
}
export const REQUEST_LIST=Object.keys(REQUEST_DEFS)
// hr/accountant (CR-019) déposent les mêmes demandes que l'administration.
const ROLE_EQUIV={hr:'admin',accountant:'admin'}
export const typesForRole=role=>REQUEST_LIST.filter(t=>{
  const aud=REQUEST_DEFS[t].audience
  return aud.includes(role)||(ROLE_EQUIV[role]&&aud.includes(ROLE_EQUIV[role]))
})
// rétro-compat
export const REQUEST_TYPES=Object.fromEntries(Object.entries(REQUEST_DEFS).map(([k,v])=>[k,{chain:v.chain,doc:v.doc}]))

// Cadre légal : lu depuis le pack actif (RGPD en France, INPDP en Tunisie…).
// Proxy pour rester une lecture d'objet — LEGAL.consent, LEGAL.law — tout en
// reflétant le pack courant au moment du rendu.
export const LEGAL = new Proxy({}, { get: (_, k) => packLegal()[k] })
