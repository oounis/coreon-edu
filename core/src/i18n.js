// ════════════════════════════════════════════════════════════════════════════
// L'ARABE N'EST PAS UNE TRADUCTION — C'EST UNE DIRECTION.
//
// Pourquoi ce module existe (PLAN, carnet v2, chantier n°1) : l'absence d'arabe
// bloque TOUT le Golfe — le marché où vit Othman, et la Vague 2 annoncée
// publiquement sur kogiagroup.com. Un ERP à 60 % en arabe vaut mieux qu'un ERP
// à 90 % qu'aucune école de Manama ne peut lire.
//
// LA MÉTHODE (façon gettext) : le FRANÇAIS EST LA CLÉ. `t('Tableau de bord')`
// rend « لوحة المتابعة » en arabe, et le texte lui-même partout ailleurs.
// Aucune clé à inventer, aucun fichier de clés à synchroniser : si une
// traduction manque, l'écran retombe sur le français — jamais sur un trou.
// Et un test d'exécution garantit que la NAVIGATION, les NIVEAUX et les RÔLES
// sont couverts à 100 % : la dégradation gracieuse n'a pas le droit de grandir
// en silence.
//
// LES RÈGLES :
//  1. La langue est un choix d'APPAREIL (clé de stockage dédiée), pas une
//     donnée d'école : dans une même école du Golfe, la maîtresse française
//     lit en français et le parent en arabe.
//  2. `dir()` accompagne toujours la langue : l'arabe se lit de droite à
//     gauche, l'interface aussi — pas seulement les mots.
//  3. On n'ajoute une langue qu'avec son test de couverture.
// ════════════════════════════════════════════════════════════════════════════
import { getItem, setItem } from './storage.js'

export const LOCALES = {
  fr: { key: 'fr', label: 'Français', dir: 'ltr' },
  ar: { key: 'ar', label: 'العربية',  dir: 'rtl' },
}

const KEY = 'coreon_locale'
let cur = null

export function locale() {
  if (cur) return cur
  const s = getItem(KEY)
  cur = LOCALES[s] ? s : 'fr'
  return cur
}
export function setLocale(l) {
  if (!LOCALES[l]) return
  cur = l
  setItem(KEY, l)
}
export const dir = () => LOCALES[locale()].dir
/** Le repère de dates suit la langue — ar-TN garde les chiffres latins, lisibles des deux publics. */
export const dateLocale = () => (locale() === 'ar' ? 'ar-TN' : 'fr-FR')
export const isRTL = () => dir() === 'rtl'

/** Traduire. Le français est la clé ; s'il manque une entrée, il reste le texte. */
export function t(text) {
  if (!text || locale() === 'fr') return text
  return AR[text] || text
}

