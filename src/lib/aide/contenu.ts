import type { Theme } from "./types";
import { simplifierTexte } from "./recherche";

/**
 * Contenu du centre d'aide, repris de la présentation « site aide et
 * garde » de Frédéric (21/10/2026), réorganisé en questions courtes.
 * Corrections déjà apportées : réforme du CMG (septembre 2025), congés
 * payés pendant un arrêt maladie (loi du 22 avril 2024), France Travail
 * (ex-Pôle emploi). Montants datés retirés en attendant leur mise à jour.
 * Points à faire vérifier : docs/centre-aide-relecture.md.
 */
export const THEMES: Theme[] = [
  // ------------------------------------------------------------------ Documents
  {
    slug: "bulletin-de-paie",
    titre: "Comprendre le bulletin de paie",
    porte: "documents",
    intro:
      "Les heures, le salaire et les congés payés tels qu'ils apparaissent sur le bulletin établi par Aide & Garde.",
    questions: [
      {
        slug: "heures",
        question: "Pourquoi les heures du bulletin ne sont-elles pas celles du mois ?",
        resume:
          "Le salaire est mensualisé : les heures prévues au contrat sont lissées sur l'année, pour que le salarié reçoive la même somme chaque mois, quel que soit le nombre de jours du mois.",
        motsCles: ["mensualisation", "heures mensualisées", "heures effectives", "173,33"],
        corps: [
          {
            tableau: {
              entetes: ["Heures", "Ce que cela recouvre"],
              lignes: [
                ["Mensualisées", "Heures du contrat lissées sur l'année : heures par semaine × 52 / 12. Identiques chaque mois."],
                ["Effectives", "Heures de présence réelle du salarié, d'après le contrat et les événements que vous avez signalés."],
                ["Rémunérées", "Heures mensualisées, plus les congés payés et jours fériés éventuels du mois (le salarié n'est pas présent mais il est payé)."],
                ["Déclarées à l'Urssaf", "Heures mensualisées, plus ou moins les heures faites en plus ou en moins ce mois-ci."],
              ],
            },
          },
          {
            exemple:
              "Un salarié travaille 40 heures par semaine (8 heures du lundi au vendredi), payé 12 € brut de l'heure. En février 2024, il a travaillé 21 jours, soit 168 heures ; en juillet, 23 jours, soit 184 heures. Mensualisé, il est payé chaque mois sur 40 × 52 / 12 = 173,33 heures, soit 2 080 € brut, en février comme en juillet.",
          },
          {
            p: "En cas d'absence, on retire les heures non travaillées des heures mensualisées : une journée d'absence de 8 heures en juillet donne 173,33 − 8 = 165,33 heures payées.",
          },
        ],
        lien: { href: "/tableau-de-bord", libelle: "Déclarer les heures du mois" },
      },
      {
        slug: "taux-reconstitue",
        question: "Qu'est-ce que le taux horaire reconstitué ?",
        resume:
          "Pour un mois incomplet (début ou fin de contrat, congé sans solde), le salaire est calculé au prorata de la période travaillée. Le taux reconstitué n'est retenu que s'il est plus favorable au salarié.",
        motsCles: ["mois incomplet", "prorata", "début de contrat", "fin de contrat"],
        corps: [
          {
            p: "Pour un mois incomplet, on déduit les heures non travaillées. Si le taux reconstitué est inférieur au taux du contrat, c'est lui qui est retenu, car il conduit à déduire moins de salaire.",
          },
        ],
      },
      {
        slug: "ecart-de-salaire",
        question: "Pourquoi le net payé est-il différent de ce que j'attendais ?",
        resume:
          "L'écart vient souvent de l'exonération des heures supplémentaires : une partie des cotisations salariales n'est pas prélevée par l'Urssaf, et vous la reversez au salarié. L'opération est neutre pour vous.",
        motsCles: ["exonération", "heures supplémentaires", "net à payer", "pouvoir d'achat"],
        corps: [
          {
            p: "Le détail figure dans le cadre situé au-dessus du « net à payer ». Cette mesure, en place depuis 2019, augmente le salaire net des salariés qui font des heures supplémentaires.",
          },
        ],
      },
      {
        slug: "conges-payes-bulletin",
        question: "Comment lire les congés payés sur le bulletin ?",
        resume:
          "Le bulletin indique les congés acquis, pris et le solde. Le salarié acquiert 2,5 jours ouvrables par mois de travail, sur une période de référence du 1er juin au 31 mai.",
        motsCles: ["congés acquis", "congés pris", "solde", "période de référence"],
        corps: [
          {
            tableau: {
              entetes: ["Ligne", "Signification"],
              lignes: [
                ["Acquis", "2,5 jours par mois, additionnés sur la période de référence (1er juin de l'année précédente au 31 mai)."],
                ["Pris", "Jours de congé pris pendant le mois du bulletin."],
                ["Solde", "Jours restant à prendre sur la période de référence."],
              ],
            },
          },
          {
            p: "En début de contrat, la période de référence va de la date d'embauche au 31 mai ; en fin de contrat, du 1er juin à la date de fin.",
          },
        ],
      },
    ],
  },
  {
    slug: "documents-de-fin-de-contrat",
    titre: "Les documents de fin de contrat",
    porte: "documents",
    intro: "Ce qu'Aide & Garde vous fournit quand un contrat se termine, et ce que vous devez en faire.",
    questions: [
      {
        slug: "documents-a-fournir",
        question: "Quels documents remettre au salarié à la fin du contrat ?",
        resume:
          "Aide & Garde établit trois documents, disponibles dans votre espace : le certificat de travail, le solde de tout compte et l'attestation France Travail. Remettez-les au salarié et faites-lui signer le solde de tout compte.",
        motsCles: ["certificat de travail", "solde de tout compte", "attestation france travail", "pôle emploi", "STC", "fin de contrat"],
        corps: [
          {
            liste: [
              "Certificat de travail : atteste des dates d'emploi et de l'emploi occupé.",
              "Solde de tout compte : récapitule les sommes versées à la fin du contrat (salaire, congés payés non pris, indemnités).",
              "Attestation France Travail (ex-Pôle emploi) : permet au salarié de faire valoir ses droits au chômage.",
            ],
          },
        ],
        lien: { href: "/tableau-de-bord/documents", libelle: "Retrouver mes documents" },
      },
    ],
  },

  // ------------------------------------------------------------------ Employer
  {
    slug: "contrat",
    titre: "Le contrat de travail",
    porte: "employer",
    intro: "Les questions les plus fréquentes avant et pendant le contrat.",
    questions: [
      {
        slug: "cdd",
        question: "Faut-il préférer un CDD ?",
        resume: "Nous le déconseillons dans la plupart des cas, pour quatre raisons.",
        motsCles: ["contrat à durée déterminée", "prime de précarité"],
        corps: [
          {
            liste: [
              "Il faut un motif précis pour y recourir.",
              "La période d'essai est très courte.",
              "Une fois la période d'essai passée, on ne peut plus l'interrompre, sauf faute grave ou commun accord.",
              "Une prime de précarité de 10 % de tous les salaires versés pendant le contrat est due.",
            ],
          },
        ],
      },
      {
        slug: "situation-irreguliere",
        question: "Puis-je employer une personne en situation irrégulière ?",
        resume:
          "Non : il est interdit d'employer une personne qui n'a pas de titre l'autorisant à travailler en France. C'est l'employeur qui en porte le risque pendant toute la durée du travail.",
        motsCles: ["sans papiers", "titre de séjour", "autorisation de travail"],
        corps: [
          {
            p: "En cas de problème ou d'accident, vous risquez en outre de ne pas être couvert par les assurances.",
          },
        ],
      },
      {
        slug: "repas",
        question: "Dois-je fournir le repas à mon salarié ?",
        resume:
          "Non, ce n'est pas obligatoire. Si vous le fournissez, il peut être un avantage en nature déduit du salaire net, sauf s'il est fourni par nécessité de l'emploi.",
        motsCles: ["avantage en nature", "déjeuner", "nourriture"],
        corps: [
          {
            tableau: {
              entetes: ["Situation", "Effet sur le salaire"],
              lignes: [
                [
                  "Repas fourni par nécessité de l'emploi (prévu au contrat, dans un but d'éducation, de prévention ou psychologique, par exemple repas pris avec l'enfant)",
                  "Pas un avantage en nature : aucune retenue sur le salaire net.",
                ],
                [
                  "Repas fourni sans nécessité de l'emploi",
                  "Avantage en nature : il est déduit du salaire net, au plus du montant forfaitaire par repas fixé chaque année.",
                ],
              ],
            },
          },
        ],
      },
      {
        slug: "enfant-supplementaire",
        question: "Un enfant de plus à garder : faut-il changer le salaire ?",
        resume:
          "Aucune règle n'impose de changer le salaire, la fonction restant la même. En pratique, les familles l'ajustent souvent, par une prime ou une nouvelle répartition en garde partagée, avec un avenant.",
        motsCles: ["garde partagée", "répartition", "prime", "avenant"],
        corps: [
          {
            liste: [
              "Prime de garde complémentaire versée par la famille qui a un enfant de plus.",
              "Nouvelle répartition entre les familles en garde partagée : aucune contrainte légale (55/45, 60/40…), mais rarement 2/3 – 1/3, la charge de travail ne se répartissant pas ainsi.",
            ],
          },
          { p: "Dans les deux cas, établissez un avenant au contrat." },
        ],
      },
      {
        slug: "periode-essai",
        question: "Comment se calcule la période d'essai ?",
        source: "Convention collective IDCC 3239, art. 131.1 (CDI) et 44.2 (CDD)",
        resume:
          "En CDI, elle dure 1 mois, renouvelable une fois si le contrat le prévoit et si le salarié en est averti par écrit avant la fin. Elle se compte en jours calendaires.",
        motsCles: ["essai", "renouvellement", "jours calendaires"],
        corps: [
          {
            tableau: {
              entetes: ["Contrat", "Durée de la période d'essai"],
              lignes: [
                ["CDI", "1 mois, renouvelable une fois (renouvellement prévu au contrat et annoncé par écrit avant la fin de la période initiale)."],
                ["CDD de 6 mois ou moins", "1 jour par semaine de contrat, 2 semaines au plus. Exemple : contrat de 5 semaines → 5 jours."],
                ["CDD de plus de 6 mois", "1 mois au plus."],
                ["CDD sans terme précis", "Calculée sur la durée minimale prévue au contrat, à raison d'1 jour par semaine, 2 semaines au plus."],
              ],
            },
          },
          { p: "Tous les jours comptent : samedis, dimanches et jours fériés compris." },
        ],
      },
      {
        slug: "rupture-periode-essai",
        question: "Comment mettre fin à la période d'essai ?",
        source: "Code du travail, art. L1221-25 et L1221-26 ; convention collective, art. 44.1.3",
        resume:
          "Par écrit, en respectant un délai de prévenance qui dépend du temps de présence du salarié. La période d'essai se termine à la date prévue même si le délai n'est pas respecté : l'employeur verse alors une indemnité.",
        motsCles: ["délai de prévenance", "rupture", "essai"],
        corps: [
          {
            tableau: {
              entetes: ["Présence du salarié", "Délai si l'employeur rompt", "Délai si le salarié rompt"],
              lignes: [
                ["Moins de 8 jours", "24 heures", "24 heures"],
                ["De 8 jours à 1 mois", "48 heures", "48 heures"],
                ["Après 1 mois", "2 semaines", "48 heures"],
                ["Après 3 mois", "1 mois", "48 heures"],
              ],
            },
          },
          {
            p: "Si l'employeur ne respecte pas le délai, il verse une indemnité égale aux salaires et avantages que le salarié aurait perçus jusqu'à la fin du délai (indemnité de congés payés comprise). La rupture doit reposer sur un motif personnel, pas économique.",
          },
        ],
      },
    ],
  },
  {
    slug: "aides-caf",
    titre: "Les aides de la CAF et Pajemploi",
    porte: "employer",
    intro: "Obtenir le complément de libre choix du mode de garde (CMG) et comprendre ce que vous payez réellement.",
    questions: [
      {
        slug: "obtenir-cmg",
        question: "Comment obtenir l'aide de la CAF (CMG) ?",
        resume:
          "Faites la demande sur caf.fr avant de démarrer le contrat. Pajemploi vous confirme ensuite vos droits et votre numéro d'affilié.",
        motsCles: ["PAJE", "complément mode de garde", "CAF", "Pajemploi", "affiliation"],
        corps: [
          {
            etapes: [
              { titre: "Demande à la CAF", texte: "Sur caf.fr, avant le début du contrat : c'est la PAJE (prestation d'accueil du jeune enfant), qui comprend le CMG." },
              { titre: "Courrier de Pajemploi", texte: "Il confirme vos droits et vous indique votre numéro d'affilié." },
              { titre: "Première connexion à Pajemploi", texte: "Renseignez vos coordonnées bancaires pour les éventuels prélèvements de l'Urssaf." },
              { titre: "Accès pour Aide & Garde", texte: "Communiquez-nous vos identifiants Pajemploi pour que nous fassions les déclarations à votre place." },
            ],
          },
        ],
      },
      {
        slug: "fonctionnement",
        question: "Comment fonctionnent déclaration, aides et prélèvement ?",
        resume:
          "Chaque mois, la déclaration Pajemploi calcule les cotisations et déduit les aides de la CAF. Si le solde est positif, l'Urssaf le prélève ; s'il est négatif, elle vous rembourse. Ce qui reste à votre charge ouvre droit au crédit d'impôt.",
        motsCles: ["prélèvement urssaf", "remboursement", "reste à charge", "crédit d'impôt", "cotisations"],
        corps: [
          {
            liste: [
              "Vous versez le salaire au salarié.",
              "La déclaration calcule les cotisations et en retire les aides de la CAF.",
              "Solde positif : prélèvement par l'Urssaf. Solde négatif : remboursement.",
              "Le reste à charge (salaire + solde des cotisations, aides déduites) donne droit à un crédit d'impôt de 50 %, appliqué lors de la déclaration de revenus de l'année suivante, dans la limite des plafonds en vigueur.",
            ],
          },
        ],
      },
      {
        slug: "montant-cmg",
        question: "Combien vais-je recevoir de CMG ?",
        source: "Réforme du complément de libre choix du mode de garde, 1er septembre 2025 (caf.fr, monenfant.fr)",
        resume:
          "Depuis le 1er septembre 2025, le CMG est calculé à l'heure : il dépend de vos ressources, du nombre d'enfants, du coût horaire de la garde et du nombre d'heures. Chaque heure de garde est en partie prise en charge.",
        motsCles: ["réforme 2025", "calcul", "taux d'effort", "monoparentale", "12 ans", "cotisations"],
        corps: [
          {
            liste: [
              "Plus de montant maximum par tranche de revenus ni de reste à charge minimum de 15 % : le calcul tient compte de vos ressources réelles, dans un plancher et un plafond.",
              "Familles monoparentales : le CMG est versé jusqu'aux 12 ans de l'enfant (au lieu de 6 ans).",
              "Cotisations : pour une garde à domicile, la moitié des cotisations est prise en charge, dans la limite d'un plafond qui dépend de l'âge de l'enfant.",
              "Si le nouveau calcul vous est moins favorable, un complément transitoire peut être versé automatiquement, sous conditions.",
            ],
          },
          {
            note: "Pour une estimation à jour, utilisez le simulateur de l'Urssaf ou contactez-nous : nous faisons le calcul avec vous.",
          },
        ],
      },
      {
        slug: "cheques-prefinances",
        question: "Puis-je payer avec des chèques emploi service préfinancés ?",
        resume:
          "Oui : ils s'utilisent comme un chèque ou des espèces, pour une partie du salaire. Le reste se paie par virement.",
        motsCles: ["CESU préfinancé", "titre", "comité d'entreprise"],
        corps: [
          { exemple: "Salaire de 1 000 € : 200 € en chèques préfinancés (part payée par votre employeur ou votre comité) et 800 € par virement." },
        ],
      },
      {
        slug: "pajemploi-plus",
        question: "Faut-il utiliser Pajemploi+ ?",
        resume:
          "Nous ne le conseillons pas pour l'instant. Avec Pajemploi+, l'Urssaf prélève le salaire sur votre compte après la déclaration puis le verse au salarié : le salarié est payé plus tard, et les ajustements de fin de mois sont plus difficiles.",
        motsCles: ["paiement urssaf", "délai de paiement", "régularisation"],
        corps: [
          {
            liste: [
              "Délai de paiement plus long pour le salarié : deux virements et le temps de traitement de l'Urssaf, soit 5 à 9 jours.",
              "La déclaration doit être faite tôt, ce qui augmente les régularisations (absences ou heures supplémentaires de dernière minute).",
              "Une déclaration faite ne peut plus être modifiée : les ajustements passent sur le mois suivant, source d'incompréhensions entre employeur et salarié.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "fin-du-contrat",
    titre: "La fin du contrat",
    porte: "employer",
    intro: "Licenciement, démission, rupture conventionnelle : les étapes, les délais et les indemnités.",
    questions: [
      {
        slug: "licenciement",
        question: "Comment se déroule un licenciement ?",
        source: "Convention collective IDCC 3239, art. 161.1.1.1",
        resume:
          "L'employeur est à l'initiative. La décision doit reposer sur une cause réelle et sérieuse (ou une faute grave ou lourde) et suivre trois étapes : convocation, entretien préalable, notification.",
        motsCles: ["licencier", "entretien préalable", "convocation", "lettre recommandée"],
        corps: [
          {
            etapes: [
              {
                titre: "Convocation à l'entretien préalable",
                texte:
                  "Remise en main propre ou envoyée en recommandé avec avis de réception. Elle indique la date, l'heure et le lieu de l'entretien (votre domicile) et précise clairement qu'il s'agit d'un entretien préalable à un éventuel licenciement.",
              },
              {
                titre: "Entretien préalable",
                texte:
                  "Il ne peut avoir lieu qu'à partir du 4e jour ouvrable suivant la remise de la convocation, ou sa première présentation par la poste. Vous y expliquez les motifs envisagés.",
              },
              {
                titre: "Notification du licenciement",
                texte:
                  "Par lettre recommandée avec accusé de réception, à partir du 4e jour ouvrable et au plus tard le 30e jour ouvrable après l'entretien. Elle reprend clairement, précisément et complètement les motifs exposés lors de l'entretien.",
              },
            ],
          },
          {
            exemple:
              "Convocation remise en main propre le mardi 12 : on compte à partir du mercredi 13. Le 4e jour ouvrable est le samedi 16 ; un délai ne pouvant pas expirer un samedi, un dimanche ou un jour férié, il est reporté au lundi 18 : l'entretien peut avoir lieu à partir du lundi 18. Par recommandé, le décompte part du lendemain de la première présentation de la lettre.",
          },
          { p: "Un préavis, rémunéré, est ensuite respecté selon l'ancienneté (voir « Quel préavis respecter ? »)." },
        ],
      },
      {
        slug: "demission",
        question: "Mon salarié démissionne : que faire ?",
        source: "Convention collective IDCC 3239, art. 162.6",
        resume:
          "Le salarié vous informe par lettre recommandée avec accusé de réception ou remise en main propre contre décharge. Il n'a pas à se justifier, mais sa volonté doit être claire et non équivoque. Un préavis s'applique selon son ancienneté.",
        motsCles: ["démissionner", "lettre de démission"],
        corps: [
          {
            liste: [
              "Le salarié travaille pendant son préavis : il est payé normalement.",
              "Vous le dispensez de préavis : vous le payez quand même jusqu'à la fin du préavis.",
              "Il vous demande de ne pas faire son préavis : si vous êtes d'accord, le contrat s'arrête le dernier jour travaillé.",
            ],
          },
        ],
      },
      {
        slug: "rupture-conventionnelle",
        question: "Comment se passe une rupture conventionnelle ?",
        source: "Convention collective IDCC 3239, art. 161.3 ; Code du travail, art. L1237-11 et suivants",
        resume:
          "Employeur et salarié décident ensemble de mettre fin au contrat. La procédure compte cinq étapes, sur le site TéléRC, et doit être homologuée par la DREETS.",
        motsCles: ["TéléRC", "DREETS", "homologation", "rétractation", "accord"],
        corps: [
          {
            etapes: [
              { titre: "Accord des deux parties", texte: "Vous convenez ensemble d'une rupture conventionnelle." },
              {
                titre: "Signature de la convention",
                texte:
                  "Le formulaire est établi sur TéléRC en trois exemplaires (salarié, employeur, DREETS). Il fixe la date de fin de contrat et le montant de l'indemnité.",
              },
              { titre: "Délai de rétractation", texte: "15 jours calendaires à partir du lendemain de la signature ; chacun peut se rétracter par écrit." },
              { titre: "Envoi à la DREETS", texte: "La convention signée est télétransmise via TéléRC." },
              {
                titre: "Homologation",
                texte:
                  "La DREETS dispose de 15 jours ouvrables à partir du lendemain de la réception. Sans réponse, la rupture est homologuée. Remettez un exemplaire de l'homologation au salarié.",
              },
            ],
          },
          { p: "Il n'y a pas de préavis : la date de fin, inscrite dans la convention, tient compte des délais de rétractation et d'homologation." },
        ],
      },
      {
        slug: "justifier-rupture",
        question: "Comment justifier un licenciement ?",
        resume:
          "Le motif doit être factuel. Il est soit lié à votre situation (fin du besoin, changement d'horaires refusé), soit lié au salarié (faute, absences répétées, insuffisance professionnelle).",
        motsCles: ["motif", "cause réelle et sérieuse", "faute", "suppression de poste", "refus de modification"],
        corps: [
          {
            tableau: {
              entetes: ["Motif", "Exemples et conseils"],
              lignes: [
                [
                  "Lié à votre situation",
                  "Plus besoin d'un salarié ou plus les moyens de le payer (« suppression de poste ») ; besoin de nouveaux horaires : proposez un avenant ; si le salarié refuse ou ne répond pas dans les délais, licenciement pour « refus de modification du contrat de travail ». Donnez une explication objective et, si possible, montrez qu'elle s'impose à vous.",
                ],
                [
                  "Lié au salarié",
                  "Cause réelle (faits objectifs) et sérieuse (suffisamment grave pour rendre le licenciement inévitable) : faute, absences fréquentes qui obligent à le remplacer, insuffisance professionnelle. Décrivez les faits, les dates, les témoins.",
                ],
              ],
            },
          },
        ],
      },
      {
        slug: "indemnites",
        question: "Quelles indemnités verser ?",
        source: "Convention collective IDCC 3239, art. 163.1 (licenciement) et 161.3 (rupture conventionnelle)",
        resume:
          "Selon le cas : l'indemnité de congés payés non pris, l'indemnité de licenciement (dès 8 mois d'ancienneté, sauf faute grave ou lourde) et l'indemnité de rupture conventionnelle (au moins égale à celle de licenciement, quelle que soit l'ancienneté).",
        motsCles: ["indemnité de licenciement", "indemnité compensatrice", "congés non pris", "ancienneté"],
        corps: [
          {
            tableau: {
              entetes: ["Indemnité", "Règle"],
              lignes: [
                ["Congés payés", "Rémunère les congés non pris et ceux acquis, calculés au dernier jour du contrat. Pas d'indemnité si les 10 % de congés sont inclus dans le salaire."],
                ["Licenciement", "Dès 8 mois d'ancienneté, sauf faute grave ou lourde : 1/4 de mois de salaire brut moyen par année d'ancienneté jusqu'à 10 ans, puis 1/3 de mois par année au-delà. Non soumise à cotisations (sauf exception)."],
                ["Rupture conventionnelle", "Au moins égale à l'indemnité de licenciement, due quelle que soit l'ancienneté. Non soumise à cotisations : elle n'entre pas dans le crédit d'impôt."],
              ],
            },
          },
        ],
      },
      {
        slug: "preavis",
        question: "Quel préavis respecter ?",
        source: "Convention collective IDCC 3239, art. 162.4.1 (licenciement) et 162.6 (démission)",
        resume:
          "Sa durée dépend de l'ancienneté et de qui met fin au contrat. Il n'y en a pas en rupture conventionnelle, ni en cas de faute grave ou lourde.",
        motsCles: ["préavis", "durée", "dispense", "suspension"],
        corps: [
          {
            tableau: {
              entetes: ["Ancienneté", "Licenciement", "Démission"],
              lignes: [
                ["Moins de 6 mois", "1 semaine", "1 semaine"],
                ["De 6 mois à moins de 2 ans", "1 mois", "2 semaines"],
                ["2 ans ou plus", "2 mois", "1 mois"],
              ],
            },
          },
          {
            liste: [
              "Licenciement : l'ancienneté s'apprécie à la date d'envoi de la lettre ; le préavis commence à sa réception. Si vous dispensez le salarié de préavis, vous lui versez une indemnité compensatrice ; la période non travaillée compte pour l'ancienneté et les congés payés.",
              "Démission : le préavis commence à la première présentation de la lettre recommandée, ou le jour de la remise en main propre.",
              "Le préavis est suspendu et reporté en cas d'arrêt pour accident du travail ou maladie professionnelle, de congé maternité ou d'adoption, ou de congés payés (sauf accord écrit contraire).",
              "Assistants de vie : le salarié peut accepter par écrit un préavis plus long pour l'accompagnement d'une personne en perte d'autonomie ou handicapée.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "arret-de-travail",
    titre: "L'arrêt de travail",
    porte: "employer",
    intro: "Maladie, accident du travail, maternité : les documents à remplir et ce que perçoit le salarié.",
    questions: [
      {
        slug: "indemnites-journalieres",
        question: "Que perçoit le salarié pendant un arrêt ?",
        resume:
          "Des indemnités journalières de la Sécurité sociale, complétées par l'IRCEM Prévoyance. Aide & Garde établit l'attestation de salaire qui permet au salarié d'y avoir accès.",
        motsCles: ["IJ", "IRCEM", "prévoyance", "attestation de salaire", "sécurité sociale"],
        corps: [
          {
            tableau: {
              entetes: ["Arrêt", "Indemnisation"],
              lignes: [
                ["Maladie", "Sécurité sociale dès le 4e jour : 50 % du salaire journalier de base (moyenne des salaires bruts des 3 mois précédents). À partir du 8e jour, l'IRCEM complète jusqu'à 81,80 % du salaire brut de référence."],
                ["Accident du travail", "Du 1er au 28e jour : Sécurité sociale et IRCEM versent ensemble 81,80 % du salaire brut de référence. À partir du 29e jour : Sécurité sociale seule, 80 %."],
              ],
            },
          },
          { p: "En cas de prolongation pour le même motif, sans dépasser 6 mois d'arrêt continu, l'attestation de salaire n'a pas à être refaite." },
        ],
      },
      {
        slug: "accident-du-travail",
        question: "Mon salarié a un accident du travail : que faire ?",
        resume:
          "Déclarez l'accident à la CPAM du salarié dans les 48 heures, envoyez-lui l'attestation de salaire « accident », et remettez au salarié la feuille d'accident. Les formulaires sont dans votre espace.",
        motsCles: ["DAT", "déclaration d'accident", "CPAM", "feuille d'accident", "subrogation"],
        corps: [
          {
            etapes: [
              { titre: "Déclaration d'accident du travail", texte: "Complétez-la avec ce que vous savez de l'accident et envoyez-la en recommandé avec avis de réception à la CPAM du lieu de résidence du salarié." },
              { titre: "Attestation de salaire « accident »", texte: "Envoyez-la à la CPAM du salarié. Renseignez la partie subrogation avec votre RIB si vous maintenez le salaire." },
              { titre: "Feuille d'accident", texte: "Remettez-la au salarié : elle lui donne le tiers payant et la gratuité des soins, dans la limite des tarifs conventionnels." },
            ],
          },
        ],
      },
      {
        slug: "arret-maladie",
        question: "Mon salarié est en arrêt maladie : que faire ?",
        resume:
          "Dès réception de l'avis d'arrêt de travail, demandez-nous l'attestation de salaire « arrêt maladie ».",
        motsCles: ["maladie", "avis d'arrêt", "attestation de salaire"],
      },
      {
        slug: "conge-maternite",
        question: "Ma salariée part en congé maternité : quels documents ?",
        resume:
          "Deux attestations de salaire : la version « arrêt maladie » (en brut) et la version « maternité » (en net). Nous les établissons pour vous.",
        motsCles: ["maternité", "grossesse", "attestation"],
      },
      {
        slug: "conges-pendant-arret",
        question: "Le salarié acquiert-il des congés pendant un arrêt ?",
        source: "Code du travail, art. L3141-5 et L3141-19-1 (loi du 22 avril 2024)",
        resume:
          "Oui. Depuis la loi du 22 avril 2024, un salarié en arrêt maladie non professionnelle acquiert 2 jours ouvrables de congés par mois, dans la limite de 24 jours (4 semaines) par an ; en accident du travail ou maladie professionnelle, 2,5 jours par mois comme d'habitude.",
        motsCles: ["congés payés", "arrêt maladie", "loi 2024", "report", "15 mois"],
        corps: [
          {
            liste: [
              "Congés qui n'ont pas pu être pris à cause de l'arrêt : ils peuvent être reportés pendant 15 mois après le retour (période de report informée par l'employeur).",
              "La règle s'applique aussi aux arrêts passés, avec des délais pour la réclamer : un ancien salarié peut demander le paiement de congés acquis pendant un arrêt dans les 3 ans suivant la fin de son contrat.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "conges",
    titre: "Les congés",
    porte: "employer",
    intro: "Congés payés, repos hebdomadaire et jours pris en plus.",
    questions: [
      {
        slug: "dix-pour-cent",
        question: "Que veut dire « 10 % de congés inclus » ?",
        resume:
          "Le salarié est payé de ses congés à chaque heure travaillée : son taux horaire est majoré de 10 %, ce qui correspond à ses 5 semaines de congés. Il ne perçoit donc pas de salaire quand il part en congé.",
        motsCles: ["congés inclus", "majoration", "10 %"],
        corps: [
          { p: "Ce mode de paiement concerne surtout les salariés qui n'ont pas un contrat mensualisé, pour lesquels le calcul des congés est plus difficile." },
        ],
      },
      {
        slug: "repos-hebdomadaire",
        question: "Mon salarié peut-il travailler son jour de repos ?",
        resume:
          "À titre exceptionnel, à votre demande et avec son accord écrit. La contrepartie est convenue à l'avance : soit un salaire majoré de 25 %, soit un repos rémunéré majoré dans la même proportion.",
        motsCles: ["repos hebdomadaire", "dimanche", "majoration 25"],
        corps: [{ p: "Le repos hebdomadaire dure au moins 35 heures consécutives, de préférence le dimanche." }],
        source: "Convention collective IDCC 3239, art. 46",
      },
      {
        slug: "jours-au-dela",
        question: "Et les jours pris au-delà de ce qui est acquis ?",
        resume: "Trois cas : congés pris par anticipation, congés sans solde, ou jours offerts (imposés) par l'employeur.",
        motsCles: ["anticipation", "sans solde", "compteur négatif", "congés imposés"],
        corps: [
          {
            tableau: {
              entetes: ["Cas", "Conséquences"],
              lignes: [
                ["Pris par anticipation", "Le compteur du bulletin devient négatif ; il redevient positif les mois suivants."],
                ["Sans solde", "À la demande du salarié, avec votre autorisation : non rémunéré, contrat suspendu, pas de licenciement possible pendant le congé."],
                ["Offerts", "Imposés par l'employeur alors que le salarié n'a pas encore acquis ces jours : ils sont rémunérés."],
              ],
            },
          },
        ],
      },
      {
        slug: "quand-prendre",
        question: "Quand prendre les congés ?",
        resume:
          "Il n'y a pas de règle fixe : l'important est l'accord de tous sur les dates, de préférence aux périodes habituelles (été, Noël). En cas de désaccord, l'employeur peut imposer les dates en prévenant au moins 2 mois à l'avance.",
        motsCles: ["dates de congés", "désaccord", "imposer"],
        corps: [
          {
            liste: [
              "Au-delà de 5 semaines demandées par le salarié, vous pouvez accepter en « congés pour convenance personnelle non rémunérés ».",
              "Des jours que vous prenez en dehors des 5 semaines prévues sont des « congés supplémentaires imposés par l'employeur », rémunérés.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "jours-feries",
    titre: "Les jours fériés",
    porte: "employer",
    intro: "Le 1er mai et les autres jours fériés, chômés ou travaillés.",
    questions: [
      {
        slug: "premier-mai",
        question: "Comment est payé le 1er mai ?",
        source: "Convention collective IDCC 3239, art. 47.1",
        resume:
          "S'il tombe un jour habituellement travaillé, il est chômé et payé normalement. S'il est travaillé, le salaire de la journée est majoré de 100 %.",
        motsCles: ["1er mai", "fête du travail"],
        corps: [{ p: "Chômé, il compte comme du temps de travail effectif pour le calcul des congés payés." }],
      },
      {
        slug: "autres-feries",
        question: "Et les autres jours fériés ?",
        source: "Convention collective IDCC 3239, art. 47.2",
        resume:
          "Chômés, la rémunération habituelle est maintenue si le salarié a travaillé le jour habituellement travaillé qui précède et celui qui suit. Travaillés, ils doivent être prévus au contrat et sont majorés de 10 %.",
        motsCles: ["jour férié", "chômé", "travaillé", "majoration"],
        corps: [
          {
            exemple:
              "Le salarié travaille tous les jeudis et le jeudi 9 mai est férié : pour être payé normalement, il doit avoir travaillé les jeudis 2 et 16 mai.",
          },
        ],
      },
    ],
  },
  {
    slug: "sante-du-salarie",
    titre: "La santé du salarié",
    porte: "employer",
    intro: "Visite médicale et complémentaire santé.",
    questions: [
      {
        slug: "visite-information-prevention",
        question: "Faut-il une visite médicale ?",
        resume:
          "Oui : la visite d'information et de prévention, faite par un professionnel de santé au travail (pas le médecin traitant), dans les 3 mois qui suivent la prise de poste. Elle vaut 5 ans pour le même emploi.",
        motsCles: ["visite médicale", "médecine du travail", "VIP", "santé au travail"],
        corps: [{ p: "Le suivi est attaché au salarié, pas au poste : une visite faite chez un autre particulier employeur pour le même emploi reste valable." }],
      },
      {
        slug: "complementaire-sante",
        question: "Dois-je souscrire une complémentaire santé pour mon salarié ?",
        resume: "Non : les particuliers employeurs ne sont pas soumis à l'obligation de complémentaire santé collective.",
        motsCles: ["mutuelle", "complémentaire santé"],
      },
    ],
  },

  // ------------------------------------------------------------------ Espace
  {
    slug: "mon-espace",
    titre: "Utiliser mon espace Aide & Garde",
    porte: "espace",
    intro: "Les gestes du quotidien dans votre espace, sur ordinateur et sur téléphone.",
    questions: [
      {
        slug: "declarer-le-mois",
        question: "Comment déclarer les heures du mois ?",
        resume:
          "Sur le tableau de bord, cliquez sur « Déclarer » en face du salarié, indiquez les heures et les événements du mois (absences, heures en plus), puis envoyez. Nous établissons le bulletin et vous prévenons quand il est en ligne.",
        motsCles: ["déclaration", "heures", "absences", "envoyer"],
        corps: [
          { p: "Une erreur après l'envoi ? Depuis la gestion du salarié, demandez une modification : nous corrigeons le bulletin." },
        ],
        lien: { href: "/tableau-de-bord", libelle: "Aller au tableau de bord" },
      },
      {
        slug: "telecharger",
        question: "Où trouver et télécharger mes documents ?",
        resume:
          "Dans l'onglet Documents : choisissez le salarié, puis cliquez sur « Télécharger ». Vos documents restent disponibles en permanence, même si vous changez d'ordinateur.",
        motsCles: ["télécharger", "bulletin", "pdf", "documents"],
        corps: [
          { p: "Un document pas encore ouvert porte la pastille « Nouveau ». Le fichier enregistré porte le nom de l'employeur, du salarié, le type et le mois (ex. DUPONT_MARTIN_BP_2610.pdf)." },
          { p: "Sur iPhone, le PDF s'ouvre d'abord dans l'aperçu : touchez le bouton de partage puis « Enregistrer dans Fichiers »." },
        ],
        lien: { href: "/tableau-de-bord/documents", libelle: "Mes documents" },
      },
      {
        slug: "ajouter-un-salarie",
        question: "Comment ajouter un salarié ?",
        resume:
          "Sur le tableau de bord, « + Ajouter un salarié » : renseignez le salarié et son contrat, puis envoyez. Nous validons la gestion, qui apparaît ensuite dans « Mes salariés ».",
        motsCles: ["nouvelle gestion", "embauche", "nouveau salarié"],
        corps: [{ p: "Le nombre de salariés suivis dépend de votre abonnement : quand il est complet, contactez-nous pour le faire évoluer." }],
      },
      {
        slug: "notifications",
        question: "Comment être prévenu d'un nouveau document ?",
        resume:
          "Activez les notifications dans « Mon compte » : votre téléphone ou votre ordinateur vous prévient dès qu'un document est en ligne. Une copie par email est envoyée en plus, sauf si vous la désactivez.",
        motsCles: ["notification", "alerte", "email", "push"],
        corps: [{ p: "Sur iPhone, ajoutez d'abord le site à l'écran d'accueil (bouton de partage, « Sur l'écran d'accueil ») : les notifications ne fonctionnent qu'ainsi." }],
        lien: { href: "/mon-compte", libelle: "Mon compte" },
      },
      {
        slug: "abonnement-resiliation",
        question: "Comment fonctionne l'abonnement, et comment le résilier ?",
        resume:
          "L'abonnement est prélevé chaque mois à la date anniversaire de la souscription. Vous pouvez le résilier en ligne dans l'onglet Abonnement : il prend fin le dernier jour du mois en cours, qui reste dû.",
        motsCles: ["prélèvement", "résilier", "carte bancaire", "formule", "tarif"],
        corps: [
          { p: "Jusqu'à la fin du mois, tout continue normalement, et vous pouvez annuler la résiliation. Vos documents restent consultables ensuite." },
        ],
        lien: { href: "/tableau-de-bord/abonnement", libelle: "Mon abonnement" },
      },
    ],
  },
];

export function themeParSlug(slug: string): Theme | undefined {
  return THEMES.find((t) => t.slug === slug);
}

/** Entrées de recherche (une par question), transmises au navigateur. */
export function indexRecherche() {
  return THEMES.flatMap((t) =>
    t.questions.map((q) => ({
      href: `/aide/${t.slug}#${q.slug}`,
      theme: t.titre,
      question: q.question,
      resume: q.resume,
      texte: simplifierTexte([q.question, q.resume, ...(q.motsCles ?? []), t.titre].join(" ")),
    })),
  );
}
export type EntreeRecherche = ReturnType<typeof indexRecherche>[number];
