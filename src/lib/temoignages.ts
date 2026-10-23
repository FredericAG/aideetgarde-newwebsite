/**
 * Témoignages de clients (page d'accueil), transmis par Frédéric le
 * 23/10/2026 : extraits de messages reçus par Aide & Garde, publiés sous
 * initiales uniquement. Texte d'origine, seules l'orthographe et la
 * ponctuation sont corrigées ; « […] » marque un passage coupé.
 *
 * Règles (Code de la consommation, art. L111-7-2 et D111-16 à D111-19) :
 * - l'ACCORD de chaque client est nécessaire avant publication : sur le site
 *   public, seuls les témoignages avec `accord: true` s'affichent ; le site
 *   de test les montre tous, avec un repère « accord à obtenir » ;
 * - la DATE de l'échange (mois et année) doit accompagner chaque avis :
 *   `date` à compléter, au format « 2025-06 » ;
 * - pas de contrepartie, pas de procédure de contrôle par un tiers : c'est
 *   indiqué sous les témoignages.
 */
export interface Temoignage {
  texte: string;
  initiales: string;
  /** Mois de l'échange, « AAAA-MM ». null : à compléter. */
  date: string | null;
  accord: boolean;
  /** Affiché d'emblée (les autres sont derrière « Voir plus »). */
  enAvant?: boolean;
}

export const TEMOIGNAGES: Temoignage[] = [
  {
    texte:
      "Votre service m'a été d'une grande aide, et j'ai été impressionnée par votre très grande rigueur, la précision de vos réponses, la rapidité de vos réponses et également par votre gentillesse.",
    initiales: "B.",
    date: null,
    accord: false,
    enAvant: true,
  },
  {
    texte:
      "C'est parfait, un grand merci pour votre aide. Vous ne savez pas le temps que j'ai gagné grâce à vos services ! Je vous recommande auprès de mon entourage.",
    initiales: "N. de V.",
    date: null,
    accord: false,
    enAvant: true,
  },
  {
    texte:
      "[…] Votre soutien nous a été précieux et nous a apporté un réel confort dans la gestion des salaires et des contrats de nos différents salariés. […] Nous ne manquerons pas de vous recommander autour de nous.",
    initiales: "V.",
    date: null,
    accord: false,
    enAvant: true,
  },
  {
    texte:
      "[…] Votre service a été extrêmement appréciable pour nous en nous simplifiant la tâche et en nous libérant du temps.",
    initiales: "J. H.",
    date: null,
    accord: false,
    enAvant: true,
  },
  {
    texte: "J'apprécie beaucoup votre écoute, votre compétence, votre chaleur et votre rigueur.",
    initiales: "V.",
    date: null,
    accord: false,
    enAvant: true,
  },
  {
    texte:
      "Oh là là, vous êtes MERVEILLEUX !!!! […] Je continuerai à faire vos éloges auprès des autres mamans qui galèrent.",
    initiales: "D.",
    date: null,
    accord: false,
    enAvant: true,
  },
  { texte: "Un grand merci pour votre aide. Cela m'a bien simplifié la vie !", initiales: "M. C.", date: null, accord: false },
  { texte: "Un grand merci pour tout, votre service aura été parfait de A à Z !!!", initiales: "M.", date: null, accord: false },
  { texte: "Votre rapidité me bluffe !", initiales: "D.", date: null, accord: false },
  { texte: "Je recommande le service Aide & Garde sans hésitation !", initiales: "G. P.", date: null, accord: false },
  {
    texte:
      "[…] Merci également pour votre professionnalisme, votre disponibilité et votre rapidité dans la prise en charge de mes diverses demandes.",
    initiales: "de S.",
    date: null,
    accord: false,
  },
  { texte: "Oui, nous n'avons rien à redire avec votre prestation. Rien de plus simple.", initiales: "S.", date: null, accord: false },
  {
    texte:
      "Votre service a été parfait pour nous, et nous ne manquerons pas de vous recommander aux personnes de notre entourage devant faire face à ce type de besoin.",
    initiales: "C.",
    date: null,
    accord: false,
  },
  {
    texte:
      "[…] Votre accompagnement est parfait, je suis ravi d'avoir eu vos services et je ne manquerai jamais de refaire appel à vous.",
    initiales: "B. D.",
    date: null,
    accord: false,
  },
  {
    texte:
      "[…] Étant très satisfaits de vos services, nous allons donc vous commander un nouveau package de gestion.",
    initiales: "P.",
    date: null,
    accord: false,
  },
  { texte: "Nous avons beaucoup apprécié votre service et je n'hésiterai pas à renouveler.", initiales: "M.", date: null, accord: false },
  { texte: "Bonne continuation et merci pour votre service, que j'ai trouvé très pro.", initiales: "R.", date: null, accord: false },
  { texte: "Un grand merci pour votre super service, vraiment.", initiales: "M.", date: null, accord: false },
  {
    texte: "Je vous remercie beaucoup de votre réponse, une fois de plus claire et très rapide.",
    initiales: "D.",
    date: null,
    accord: false,
  },
];

/** Site public (indexé) : seuls les témoignages autorisés ; site de test : tous. */
export function temoignagesAffiches(): (Temoignage & { aObtenir: boolean })[] {
  const publicSite = process.env.NEXT_PUBLIC_INDEXATION === "oui";
  return TEMOIGNAGES.filter((t) => t.accord || !publicSite)
    .map((t) => ({ ...t, aObtenir: !t.accord }))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}