// ── Le dictionnaire arabe ────────────────────────────────────────────────────
// Arabe standard moderne, vocabulaire scolaire. Périmètre de la tranche 1 :
// l'écorce (navigation, rôles, niveaux, connexion) et le parcours public du
// parent (pré-inscription, pièces, reçu) — ce qu'un directeur du Golfe touche
// en premier. Les pages métier suivent, tranche par tranche.
export const AR = {
  // ── Bandeaux topbar (météo + vacances) — tranche métier 2026-07-19 ─────────
  // Météo (libellés WMO de meteo.js) + jours/mois pour la date de rentrée.
  'Météo…': 'الطقس…',
  'Météo': 'الطقس',
  'Humidité': 'الرطوبة',
  'Vent': 'الرياح',
  'Min / Max': 'الصغرى / الكبرى',
  'Ensoleillé': 'مشمس',
  'Plutôt ensoleillé': 'مشمس نسبيًا',
  'Partiellement nuageux': 'غائم جزئيًا',
  'Couvert': 'ملبّد بالغيوم',
  'Nuageux': 'غائم',
  'Brouillard': 'ضباب',
  'Brouillard givrant': 'ضباب صقيعي',
  'Bruine légère': 'رذاذ خفيف',
  'Bruine': 'رذاذ',
  'Bruine dense': 'رذاذ كثيف',
  'Bruine verglaçante': 'رذاذ متجمّد',
  'Pluie légère': 'مطر خفيف',
  'Pluie': 'مطر',
  'Forte pluie': 'مطر غزير',
  'Pluie verglaçante': 'مطر متجمّد',
  'Neige légère': 'ثلج خفيف',
  'Neige': 'ثلج',
  'Forte neige': 'ثلج غزير',
  'Grains de neige': 'حبيبات ثلجية',
  'Averses': 'زخات مطر',
  'Fortes averses': 'زخات مطر غزيرة',
  'Averses de neige': 'زخات ثلجية',
  'Orage': 'عاصفة رعدية',
  'Orage + grêle': 'عاصفة رعدية مع بَرَد',
  'Orage violent': 'عاصفة رعدية عنيفة',
  // Jours (clock.js JOURS)
  'dimanche': 'الأحد', 'lundi': 'الاثنين', 'mardi': 'الثلاثاء', 'mercredi': 'الأربعاء',
  'jeudi': 'الخميس', 'vendredi': 'الجمعة', 'samedi': 'السبت',
  // Mois (clock.js MOIS — noms maghrébins, cohérents avec la Tunisie)
  'janvier': 'جانفي', 'février': 'فيفري', 'mars': 'مارس', 'avril': 'أفريل',
  'mai': 'ماي', 'juin': 'جوان', 'juillet': 'جويلية', 'août': 'أوت',
  'septembre': 'سبتمبر', 'octobre': 'أكتوبر', 'novembre': 'نوفمبر', 'décembre': 'ديسمبر',

  // ── Tableau de bord : « À décider » (workbench.js) — tranche 2026-07-19 ─────
  // Libellés (singulier + pluriel, via n_) puis sous-titres de chaque décision.
  'déclaration d’accident à valider': 'تصريح حادث للمصادقة',
  'déclarations d’accident à valider': 'تصاريح حوادث للمصادقة',
  'accident validé à envoyer au parent': 'حادث مصادَق عليه لإرساله إلى الوليّ',
  'accidents validés à envoyer aux parents': 'حوادث مصادَق عليها لإرسالها إلى الأولياء',
  'accusé de réception en retard': 'إشعار بالاستلام متأخّر',
  'accusés de réception en retard': 'إشعارات بالاستلام متأخّرة',
  'candidature reçue à ouvrir': 'مطلب ترشّح وارد لفتحه',
  'candidatures reçues à ouvrir': 'مطالب ترشّح واردة لفتحها',
  'dossier complet à passer à l’étude': 'ملف مكتمل لإحالته على الدرس',
  'dossiers complets à passer à l’étude': 'ملفات مكتملة لإحالتها على الدرس',
  'candidature à trancher': 'مطلب ترشّح للبتّ فيه',
  'candidatures à trancher': 'مطالب ترشّح للبتّ فيها',
  'accepté à inscrire dans une classe': 'مقبول لتسجيله في قسم',
  'acceptés à inscrire dans une classe': 'مقبولون لتسجيلهم في قسم',
  'famille en liste d’attente — une place s’est libérée': 'عائلة في قائمة الانتظار — شغر مقعد',
  'familles en liste d’attente — des places se sont libérées': 'عائلات في قائمة الانتظار — شغرت مقاعد',
  'demande de congé à décider': 'مطلب عطلة للبتّ فيه',
  'demandes de congé à décider': 'مطالب عطل للبتّ فيها',
  'demande du personnel à viser': 'مطلب من العون للتأشير عليه',
  'demandes du personnel à viser': 'مطالب من الأعوان للتأشير عليها',
  'demande approuvée à assigner': 'مطلب مصادَق عليه لإسناده',
  'demandes approuvées à assigner': 'مطالب مصادَق عليها لإسنادها',
  'travail en retard sur son échéance': 'عمل متأخّر عن أجله',
  'travaux en retard sur leur échéance': 'أعمال متأخّرة عن آجالها',
  'versement signalé par un parent — à confirmer': 'دفعة أعلن عنها وليّ — للتثبّت',
  'versements signalés par les parents — à confirmer': 'دفعات أعلن عنها الأولياء — للتثبّت',
  'déclaration d’accident à signer': 'تصريح حادث للإمضاء',
  'déclarations d’accident à signer': 'تصاريح حوادث للإمضاء',
  'mois de scolarité en retard': 'شهر دراسي متأخّر الخلاص',
  'travail qui m’est confié': 'عمل مُسنَد إليّ',
  'travaux qui me sont confiés': 'أعمال مُسنَدة إليّ',
  // paie (composé avec le mois) + travail confié (composé avec un nombre)
  'paie de': 'أجرة',
  'à valider': 'للمصادقة',
  'validée — à verser': 'مصادَق عليها — للصرف',
  'en retard sur l’échéance.': 'متأخّرة عن الأجل.',
  // sous-titres
  'Deux paires d’yeux : un adulte a vu, vous contrôlez.': 'زوجا عيون: بالغ رأى، وأنت تراقب.',
  'Le parent doit savoir avant la sortie des classes.': 'يجب أن يعلم الوليّ قبل خروج التلاميذ.',
  'Plus de 24 h sans signature du parent — relancer.': 'أكثر من 24 ساعة دون إمضاء الوليّ — أعد التذكير.',
  'Déposées en ligne par les parents.': 'أودعها الأولياء عبر الإنترنت.',
  'Toutes les pièces obligatoires sont là.': 'كل الوثائق الإجبارية متوفّرة.',
  'Accepter ou refuser — la famille attend.': 'القبول أو الرفض — العائلة تنتظر.',
  'La capacité décide : le système ne promet pas une place qui n’existe pas.': 'الطاقة الاستيعابية تقرّر: النظام لا يعِد بمقعد غير موجود.',
  'Premier arrivé, premier servi : la liste avance.': 'الأسبقيّة بالأسبقيّة: القائمة تتقدّم.',
  'Un employé attend pour organiser sa vie.': 'موظّف ينتظر لينظّم حياته.',
  'Le circuit de validation attend votre étape.': 'دورة المصادقة تنتظر مرحلتك.',
  'Un travail sans responsable n’avance pas.': 'عمل بلا مسؤول لا يتقدّم.',
  'L’échéance est passée — relancer, ou clôturer en le disant.': 'انقضى الأجل — أعد التذكير، أو أغلق مع التوضيح.',
  'Le parent ne se déclare jamais payé : vous confirmez après encaissement.': 'الوليّ لا يعلن الدفع بنفسه: أنت تثبّت بعد القبض.',
  'Un brouillon se corrige ; une paie validée ne bouge plus.': 'المسودّة تُصحّح؛ الأجرة المصادَق عليها لا تتغيّر.',
  'Le virement clôt le mois.': 'التحويل يُنهي الشهر.',
  'L’école attend votre accusé de réception.': 'المدرسة تنتظر إشعارك بالاستلام.',
  'Signalez un versement — l’école confirmera.': 'أعلن عن دفعة — المدرسة ستثبّتها.',
  'Clôturez quand c’est fait — la trace s’écrit toute seule.': 'أغلق عند الإنجاز — الأثر يُكتب تلقائيًا.',

  // ── Coin des fêtes (FeteCorner.jsx + fetes.js) ─────────────────────────────
  "aujourd'hui": 'اليوم',
  'demain': 'غدًا',
  'dans': 'خلال',
  'j': 'يومًا',
  'jour férié': 'يوم عطلة رسميّة',
  'prochain congé': 'العطلة القادمة',
  'Fêtes et journées à venir': 'الأعياد والأيّام القادمة',
  'selon la lune': 'حسب رؤية الهلال',
  'FÉRIÉ': 'عطلة',
  // Jours fériés tunisiens
  "Jour de l'an": 'رأس السنة الميلاديّة',
  "Fête de l'Indépendance": 'عيد الاستقلال',
  'Aïd el-Fitr': 'عيد الفطر',
  'Aïd el-Fitr (2e jour)': 'عيد الفطر (اليوم الثاني)',
  'Journée des Martyrs': 'عيد الشهداء',
  'Fête du Travail': 'عيد الشغل',
  'Aïd el-Idha': 'عيد الأضحى',
  'Aïd el-Idha (2e jour)': 'عيد الأضحى (اليوم الثاني)',
  'Ras el Am el Hijri': 'رأس السنة الهجريّة',
  'Fête de la République': 'عيد الجمهوريّة',
  'Fête de la Femme': 'عيد المرأة',
  'Mouled': 'المولد النبويّ',
  "Fête de l'Évacuation": 'عيد الجلاء',
  'Fête de la Révolution': 'عيد الثورة',
  // Journées mondiales
  "Journée internationale de l'éducation": 'اليوم العالمي للتعليم',
  'Journée de la langue maternelle': 'اليوم العالمي للغة الأمّ',
  'Journée internationale des femmes': 'اليوم العالمي للمرأة',
  'Journée internationale du bonheur': 'اليوم العالمي للسعادة',
  'Journée mondiale de la poésie': 'اليوم العالمي للشعر',
  "Journée mondiale de l'eau": 'اليوم العالمي للمياه',
  'Journée du livre pour enfants': 'اليوم العالمي لكتاب الطفل',
  'Journée mondiale de la santé': 'اليوم العالمي للصحّة',
  'Jour de la Terre': 'يوم الأرض',
  'Journée mondiale du livre': 'اليوم العالمي للكتاب',
  'Journée internationale des familles': 'اليوم العالمي للأسر',
  "Journée mondiale de l'environnement": 'اليوم العالمي للبيئة',
  'Fête de la musique': 'عيد الموسيقى',
  'Journée des compétences des jeunes': 'اليوم العالمي لمهارات الشباب',
  "Journée internationale de l'amitié": 'اليوم العالمي للصداقة',
  'Journée internationale de la jeunesse': 'اليوم العالمي للشباب',
  "Journée de l'alphabétisation": 'اليوم العالمي لمحو الأمّيّة',
  'Journée internationale de la paix': 'اليوم العالمي للسلام',
  'Journée mondiale des enseignants': 'اليوم العالمي للمعلّمين',
  "Journée mondiale de l'alimentation": 'اليوم العالمي للغذاء',
  'Journée mondiale de la gentillesse': 'اليوم العالمي للّطف',
  "Journée des droits de l'enfant": 'اليوم العالمي لحقوق الطفل',
  'Journée des personnes handicapées': 'اليوم العالمي للأشخاص ذوي الإعاقة',
  "Journée des droits de l'homme": 'اليوم العالمي لحقوق الإنسان',
  'Journée mondiale de la langue arabe': 'اليوم العالمي للغة العربيّة',

  // ── Tableau de bord admin : frais, tableau des évaluations ─────────────────
  'Payés': 'مدفوعة',
  'À confirmer': 'للتثبّت',
  'En retard': 'متأخّرة',
  'Impayés': 'غير مدفوعة',
  'Aucune évaluation enregistrée': 'لا تقييمات مسجّلة',
  'Les évaluations des enseignants apparaîtront ici.': 'ستظهر هنا تقييمات المعلّمين.',

  // ── Paramètres (Settings v2) — tranche métier 2026-07-19 ───────────────────
  'Paramètres de l’école': 'إعدادات المدرسة',
  'Configurez votre établissement — appliqué partout dans l’application.': 'اضبط مؤسستك — يُطبَّق في كامل التطبيق.',
  'Enregistrer': 'حفظ',
  'Enregistré': 'تم الحفظ',
  'Établissement': 'المؤسسة',
  'Modules': 'الوحدات',
  'Localisation': 'التوطين',
  'Marque': 'العلامة',
  'Données': 'البيانات',
  'Identité de l’établissement': 'هوية المؤسسة',
  'Nom de l’école *': 'اسم المدرسة *',
  'Nom court (sidebar)': 'الاسم المختصر (القائمة)',
  'Ville': 'المدينة',
  'Année scolaire': 'السنة الدراسية',
  'Directeur / directrice': 'المدير / المديرة',
  'Initiales du logo': 'أحرف الشعار',
  'Coordonnées': 'بيانات الاتصال',
  'Téléphone': 'الهاتف',
  'Adresse': 'العنوان',
  'Cycles & niveaux': 'المراحل والمستويات',
  'Cycles & niveaux accueillis': 'المراحل والمستويات المستقبَلة',
  'Cochez les niveaux que votre école accueille. Une crèche ne verra jamais les écrans du primaire.': 'حدّد المستويات التي تستقبلها مدرستك. لن ترى الحضانة أبدًا شاشات الابتدائي.',
  'niveau(x) actif(s). L’enregistrement recharge la navigation.': 'مستوى نشط. الحفظ يُعيد تحميل القائمة.',
  'Modules optionnels': 'الوحدات الاختيارية',
  'Activez ce dont votre école a besoin. Ces modules existent, testés — vous les allumez d’un clic.': 'فعّل ما تحتاجه مدرستك. هذه الوحدات موجودة ومختبَرة — تشغّلها بنقرة.',
  'Le cœur — toujours actif': 'الأساس — نشط دائمًا',
  'Ce qui fait vivre l’école tous les jours ne se désactive pas.': 'ما يُحيي المدرسة كل يوم لا يُعطَّل.',
  'Cahier de textes : devoirs par classe, visibles des parents.': 'كرّاس النصوص: واجبات حسب القسم، يراها الأولياء.',
  'Calendrier des examens et des compositions.': 'رزنامة الامتحانات والفروض.',
  'Catalogue et prêts d’ouvrages.': 'فهرس الكتب وإعارتها.',
  'Lignes, arrêts et ramassage scolaire.': 'الخطوط والمحطات والنقل المدرسي.',
  'Évaluation': 'التقييم',
  'Journal': 'اليوميّات',
  'Localisation & finances': 'التوطين والمالية',
  'Devise': 'العملة',
  'Utilisée pour tous les montants (frais, paie, budget).': 'تُستعمل لكل المبالغ (الرسوم، الرواتب، الميزانية).',
  'Langue par défaut': 'اللغة الافتراضية',
  'La langue d’un nouvel appareil. Chacun peut la changer.': 'لغة أي جهاز جديد. يمكن لكلٍّ تغييرها.',
  'Exemple de montant': 'مثال مبلغ',
  'Marque & couleur': 'العلامة واللون',
  'Chaque teinte est validée pour l’accessibilité. Utilisée sur la page publique et les documents.': 'كل لون مُعتمَد من حيث سهولة الوصول. يُستعمل في الصفحة العمومية والوثائق.',
  'Vos données vous appartiennent': 'بياناتك ملكك',
  'Exportez toute votre école au standard OneRoster v1.2 — un clic, aucun verrou. Vous pouvez partir quand vous voulez.': 'صدّر كامل مدرستك وفق معيار OneRoster v1.2 — نقرة واحدة، دون أي قفل. يمكنك المغادرة متى شئت.',
  'Exporter (OneRoster v1.2)': 'تصدير (OneRoster v1.2)',
  'Données de démonstration': 'بيانات العرض التجريبي',
  'Cette base est la démo. Vous pouvez la remettre à zéro pour repartir d’une école propre.': 'هذه قاعدة العرض التجريبي. يمكنك تصفيرها للانطلاق من مدرسة نظيفة.',
  'Réinitialiser la démonstration': 'إعادة ضبط العرض التجريبي',
  'Réinitialiser la démonstration ?': 'إعادة ضبط العرض التجريبي؟',
  'Toutes les données locales de démonstration seront effacées et l’école sera régénérée. Sans effet sur une vraie école.': 'ستُمحى كل بيانات العرض التجريبي المحلية وتُعاد المدرسة من جديد. دون أي أثر على مدرسة حقيقية.',
  'Annuler': 'إلغاء',
  'Oui, réinitialiser': 'نعم، إعادة الضبط',
  'Aperçu': 'معاينة',
  'Directeur': 'المدير',
  'Langue': 'اللغة',
  'Niveaux': 'المستويات',
  'Le nom de l’école est requis.': 'اسم المدرسة مطلوب.',
  'Une école accueille au moins un niveau.': 'تستقبل المدرسة مستوًى واحدًا على الأقل.',
  'Paramètres enregistrés — la navigation se recharge.': 'تم حفظ الإعدادات — يُعاد تحميل القائمة.',
  'Paramètres enregistrés — appliqués partout.': 'تم حفظ الإعدادات — مُطبَّقة في كل مكان.',
  'Dinar tunisien': 'دينار تونسي', 'Dinar bahreïni': 'دينار بحريني', 'Dirham marocain': 'درهم مغربي',
  'Dinar algérien': 'دينار جزائري', 'Riyal saoudien': 'ريال سعودي', 'Riyal qatari': 'ريال قطري',
  'Dinar koweïtien': 'دينار كويتي', 'Dirham émirati': 'درهم إماراتي', 'Dinar libyen': 'دينار ليبي',
  'Euro': 'يورو', 'Dollar US': 'دولار أمريكي',
  // Bandeaux du haut (écorce, sur toutes les pages)
  'Mode démonstration': 'وضع العرض التجريبي',
  'revenir au réel': 'العودة إلى الوضع الحقيقي',
  'Mode démonstration : l’application simule une journée de classe': 'وضع العرض التجريبي: يحاكي التطبيق يومًا دراسيًا',
  'Vacances d’été': 'العطلة الصيفية',
  'reprise le': 'العودة في',

  // Navigation (nav.js — chaque libellé, y compris les variantes par rôle)
  'Tableau de bord': 'لوحة المتابعة',
  'Suivi en direct': 'المتابعة المباشرة',
  'Écoles': 'المدارس',
  'Comptes': 'الحسابات',
  'Inscriptions': 'التسجيلات',
  'Élèves': 'التلاميذ',
  'Enseignants': 'المعلّمون',
  'Personnel': 'الموظفون',
  'RH & Paie': 'الموارد البشرية والرواتب',
  'Comptabilité': 'المحاسبة',
  'Bulletins & passage': 'كشوف الأعداد والارتقاء',
  'Installations': 'المرافق',
  'Mon pointage': 'حضوري',
  'Évaluer': 'التقييم',
  'Dossier de l’enfant': 'ملف الطفل',
  'Journal du jour': 'يوميّات اليوم',
  'La journée de mon enfant': 'يوم طفلي',
  'Suivi élèves': 'متابعة التلاميذ',
  'Emploi du temps': 'جدول الأوقات',
  'Présence': 'الحضور',
  'Devoirs': 'الواجبات',
  'Examens': 'الامتحانات',
  'Frais & Finances': 'الرسوم والمالية',
  'Mes paiements': 'مدفوعاتي',
  'Bibliothèque': 'المكتبة',
  'Transport': 'النقل المدرسي',
  'Événements': 'الفعاليات',
  'Poste de sécurité': 'مركز الحراسة',
  'Espaces': 'الفضاءات',
  'Espace parents': 'فضاء الأولياء',
  'Espace enseignants': 'فضاء المعلّمين',
  'Espace personnel': 'فضاء الموظفين',
  'Incidents': 'الوقائع',
  'Accidents': 'الإصابات',
  'Déclarations d’accident': 'تصاريح الإصابات',
  'Demandes': 'المطالب',
  'Comportement': 'السلوك',
  'Moments': 'اللحظات',
  'Cantine': 'المطعم',
  'Documents': 'الوثائق',
  'Budget & rapports': 'الميزانية والتقارير',
  'Inventaire': 'المخزون',
  'Recrutement': 'التوظيف',
  'Comportement de mon enfant': 'سلوك طفلي',
  'Suivi du comportement': 'متابعة السلوك',
  'Messages': 'الرسائل',
  'Annonces': 'الإعلانات',
  'Interopérabilité': 'تبادل البيانات',
  'Paramètres': 'الإعدادات',

  // Sections du menu (nav.js SECTIONS)
  'Au quotidien': 'اليومي',
  'Élèves & familles': 'التلاميذ والعائلات',
  'Pédagogie': 'البيداغوجيا',
  'Vie de l’école': 'حياة المدرسة',
  'Équipe': 'الفريق',
  'Finances': 'المالية',
  'Administration': 'الإدارة',

  // Rôles (theme.js)
  'Plateforme': 'المنصّة',
  'Direction': 'الإدارة العامة',
  'Enseignant': 'معلّم',
  'Surveillant': 'مراقب',
  'Sécurité': 'الحراسة',
  'Parent': 'وليّ',

  // Niveaux (levels.js)
  'Crèche': 'الحضانة',
  'Pré-maternelle': 'التمهيدي',
  'Maternelle 1': 'روضة 1',
  'Maternelle 2': 'روضة 2',
  '1ère année': 'السنة الأولى',
  '2ème année': 'السنة الثانية',
  '3ème année': 'السنة الثالثة',
  '4ème année': 'السنة الرابعة',
  '5ème année': 'السنة الخامسة',
  '6ème année': 'السنة السادسة',
  'Petite enfance': 'الطفولة المبكرة',
  'Primaire': 'الابتدائي',

  // Connexion
  'Bon retour': 'مرحبًا بعودتك',
  'Connectez-vous à votre portail.': 'سجّل الدخول إلى بوابتك.',
  'E-mail': 'البريد الإلكتروني',
  'Mot de passe': 'كلمة السر',
  'Se connecter': 'تسجيل الدخول',
  'E-mail ou mot de passe incorrect.': 'البريد الإلكتروني أو كلمة السر غير صحيحة.',
  'Ce compte a été désactivé. Contactez la direction.': 'هذا الحساب معطَّل. اتصلوا بالإدارة.',
  'Démo — connexion en un clic :': 'تجربة — دخول بنقرة واحدة:',
  'Pas un ERP scolaire de plus': 'ليس مجرّد نظام مدرسي آخر',
  'L\'école qu\'on a envie d\'ouvrir.': 'المدرسة التي يسعدنا أن نفتحها كل صباح.',

  // L'écorce (AppShell)
  'Rechercher…': 'بحث…',
  'Recherche globale (Ctrl+K)': 'بحث شامل (Ctrl+K)',
  'Recherche globale': 'بحث شامل',
  'Rechercher une page, un élève, un enseignant…': 'ابحث عن صفحة، تلميذ، معلّم…',
  'Notifications': 'الإشعارات',
  'Tout lire': 'قراءة الكل',
  'Aucune notification': 'لا إشعارات',
  'Déconnexion': 'تسجيل الخروج',
  'Ouvrir le menu': 'فتح القائمة',
  'Menu utilisateur': 'قائمة المستخدم',
  'Pages': 'الصفحات',
  'Aucun résultat pour': 'لا نتائج عن',

  // Pré-inscription publique — la porte d'entrée du parent
  'Pré-inscription': 'التسجيل الأولي',
  'Se connecter ': 'تسجيل الدخول ',
  'Quelques informations, une minute. Joignez les pièces si vous les avez — sinon l’école vous les demandera.':
    'بضع معلومات، دقيقة واحدة. أرفقوا الوثائق إن كانت لديكم — وإلا فستطلبها منكم المدرسة.',
  'Nom et prénom de l’enfant *': 'اسم الطفل ولقبه *',
  'Date de naissance *': 'تاريخ الولادة *',
  'Niveau demandé *': 'المستوى المطلوب *',
  'Le parent ou tuteur': 'الوليّ',
  'Votre nom *': 'اسمكم *',
  'Téléphone *': 'الهاتف *',
  'E-mail (facultatif)': 'البريد الإلكتروني (اختياري)',
  'Pièces (facultatif maintenant)': 'الوثائق (اختيارية الآن)',
  'Joignez ce que vous avez sous la main — une photo prise au téléphone suffit. Ce qui manque, l’école vous le demandera.':
    'أرفقوا ما هو متوفر لديكم — تكفي صورة بالهاتف. وما ينقص، ستطلبه منكم المدرسة.',
  'Rien n’est bloquant à cette étape.': 'لا شيء يعطّل التسجيل في هذه المرحلة.',
  'Un mot pour l’école (facultatif)': 'كلمة للمدرسة (اختياري)',
  'Envoyer ma candidature': 'إرسال المطلب',
  'Le nom de l’enfant est requis.': 'اسم الطفل مطلوب.',
  'La date de naissance est requise.': 'تاريخ الولادة مطلوب.',
  'Choisissez un niveau.': 'اختاروا مستوى.',
  'Votre nom est requis.': 'اسمكم مطلوب.',
  'Un numéro joignable, s’il vous plaît.': 'رقم هاتف يمكن الاتصال به، من فضلكم.',
  'Candidature reçue.': 'تم استلام المطلب.',
  'Votre référence': 'مرجعكم',
  'Retour à l’accueil': 'العودة إلى الاستقبال',
  'par Kogia Group': 'من Kogia Group',

  // Pièces (admissions.js DOCS + Attach)
  'Acte de naissance': 'شهادة الميلاد',
  'Photo d’identité': 'صورة شمسية',
  'Carnet de vaccination': 'دفتر التطعيمات',
  'Bulletin de l’école précédente': 'كشف أعداد المدرسة السابقة',
  'Justificatif de domicile': 'إثبات محل السكن',
  'Joindre': 'إرفاق',
  'Remplacer': 'استبدال',
  'Ouvrir': 'فتح',
  'Lecture…': 'جارٍ القراءة…',
}

