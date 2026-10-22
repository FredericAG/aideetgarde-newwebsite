# Centre d'aide — liste de relecture avant publication

Contenu : `src/lib/aide/contenu.ts`, repris de la présentation « site aide et garde » (21/10/2026). Tant que `EN_RELECTURE = true` (`src/lib/aide/types.ts`), les pages affichent un bandeau « en cours de relecture » et ne sont pas indexées par les moteurs de recherche.

Pour publier : relire chaque point, cocher, corriger le texte si besoin (ou me le dire), puis passer `EN_RELECTURE` à `false`.

## Déjà corrigé par rapport à la présentation

- CMG : réforme du 1er septembre 2025 (calcul à l'heure selon ressources, nombre d'enfants, coût horaire ; fin du reste à charge minimum de 15 % ; familles monoparentales jusqu'aux 12 ans ; cotisations prises en charge à 50 % pour la garde à domicile, dans un plafond selon l'âge ; complément transitoire). Sources : monenfant.fr, FEPEM.
- Congés payés pendant un arrêt maladie : loi du 22 avril 2024 (2 jours par mois en maladie non professionnelle, 24 jours par an au plus ; report de 15 mois ; réclamation par un ancien salarié dans les 3 ans). La présentation disait « sans limite de temps ».
- « Attestation Pôle emploi » → attestation France Travail.
- Montants datés retirés : taux horaires minimums 8,77 € / 9,67 €, 4,70 € par repas, plafond de 471 €, montants CMG par âge.
- Coquille diapositive 37 (« ???? Dépend du nouveau bulletin ») retirée.
- Situation irrégulière : la phrase « il est tout à fait possible de déclarer toute personne quel que soit son statut auprès de l'Urssaf » est retirée (interdiction d'emploi d'un étranger sans autorisation de travail).
- Préavis de licenciement (1 semaine / 1 mois / 2 mois), indemnité de licenciement (dès 8 mois, 1/4 puis 1/3 de mois par année) : conformes à la brochure DREETS « particulier employeur » (janvier 2022).
- Délais de prévenance de la période d'essai : repris du Code du travail (24 h, 48 h, 2 semaines, 1 mois).

## Vérifié le 22/10 dans la convention collective (IDCC 3239, texte de référence transmis par Frédéric)

Légifrance ne se lit pas depuis l'outil de Claude : vérification faite sur des reprises du texte (Code du travail numérique du ministère, fiches DREETS, sites qui citent les articles). La référence est maintenant affichée sous chaque réponse concernée.

| Page | Point | Résultat |
|---|---|---|
| Le contrat › Période d'essai | CDI : 1 mois, renouvelable une fois par écrit | ✅ Conforme (art. 131.1) ; CDD : droit commun (art. 44.2) |
| Le contrat › Rupture de l'essai | Délais de prévenance | ✅ Code du travail L1221-25 et 26 (l'article 131.1 est étendu sous leur réserve) |
| La fin du contrat › Licenciement | Entretien à partir du 4e jour ouvrable ; notification du 4e au 30e jour ouvrable | ✅ La présentation avait raison (art. 161.1.1.1). Exemple de calcul corrigé : un délai qui expire un samedi, un dimanche ou un jour férié est reporté au jour ouvrable suivant |
| La fin du contrat › Préavis | Licenciement 1 semaine / 1 mois / 2 mois ; démission 1 semaine / 2 semaines / 1 mois | ✅ Conforme (art. 162.4.1 et 162.6) |
| La fin du contrat › Indemnités | Dès 8 mois, 1/4 puis 1/3 de mois par année ; rupture conventionnelle au moins égale | ✅ Conforme (art. 163.1 et 161.3) |
| Les jours fériés | 1er mai : chômé sans perte de salaire, travaillé majoré de 100 % ; autres : maintien du salaire si le jour habituel précédent et suivant sont travaillés, travaillé prévu au contrat et majoré de 10 % | ✅ Conforme (art. 47.1 et 47.2) |
| Les congés › Repos hebdomadaire | Majoration de 25 % | ⚠️ Corrigé : à la demande de l'employeur, avec accord écrit du salarié, contrepartie convenue à l'avance : salaire majoré de 25 % **ou** repos rémunéré majoré d'autant (art. 46) ; repos de 35 heures consécutives au moins |
| L'arrêt de travail › Indemnités | 81,80 % du salaire brut de référence | ✅ Taux confirmé (annexe prévoyance, 81,8 %) |

## Reste à vérifier par Frédéric

| ☐ | Page | Point |
|---|---|---|
| ☐ | Le contrat › CDD | La prime de précarité de 10 % (droit commun, art. 44.2 de la convention) : confirmer qu'elle s'applique dans vos dossiers. |
| ☐ | Le contrat › Repas | Montant forfaitaire de l'avantage en nature repas en vigueur (à citer avec sa date, ou laisser sans montant). |
| ☐ | La fin du contrat › Préavis | Assistants de vie : préavis plus long avec accord écrit (mention de la présentation, non retrouvée dans les extraits consultés). |
| ☐ | La fin du contrat › Justifier | Formulation « motif lié à votre situation » plutôt que « motif économique » : d'accord ? |
| ☐ | L'arrêt de travail › Indemnités | Point de départ du complément IRCEM (8e jour en maladie, 1er jour en accident du travail) et 80 % à partir du 29e jour : non retrouvés dans les extraits consultés (annexe 3 de la convention). |
| ☐ | L'arrêt de travail › Accident | Délai de 48 heures pour déclarer l'accident à la CPAM (ajouté). |
| ☑ | La santé du salarié › Visite | Réglé le 23/10 : réponse réécrite d'après spstn.org (SPSTN depuis le 2 janvier 2025, adhésion par l'APNI via Cesu/Pajemploi, contact à l'embauche, une visite par type d'emploi, indemnisation APNI). |
| ☐ | Les aides › Crédit d'impôt | Plafonds en vigueur à citer ou non. |
| ☐ | Les avantages de votre salarié (nouveau, 23/10) | ASC loisirs, Ircem, santé au travail, et la fiche PDF à remettre au salarié (`outils/fiche-salarie/generer.py`). |
| ☐ | Utiliser mon espace | Textes conformes au fonctionnement du site (déclaration, téléchargement, notifications, résiliation). |

## Contenu de la présentation non repris pour l'instant

- Captures d'écran de bulletins (diapositives 3 à 5, 7) : à remplacer par des extraits du nouveau bulletin, ou par un bulletin annoté, quand le modèle sera arrêté.
- Tableaux en image des délais (diapositives 15, 16, 29 à 31) : remplacés par des tableaux en texte.
- Montants du CMG par mode d'accueil (diapositives 20, 21) : à remplacer par un renvoi au simulateur de l'Urssaf ou au nôtre une fois validé.
