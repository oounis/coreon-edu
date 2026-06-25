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

// Demandes RH — chaînes de validation (workflow d'approbation)
export const REQUEST_TYPES={
  "Attestation de salaire":{chain:["admin","schooladmin"],doc:true},
  "Attestation de travail":{chain:["admin","schooladmin"],doc:true},
  "Demande de congé":{chain:["schooladmin"],doc:false},
  "Avance sur salaire":{chain:["admin","schooladmin","owner"],doc:false},
  "Demande de document administratif":{chain:["admin"],doc:false},
}
export const REQUEST_LIST=Object.keys(REQUEST_TYPES)

// Cadre légal (référence affichée dans le produit)
export const LEGAL={
  law:"Loi organique n° 2004-63 du 27 juillet 2004",
  authority:"INPDP — Instance Nationale de Protection des Données Personnelles",
  consent:"J'autorise l'établissement à traiter ces données personnelles dans le cadre de la scolarité, conformément à la loi organique n° 2004-63 relative à la protection des données à caractère personnel (INPDP).",
}