// ── Tranche 2 : l'atelier (Dashboard) — la chrome statique ──────────────────
// Les libellés DYNAMIQUES du bureau (« 3 candidatures à trancher ») restent en
// français : le pluriel arabe (duel, pluriel 3–10) est une vraie grammaire,
// pas un remplacement de chaîne — c'est la tranche 3, faite proprement.
Object.assign(AR, {
  'Bonjour': 'مرحبًا',
  'Votre atelier — ce qui attend votre décision passe en premier.': 'ورشتك — ما ينتظر قرارك يأتي أولًا.',
  'À décider': 'للقرار',
  "Rien n'attend votre décision": 'لا شيء ينتظر قراركم',
  "L'école est à jour. C'est une information, pas un écran vide.": 'المدرسة على ما يرام. هذه معلومة، لا شاشة فارغة.',
  "Aujourd'hui": 'اليوم',
  'À venir': 'القادم',
  'Aucun absent': 'لا غيابات',
  'Aucun incident ouvert': 'لا وقائع مفتوحة',
  "Aucun événement aujourd'hui": 'لا فعاليات اليوم',
  'Aucun événement planifié.': 'لا فعاليات مبرمجة.',
  'Les chiffres': 'الأرقام',
  "l'état de l'école, pour qui veut regarder": 'حالة المدرسة، لمن أراد الاطلاع',
  'Rechercher un élève, un enseignant, une page…': 'ابحث عن تلميذ، معلّم، صفحة…',
  'Incidents ouverts': 'وقائع مفتوحة',
  'Demandes en attente': 'مطالب في الانتظار',
  'État des frais': 'حالة الرسوم',
  'Tous mois confondus': 'كل الأشهر مجتمعة',
  'réglés à ce jour': 'مدفوعة إلى اليوم',
  'Présence hebdomadaire': 'الحضور الأسبوعي',
  'Présents vs absents': 'الحاضرون مقابل الغائبين',
  'Présents': 'الحاضرون',
  'Absents': 'الغائبون',
  'Effectif par classe': 'عدد التلاميذ حسب القسم',
  'Taux de recouvrement': 'نسبة الاستخلاص',
  'Évaluations enregistrées': 'التقييمات المسجّلة',
  'Suivi élèves ': 'متابعة التلاميذ ',
  'Classe': 'القسم',
  'Matière': 'المادة',
  'Leçon': 'الدرس',
  'Date': 'التاريخ',
  'Élèves notés': 'تلاميذ مقيَّمون',
  'Moyenne': 'المعدّل',
  'mois': 'شهرًا',
})
