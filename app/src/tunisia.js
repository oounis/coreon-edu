// Référentiel tunisien — gouvernorats, fonctions, documents, cadre légal
export const GOVERNORATES=["Ariana","Béja","Ben Arous","Bizerte","Gabès","Gafsa","Jendouba","Kairouan","Kasserine","Kébili","Le Kef","Mahdia","Manouba","Médenine","Monastir","Nabeul","Sfax","Sidi Bouzid","Siliana","Sousse","Tataouine","Tozeur","Tunis","Zaghouan"]

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

// Pièce d'identité : adultes = CIN (8 chiffres), élèves mineurs = N° acte de naissance
export const idLabelFor=role=> role==='student' ? "N° acte de naissance" : "CIN (8 chiffres)"
export const validCIN=v=>/^\d{8}$/.test(String(v||"").trim())

// Demandes — schémas détaillés par type (champs + circuit de validation)
export const REQUEST_DEFS={
  "Demande de congé":{group:"RH",audience:["teacher","supervisor","admin"],chain:["schooladmin"],doc:false,
    note:"Congé annuel : 18 j/an (<5 ans), 24 j/an (≥6 ans). Maternité : 30 j (art. 66). Maladie : justificatif requis (art. 244).",
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
    note:"Remboursement limité à ~10% du salaire net par mois (art. 150 Code du travail).",
    fields:[{k:"amount",l:"Montant demandé (DT)",t:"number",req:1},{k:"reason",l:"Motif",t:"textarea",req:1},{k:"months",l:"Remboursement (nb de mensualités)",t:"number"}]},
  "Demande de mutation":{group:"RH",audience:["teacher","supervisor","admin"],chain:["schooladmin","owner"],doc:false,
    fields:[{k:"target",l:"Établissement / affectation souhaitée",t:"text",req:1},{k:"reasonType",l:"Motif",t:"select",o:["Rapprochement familial","Raison de santé","Convenance personnelle","Autre"]},{k:"date",l:"Date souhaitée",t:"date"},{k:"details",l:"Détails",t:"textarea"}]},
  "Demande de formation":{group:"RH",audience:["teacher","supervisor","admin"],chain:["schooladmin","owner"],doc:false,
    fields:[{k:"title",l:"Intitulé de la formation",t:"text",req:1},{k:"org",l:"Organisme",t:"text"},{k:"from",l:"Du",t:"date"},{k:"to",l:"Au",t:"date"},{k:"cost",l:"Coût estimé (DT)",t:"number"},{k:"goal",l:"Objectif",t:"textarea"}]},
  "Demande de matériel":{group:"Logistique",audience:["teacher","supervisor","admin"],chain:["admin","schooladmin"],doc:false,
    fields:[{k:"items",l:"Articles demandés",t:"textarea",req:1},{k:"qty",l:"Quantité totale",t:"number"},{k:"budget",l:"Budget estimé (DT)",t:"number"},{k:"justif",l:"Justification",t:"textarea"}]},
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
export const typesForRole=role=>REQUEST_LIST.filter(t=>REQUEST_DEFS[t].audience.includes(role))
// rétro-compat
export const REQUEST_TYPES=Object.fromEntries(Object.entries(REQUEST_DEFS).map(([k,v])=>[k,{chain:v.chain,doc:v.doc}]))

// Cadre légal (référence affichée dans le produit)
export const LEGAL={
  law:"Loi organique n° 2004-63 du 27 juillet 2004",
  authority:"INPDP — Instance Nationale de Protection des Données Personnelles",
  consent:"J'autorise l'établissement à traiter ces données personnelles dans le cadre de la scolarité, conformément à la loi organique n° 2004-63 relative à la protection des données à caractère personnel (INPDP).",
}
