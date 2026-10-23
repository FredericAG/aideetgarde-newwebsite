# Aide & Garde — Spécifications fonctionnelles du nouveau site

Document vivant, créé le 19/10/2026. Il décrit **ce que le site doit faire**, règle par règle, du point de vue de l'abonné et de l'administrateur. Les choix techniques, l'ordre des briques et l'historique des décisions sont dans `Analyse_croisee_et_feuille_de_route.md`. Les scénarios de test sont dans `Recette_briques_1_2.md`.

Chaque règle porte un statut : **En place** (codé et vérifiable sur le site de test), **À faire** (validé, pas encore codé) ou **À trancher** (décision attendue de Frédéric).

## 1. Principes transverses

| Règle | Statut |
|---|---|
| Tout texte vu par l'utilisateur est en français : pages, boutons, messages d'erreur, emails envoyés par Supabase (modèles dans `docs/emails-supabase.md`). | En place (emails : à coller dans Supabase) |
| Les règles métier importantes sont imposées par la base de données elle-même, et pas seulement par les écrans : un bug d'affichage ne peut pas les contourner. | En place |
| Le pointeur de la souris devient une main sur tout élément cliquable : boutons, liens, textes d'action (« Supprimer », « Terminer la gestion »…), zone de dépôt, menus déroulants, éléments repliables. Sur un bouton désactivé, il indique que l'action est impossible. | En place (19/10) |
| Les mentions d'aide (« Cliquez sur un document pour le télécharger… ») sont placées **avant** la liste qu'elles concernent, jamais après : avec beaucoup d'éléments, une mention en bas de liste n'est plus visible. | En place (19/10) |
| **Identité visuelle de l'ancien site** reprise (charte 2018) : fond blanc, boutons en forme de pilule à contour jaune — violets pour l'action principale, blancs à texte teal pour les actions courantes et la navigation —, blocs gris clair arrondis, polices Corporative et Stevie Sans. L'ergonomie, elle, est repensée librement (pas de colonne de menu à gauche, qui repousse le contenu sous le pli sur téléphone ; navigation en haut de page). Pas de thème sombre automatique pour l'instant (l'ancien site n'en a pas ; la charte est pensée pour un fond clair). | En place (20/10) |
| Les listes de données sont présentées en **tableaux à colonnes titrées** sur ordinateur ; sur téléphone, chaque ligne devient une petite fiche où chaque valeur est précédée de son intitulé (pas de défilement horizontal). | En place (20/10) |
| **Confirmation avant toute action irréversible ou lourde** : suppression d'un document ou d'une gestion, fin d'une gestion, résiliation d'un abonnement. Une fenêtre aux couleurs du site demande « Oui / Non » et rappelle la conséquence ; « Non » (ou Échap) est le choix par défaut. | En place (20/10) |
| Les actions « Supprimer » sont des **icônes poubelle** rouges (nom complet de l'action au survol et pour les lecteurs d'écran). | En place (20/10) |
| Les tableaux et listes de documents ont des **lignes alternées** blanc / gris clair, plus marquées sur téléphone. | En place (20/10) |
| Chaque action qui échoue affiche un message en français qui dit quoi faire, jamais un écran figé ou une erreur technique brute. | En place |
| **Fluidité de navigation : exigence majeure.** Mesure du 19/10 (serveurs à Paris) : changements de page servis en 90 à 110 ms environ ; les requêtes plus longues (jusqu'à ~290 ms) sont surtout des préchargements en arrière-plan ou des premiers appels après une période d'inactivité. Les pages déjà visitées sont gardées 30 secondes dans le navigateur pour un retour instantané. Chaque clic produit un effet visible immédiat (bouton qui passe en « Suppression… », indicateur « Chargement… » au changement de page). Objectifs : seuils « bons » des Core Web Vitals de Google sur mobile (contenu principal affiché en 2,5 s au plus, réaction à une action en 200 ms au plus, pas de décalage visuel pendant le chargement). Serveurs du site et base de données à Paris. | En place (retour visuel, serveurs à Paris) ; mesure chez les utilisateurs à faire |
| **Simplicité avant tout** (Frédéric, 23/10) : les abonnés viennent pour **se décharger des lourdeurs administratives** ; ils veulent aller à l'essentiel et comprendre d'un coup d'œil. Chaque écran met en avant une seule chose à faire ; les textes sont courts ; les **mentions légales obligatoires restent complètes mais discrètes** (notes en petit, sans encadré ni couleur, sous ce qu'elles concernent), jamais au premier plan. | Règle permanente |

## 2. Comptes et rôles

| Règle | Statut |
|---|---|
| Inscription par email et mot de passe (8 caractères minimum), confirmation d'adresse par email (lien vers le site). | En place |
| Connexion, déconnexion, mot de passe oublié, modification des coordonnées dans « Mon compte ». | En place |
| Trois rôles génériques : employeur (l'abonné), salarié (prévu, non utilisé au lancement), administrateur. | En place |
| Le rôle administrateur ne peut être attribué que par une commande dans la console Supabase, jamais depuis le site. Un non-administrateur qui tente d'ouvrir l'espace Administration voit une page « introuvable ». | En place |

## 3. Abonnement et quota de gestions

| Règle | Statut |
|---|---|
| Un employeur a au plus un abonnement actif. L'abonnement porte un quota de gestions simultanées (4 par défaut, modifiable par l'admin) et un tarif mensuel. | En place |
| Seules les gestions « en cours » comptent dans le quota. Terminer une gestion libère une place sans toucher à l'abonnement. | En place |
| « Terminer une gestion » et « Résilier l'abonnement » sont deux actions distinctes : résilier ne termine pas les gestions en cours. | En place (côté admin) |
| **Souscription en ligne** (page « Mon abonnement ») : l'abonné choisit le nombre de salariés suivis, paie le premier mois par carte dans le formulaire Systempay intégré à la page (3-D Secure). La carte est enregistrée chez Systempay sous forme d'alias (Aide & Garde ne voit jamais le numéro). L'abonnement est actif dès le paiement accepté ; email de confirmation à l'abonné, alerte à Aide & Garde. Les formules plus petites que le nombre de salariés déjà suivis ne sont pas proposées. | En place en mode TEST (21/10, brique 5a) — à recetter |
| **Prélèvement mensuel déclenché par le site** (décision du 21/10, voir § 3.1) : chaque matin, le site débite les échéances du jour avec l'alias de la carte, à la date anniversaire de la souscription (jour 1 à 28 ; souscription un 29, 30 ou 31 → prélèvement le 28), sans proratisation — date anniversaire confirmée par Frédéric le 21/10. Réponse immédiate de Systempay : le site sait toujours si un mois est payé. | En place en mode TEST — à recetter |
| **Refus d'une échéance** : nouvel essai automatique 3 jours puis 7 jours après l'échéance ; email à l'abonné à chaque refus (même s'il a désactivé les notifications : c'est une information de paiement). Après 3 refus : « Impayé », email à l'abonné et alerte à Aide & Garde, plus aucune nouvelle échéance n'est créée tant que ce n'est pas réglé. L'abonné peut régler en ligne avec une nouvelle carte, qui remplace l'ancienne. | En place en mode TEST — à recetter |
| **Filet de sécurité** : un paiement resté « en attente » (navigateur fermé, notification manquée) est vérifié auprès de Systempay le lendemain matin ; un débit dont la réponse s'est perdue est vérifié avant tout nouvel essai. Une notification reçue deux fois ne compte qu'une fois. Jamais de double débit. | En place |
| Paiement reçu en double ou d'un montant inattendu : rien n'est activé, Aide & Garde est alerté (« Paiements à vérifier ») et rembourse depuis le Back Office Systempay. | En place |
| Abonnements saisis par l'administration (données de test, anciens abonnés avant la reprise) : « hors site », jamais prélevés par le nouveau site. Modifier le tarif d'un abonnement payé en ligne change le montant des prochains prélèvements. | En place |
| **Résiliation par l'abonné** (brique 5b) : bloc « Résilier mon abonnement » sur la page Mon abonnement, avec fenêtre de confirmation qui précise la date d'effet : **fin du mois civil en cours** (décision du 21/10). Jusque-là, tout reste accessible ; **le mois reste dû** (décision de Frédéric du 21/10) : une échéance qui tombe entre la demande et la fin du mois est prélevée normalement, la fenêtre de confirmation et l'email l'annoncent (« un dernier prélèvement de 12,90 € aura lieu le 25/10 ») ; aucune échéance après la date de fin. Une échéance déjà refusée reste due. L'abonné peut **annuler** sa demande jusqu'à la date de fin (les prélèvements continuent normalement). Email de confirmation à l'abonné, alerte à Aide & Garde (avec le rappel d'arrêter un éventuel prélèvement de l'ancien site). Le lendemain de la date de fin, la tâche quotidienne passe l'abonnement en « résilié » ; les gestions ne sont pas terminées (décision 4), les documents restent consultables, l'abonné peut se réabonner en ligne. Côté administration : bandeau sur la fiche, « Résiliation au … » dans l'onglet Abonnements. | En place (21/10) — à recetter |
| Changement de formule en ligne. | À faire (brique 5c) |
| Grille tarifaire à paliers (plafond 25,80 € à partir de 4 salariés). **Grille provisoire en place, validée pour la recette (21/10)** : 1 salarié 12,90 €, 2 : 19,20 €, 3 et 4 : 25,80 € (fichier `src/lib/formules.ts`). | À trancher (brique 12) |

### 3.1 Pourquoi le site déclenche lui-même les prélèvements (décision du 21/10, validée par Frédéric)

Deux façons de faire un abonnement mensuel avec Systempay :

- **Abonnement géré par Systempay** (`Charge/CreateSubscription`, celui de l'ancien site) : Systempay prélève seul chaque mois et prévient le site par une notification. Si la notification se perd, le site ne sait pas que le mois est payé : c'est exactement le décalage historique. Changer le montant ou gérer les refus passe par d'autres appels.
- **Prélèvement déclenché par le site** (« paiement 0 clic » avec l'alias, retenu) : le site demande lui-même le débit chaque mois et reçoit la réponse immédiatement. Plus de dépendance à une notification ; changement de formule, résiliation et relances deviennent de simples règles du site. Contrepartie : la tâche quotidienne doit tourner (Vercel, chaque matin ; si elle saute un jour, elle rattrape le lendemain) ; le premier paiement reste confirmé par notification ET par vérification.

À confirmer auprès de la BRED : le contrat doit inclure le paiement par alias (« 0 clic ») et l'API REST du formulaire embarqué. Les abonnements de l'ancien site (gérés par Systempay) pourront être convertis à la reprise (brique 13) avec leur alias existant, sans que l'abonné ressaisisse sa carte.

## 4. Gestions

| Règle | Statut |
|---|---|
| Une gestion = un salarié employé par l'abonné : type (garde d'enfants, aide à domicile, employé de maison), nom et prénom du salarié, dates de début et de fin, statut. | En place |
| L'abonné voit ses gestions en cours ; les gestions terminées sont regroupées dans un bloc repliable. | En place |
| **L'abonné crée lui-même une gestion** (bouton « + Créer une gestion » du tableau de bord, abonnement actif requis). Formulaire en deux blocs : *Le salarié* (emploi, prénom, nom) et *Le contrat* (date de début, CDI/CDD, date de fin si CDD, durée de travail en heures par semaine ou par mois, salaire horaire net, précisions libres). | En place (20/10, brique 3) — à recetter |
| **Cycle de vie** (décision de Frédéric du 20/10) : **brouillon → envoyée → en cours → terminée**. Brouillon : saisie libre, modifiable, supprimable, ne compte pas dans le quota (5 brouillons au plus). Envoyée : plus modifiable par l'abonné (sauf « Annuler l'envoi »), occupe une place du quota, attend la validation d'Aide & Garde. Pour envoyer, il faut : prénom, nom, type de contrat (et date de fin si CDD), durée de travail, salaire horaire net. | En place (20/10) |
| Côté administration : liste « Gestions à valider » en tête de l'espace admin ; dans la fiche du compte, pastille « À valider », récapitulatif des informations du contrat, boutons **« Valider et démarrer »** (confirmation) ou **« Renvoyer à l'abonné pour qu'il complète »** avec un message. L'abonné est prévenu dans les deux cas (notification + email) ; le message de retour s'affiche en haut de son brouillon. Un email avertit aussi Aide & Garde à chaque gestion envoyée. | En place (20/10) |
| **Quota expliqué à l'abonné** : quand toutes les places sont utilisées, un encadré l'indique au tableau de bord, sur la page de création et dans le brouillon (« Votre abonnement est complet (N / N) ») ; le brouillon reste enregistrable ; à l'envoi, le message dit combien de places l'abonnement permet et quoi faire. Dépassement (ex. 5 / 3) signalé à l'abonné. Un brouillon peut être enregistré sans le nom du salarié ; nom, prénom, type de contrat, durée de travail et salaire sont exigés à l'envoi, avec la liste précise de ce qui manque. | En place (20/10, brique 3c) |
| **Quota fiable (correction recette 3.7)** : le quota compte toutes les gestions envoyées ou en cours de l'employeur, quel que soit l'abonnement auquel elles étaient rattachées, et se compare au quota de l'abonnement actif. Il est vérifié à l'envoi, à la validation par l'administrateur et à la réouverture. Un quota ne peut plus être baissé sous le nombre de places utilisées ; un dépassement existant est signalé en rouge dans la fiche du compte. | En place (20/10, brique 3b) |
| **Demande d'avenant** : sur une gestion en cours, l'abonné clique « Demander un avenant », coche ce qui change (garde partagée, organisation/horaires, durée de travail, taux horaire, adresse, autre), indique la date d'effet et décrit le changement. Une seule demande en attente par gestion. L'administrateur est alerté (email + actions à effectuer). La demande se clôt automatiquement au dépôt d'un document « Avenant » pour la gestion, ou manuellement (« Marquer comme traitée sans document »), l'abonné étant alors prévenu. L'administrateur peut mettre à jour les informations du contrat. | En place (20/10, brique 3b) |
| **Actions à effectuer (administrateur)** : pastille avec le nombre d'actions en attente sur « Administration » (et sur l'onglet Admin du téléphone), sur toutes les pages ; encadré récapitulatif en tête de l'espace admin (gestions à valider, demandes d'avenant, déclarations). | En place (20/10) |
| Toutes les écritures de l'abonné passent par des fonctions de la base qui vérifient elles-mêmes qui fait quoi (l'abonné n'a aucun droit d'écriture directe sur les gestions). Le quota compte les gestions envoyées et en cours (« places utilisées »). | En place (20/10) |
| Champs détaillés du contrat (une soixantaine, selon le service : indemnités, conditions d'accueil, agrément…) dans la couche configurable, et données sensibles du salarié (n° de Sécurité sociale, pièce d'identité) : **non collectés pour l'instant**, en attente des réponses aux 5 questions de `Champs_gestion_et_modele_configurable.md` (notamment information du salarié et durée de conservation). | À venir |

## 5. Documents

### 5.1 Types de documents

Liste confirmée par Frédéric le 19/10/2026. **En place** (script `brique2e_types_documents.sql`).

| Type | Code dans les noms de fichiers |
|---|---|
| Bulletin de salaire | BP (norme du 21/10 ; BPG, code actuel, reste reconnu pour la reprise) |
| Contrat de travail | CTRA |
| Avenant | AV |
| Certificat de travail | CT |
| Solde de tout compte | STC |
| Attestation France Travail | FT |
| Attestation de salaire | AS |
| Attestation employeur | AE (ajouté le 21/10, script `brique2h`) |
| Attestation sur l'honneur | ATTHON |
| Procédure de licenciement (informations et courriers) | LIC |
| Rupture conventionnelle (informations, Cerfa) | RUPT |
| Courrier / lettre (démission, engagement d'un mineur, attestation d'emploi…) | LET |
| Autre attestation | — |
| Autre | — |

Les codes sans mention sont ceux déjà utilisés par Frédéric. Les « propositions » sont à valider. Pour les courriers, le titre précise la nature de la lettre ; si certains courriers reviennent souvent et doivent être triés à part (par exemple les démissions), ils pourront devenir des types distincts.

### 5.2 Règles anti-doublons

| Règle | Statut |
|---|---|
| **Un seul bulletin de salaire par mois et par gestion, sans exception.** Un bulletin corrigé remplace l'ancien : on supprime l'ancien puis on dépose le nouveau. Un bulletin doit toujours avoir une période. | En place |
| Pour les autres types : pas deux documents avec le même type, la même période et le même titre dans une gestion (comparaison insensible aux majuscules et aux espaces en trop). | En place |
| La période est au format AAMM, avec un mois de 01 à 12. | En place |
| Lors d'un dépôt en masse, un bulletin pour un mois déjà rempli n'est jamais écrasé silencieusement : il apparaît en « conflit » et l'admin choisit explicitement de remplacer ou d'ignorer. | En place (22/10, brique 4) — à recetter |
| **Remplacement proposé plutôt que refus** (demande du 21/10) : si le document déposé existe déjà dans la gestion (même type, même période, même complément), le site ne refuse plus : il demande « Un bulletin de mai 2026 existe déjà (déposé le …, téléchargé par l'abonné le … / pas encore téléchargé). Le remplacer ? Oui, remplacer / Non, garder l'existant ». Au dépôt unitaire : fenêtre de confirmation. Au dépôt en masse : choix ligne par ligne dans le récapitulatif, avec « Tout remplacer » / « Tout ignorer ». Un fichier **strictement identique** (même contenu) est signalé « déjà déposé, identique » et ignoré par défaut. Le document remplacé redevient « Nouveau » pour l'abonné. Le remplacement est tracé côté admin (« remplace la version du … »). | En place (22/10, brique 4) — à recetter |

### 5.3 Stockage et conservation

| Règle | Statut |
|---|---|
| Les PDF sont stockés dans un espace **privé** : aucun fichier n'a d'adresse publique. Un abonné ne peut lire que ses propres fichiers ; l'administrateur peut tout lire, déposer et supprimer. | En place |
| Les documents restent **en permanence** dans l'espace de l'abonné. Il peut les retélécharger autant de fois qu'il le souhaite (par exemple après la perte de son ordinateur), sans intervention de l'admin. | En place |
| À chaque clic, le site fabrique un lien de téléchargement valable 60 secondes : un lien copié ou transféré cesse de fonctionner au bout d'une minute. | En place |
| Le fichier téléchargé porte un nom lisible (titre et période), pas un code. | En place — remplacé par la règle suivante pour les fichiers déposés selon la norme |
| **Nom du fichier téléchargé = nom déposé, sans la référence de gestion** (demande du 21/10) : `AG00123_DUPONT_MARTIN_BP_2605.pdf` est téléchargé par l'abonné sous le nom `DUPONT_MARTIN_BP_2605.pdf`, sur ordinateur comme sur téléphone. Le nom d'origine est conservé à part dans la base (le nom technique dans le stockage ne change pas). La référence AGxxxxx reste ainsi réservée à l'administration. Fichier déposé hors norme : nom lisible actuel (titre et période). Sur iPhone, le PDF s'ouvre d'abord dans l'aperçu ; le nom s'applique quand l'abonné l'enregistre (« Enregistrer dans Fichiers ») ou le partage. | En place (21/10) — à recetter |
| Dans la console Supabase, les dossiers et fichiers portent des noms lisibles : `nom-employeur_<identifiant>/nom-salarie_<identifiant>/<AAMM>_<type>_<titre>__<identifiant>.pdf`. Les identifiants garantissent l'unicité et la sécurité ; les noms ne servent qu'à s'y retrouver. Les fichiers déposés avant le 19/10 gardent leur ancien nom codé. | En place (19/10) |
| Retrouver un document parmi des milliers doit se faire depuis l'espace Administration du site (recherche par nom d'employeur, de salarié, période, type), pas en parcourant la console Supabase. | À faire (avec la brique 4) |
| Supprimer un document supprime aussi son fichier ; supprimer une gestion supprime ses documents et leurs fichiers. | En place |
| PDF uniquement, 20 Mo maximum par fichier. | En place |
| Sauvegarde régulière des PDF stockés : les sauvegardes du plan Supabase Pro couvrent la base de données mais **pas** les fichiers. | À faire (avant ouverture) |
| Durée de conservation des documents (RGPD), notamment pour un abonné résilié depuis longtemps. | À trancher (avant ouverture) |
| Pendant les tests (plan gratuit, sans sauvegarde) : PDF fictifs uniquement. | En vigueur |

### 5.4 Affichage côté abonné

| Règle | Statut |
|---|---|
| Ordre des informations sur chaque ligne de document : **type**, puis **période**, puis le **titre cliquable** (lien de téléchargement). Colonnes alignées. | Remplacé le 21/10 (ligne suivante) |
| **Lignes de documents simplifiées** (retour du 21/10) : on est déjà sur le compte de l'abonné et dans la gestion d'un salarié, donc ni le nom de l'employeur ni celui du salarié ne sont répétés. Colonnes : **Document** (type et précision éventuelle, lien de téléchargement : « Avenant — n° 2 », « Courrier / lettre — Démission »), **Période**, **Mis en ligne le** (admin : « Téléchargé le »), bouton. Le titre libre disparaît : à la place, une **précision facultative** (60 caractères) saisie au dépôt. | En place (21/10, script `brique2h` à exécuter avant la mise en ligne) — à recetter |
| **Nom du fichier téléchargé** : `NOMEMPLOYEUR_NOMSALARIE_CODE_AAMM[_PRÉCISION].pdf`, construit à partir des noms enregistrés (majuscules sans accents), y compris pour les documents déjà en ligne. Codes « ATT » (autre attestation) et « DOC » (autre) pour les deux types sans code. | En place (21/10) — à recetter |
| **Tableau de bord simplifié** (retour du 21/10, bonnes pratiques : une page d'accueil montre ce qui demande une action, le reste est à un clic) : « Bonjour Prénom » ; alertes seulement si nécessaire (prélèvement refusé, abonnement complet ou dépassé, pas d'abonnement) ; nouveaux documents à télécharger ; gestions en préparation ; **Mes salariés** (salarié et emploi, dernier bulletin, statut du mois avec bouton « Déclarer ») ; en bas, liens « Tous mes documents » et résumé d'une ligne de l'abonnement. Retirés : grande carte d'abonnement (onglet Abonnement), « Vos 5 derniers documents » et gestions terminées (onglet Documents), date d'inscription. | En place (21/10) — à recetter |
| **Onglet de la page affichée mis en valeur** (retour du 21/10) : dans l'en-tête (ordinateur), l'onglet courant est en violet plein, texte blanc, côté abonné ; en jaune, texte foncé, dans l'administration (thème sombre). Les sous-pages comptent pour leur onglet (une gestion → Tableau de bord, une fiche → Comptes). Sur téléphone, la barre du bas le faisait déjà. Le lien « ← Tableau de bord » de la page Abonnement est retiré (les autres onglets n'en ont pas) ; il reste sur les sous-pages (détail d'une gestion, nouvelle gestion). | En place (21/10) — à recetter |
| **Synthèse de l'abonnement remise sur le tableau de bord** (retour du 21/10) : encart « Mon abonnement » (salariés suivis / places prévues avec jauge, tarif mensuel, depuis le) et lien « Gérer ». | En place (21/10) — à recetter |
| **Onglet Documents harmonisé** (retour du 21/10) : plus d'option « Tous ». Une pastille par salarié (gestions en cours, puis « Terminées »), qui défile horizontalement sur téléphone ; le nombre de nouveaux documents figure sur la pastille. Sélection par défaut : le salarié qui a un nouveau document, sinon celui dont le dernier document est le plus récent. Sous les pastilles, une carte du salarié (emploi, depuis le…, nombre de documents, « Voir la gestion ») puis ses documents par catégorie. L'encadré « nouveaux documents » n'est plus répété sur cette page (pastilles « Nouveau » dans les listes). | En place (21/10) — à recetter |
| Tri par défaut : du plus récent au plus ancien (période, puis date de dépôt). | En place |
| L'abonné peut changer le tri dans le détail d'une gestion : plus récents, plus anciens, ordre alphabétique, par type (bulletins, contrats, avenants, soldes de tout compte…). Le tri choisi reste dans l'adresse de la page (il survit au rafraîchissement). | En place (19/10) |
| **Document nouvellement disponible mis en avant** : tant que l'abonné ne l'a pas téléchargé, un document apparaît **en haut** du tableau de bord et du détail de la gestion, dans un encadré « Un nouveau document est disponible », avec un **grand bouton de téléchargement** (« ⬇ Télécharger : Bulletin de salaire de [mois] »). Dans les listes, il porte une pastille « Nouveau ». Le premier téléchargement par l'abonné le fait passer en « consulté » : l'encadré et la pastille disparaissent. Un bulletin remplacé (corrigé) redevient « nouveau ». | En place (19/10, brique 7c) |
| Dans la carte « Déclaration du mois », quand le bulletin est établi, un grand bouton « ⬇ Télécharger le bulletin de [mois] » est affiché à côté de la demande de modification. | En place (19/10) |
| Côté administrateur, chaque document indique la date de premier téléchargement par l'abonné, ou un tiret rouge s'il ne l'a pas encore téléchargé (utile en cas de réclamation « je n'ai rien reçu »). Les téléchargements de l'administrateur ne comptent pas. | En place (19/10, présentation 20/10) |
| **Tableau de bord, « Mes gestions en cours »** : tableau Salarié / Emploi / Depuis le / Dernier bulletin (lien de téléchargement direct, pastille « Nouveau ») / Statut du mois en cours (« Déclarer [mois] », « Déclaration envoyée », « Correction en cours », « ✓ Disponible ») / bouton « Détail ». Un bulletin déjà en ligne pour le mois vaut « Disponible », même s'il a été déposé sans déclaration. | En place (20/10) |
| « Vos 5 derniers documents » : tableau Type / Période / Document / Salarié. | Retiré du tableau de bord le 21/10 |
| **Détail d'une gestion (abonné)** : documents répartis dans les mêmes **trois catégories** que côté administration, tableaux aux colonnes titrées Type / Période / Document / Mis en ligne le, et un bouton « ⬇ Télécharger » par ligne (pas de suppression côté abonné). Pastille « Nouveau » tant que le document n'a pas été téléchargé. 5 documents par catégorie puis dépliage. Le tri choisi (récents, anciens, alphabétique, par type) s'applique à l'intérieur de chaque catégorie. Sur téléphone : une fiche par document, lignes alternées. | En place (20/10) |
| **Lignes de titres colorées par catégorie**, inspirées de l'ancien espace client : violet (éléments contractuels), turquoise (bulletins de paie), orange (autres) ; texte blanc, nettement distinctes des lignes de documents alternées blanc / gris. Turquoise et orange sont plus foncés que sur l'ancien site pour que le texte blanc reste lisible (contraste ≥ 4,5:1). Un petit carré de la même couleur précède le nom de la catégorie (repère conservé sur téléphone, où les titres de colonnes sont remplacés par les intitulés dans chaque fiche). | En place (20/10) |
| Après un clic sur un bouton de téléchargement, le document **disparaît aussitôt** de l'encadré « nouveau document » (l'encadré disparaît avec le dernier) ; les pastilles « Nouveau » se mettent à jour d'elles-mêmes une à deux secondes plus tard, sans actualiser la page. | En place (20/10) |
| Le tableau de bord affiche **uniquement les 5 derniers documents** (« Vos 5 derniers documents »), tous salariés confondus, avec le nom du salarié ; la liste complète est dans le détail de chaque gestion. | En place |

### 5.4 bis Documents d'une gestion côté administrateur

| Règle | Statut |
|---|---|
| Liste des comptes : **toute la ligne** est cliquable (pas seulement le nom). | En place (20/10) |
| **Liste des comptes pour des milliers d'abonnés** (21/10) : une ligne par compte — Réf. client, Employeur (Prénom NOM, email, code postal et ville), Inscrit le, Abonnement (actif / résilié / aucun), Gestions (en cours / quota, à valider, brouillons, terminées), Salariés, Actions (bouton violet « N actions »). Recherche instantanée (nom, email, référence client ou de gestion, salarié, ville, téléphone ; sans tenir compte des accents ; plusieurs mots possibles). Tri en cliquant sur les titres de colonnes. Pagination par 200 (« Tout afficher » jusqu'à 1 000, retour du 21/10) ; tri, recherche et pagination faits par la base (vue `admin_comptes`) pour rester fluide. | En place (21/10, brique 2g) — à recetter |
| **Onglets** : *Clients actifs* (au moins une gestion en cours ou à valider, par défaut, comptes avec actions en tête) ; *À surveiller : abonnement sans gestion* (abonnement actif sans gestion en cours ni en attente — abonnement à suspendre ou rembourser ?), signalé par un bandeau jaune ; *Avec actions à effectuer* ; *Inactifs* (ni gestion ni abonnement actif) affichés seulement à la demande, en fin de barre. Le bandeau du haut donne la somme des actions de toutes les lignes. | En place (21/10) |
| **Navigation de l'administrateur** (21/10) : l'administrateur n'a plus les onglets d'un abonné (tableau de bord, documents, aide). Ses onglets : **Comptes** (liste des comptes, pastille du nombre d'actions à effectuer), **Abonnements** (suivi), **Archivés** (comptes inactifs), **Mon compte**. Mêmes onglets en bas de l'écran sur téléphone. Le logo et les pages abonné le ramènent à l'administration. | En place (21/10) — à recetter |
| **Recherche par colonne** (retour du 21/10) : la recherche générale est placée juste au-dessus du tableau ; sous la ligne de titres, un filtre par colonne : Réf. (texte), Employeur (nom, email, ville), Inscrit le (année), Abonnement (actif / résilié / aucun), Gestions (en cours, à valider, brouillon, sans gestion active), Salariés (texte), Actions (avec / sans). Les filtres se combinent, cherchent dans tous les comptes (y compris archivés) et s'effacent d'un clic. Ligne de titres violette en gras, texte blanc (comme les tableaux de l'abonné), aussi dans l'onglet Abonnements. | En place (21/10) — à recetter (relancer le script 2g) |
| **Comptes non confirmés à part** (retour du 21/10) : une inscription dont l'email n'a jamais été confirmé (lien non cliqué, adresse erronée) ne peut pas se connecter ; elle n'apparaît plus dans les comptes, mais dans Archivés > « Inscriptions non confirmées » (lien aussi à côté de « Comptes archivés »). Elle en sort dès que le lien est cliqué. La recherche générale les trouve quand même, avec la pastille « Email non confirmé » (aussi sur la fiche). Date de confirmation recopiée de Supabase Auth dans `profiles.email_confirme_le` par un trigger. À la migration (brique 13), les comptes importés seront créés « confirmés ». | En place (21/10, script 2g) — à recetter |
| **Liste sur une page** (retour du 21/10) : 200 lignes par page au lieu de 50, et bouton « Tout afficher » (jusqu'à 1 000 lignes, maximum renvoyé par Supabase en une requête). Le calcul est fait par la base dans tous les cas ; afficher 1 000 lignes d'un coup reste fluide (de l'ordre d'une seconde) mais alourdit la page sur téléphone : la recherche et les filtres par colonne restent le moyen le plus rapide de trouver un compte. | En place (21/10) — à recetter |
| **Colonnes et bouton Copier** (retour du 21/10) : colonne Réf. réduite, colonne Employeur élargie ; bouton « Copier » toujours visible et de largeur fixe à côté de l'email (« Copié » prend la même place : rien ne bouge). | En place (21/10) — à recetter |
| **Recherche et filtres dans l'onglet Abonnements** (retour du 21/10) : même barre de recherche au-dessus du tableau et même ligne de filtres sous les titres : Réf., Abonné, Depuis le (année), Tarif (liste déroulante des tarifs existants, retour du 21/10), Places (libres / complet / aucune utilisée), À vérifier (résiliation demandée, quota dépassé, payé sans gestion, rien), Paiement (hors site, à jour, refusé, impayé). Comme dans Comptes, une recherche porte sur tous les abonnements, actifs et résiliés. | En place (21/10, script 2g à relancer après 5a et 5b) — à recetter |
| **Email copiable** : au survol de l'adresse email d'un abonné (liste des comptes, onglet Abonnements, fiche), un bouton « Copier » la place dans le presse-papiers ; il est toujours visible sur téléphone. La mention « rôle : employeur » est retirée de la fiche (identique pour tous les comptes). | En place (21/10) |
| **Thème sombre de l'administration** (demande du 21/10, « comme initialement ») : fond #14232b, texte clair, couleurs de la charte éclaircies pour rester lisibles, logo sur une pastille blanche. L'espace abonné reste sur fond blanc. Chiffres clés de l'onglet Abonnements : titres en gras, liseré violet. | En place (21/10) — à recetter |
| **Relances par email standardisées** (21/10, brique 9c) : bouton « ✉ Relancer » en fin de ligne pour les comptes « abonnement sans gestion » (rappel d'ouvrir une gestion ou de demander la résiliation) et les inscrits sans abonnement ; sur la fiche du compte, cinq messages (abonnement sans gestion, gestion pas encore envoyée, déclaration du mois, inscrit sans abonnement, prélèvement refusé), ceux qui correspondent à la situation en violet. Une fenêtre affiche le destinataire et le texte exact avant l'envoi (« Oui, envoyer » / « Non, annuler ») et prévient si le même message a déjà été envoyé. Chaque envoi est enregistré (« relancé le … », historique sur la fiche). Textes modifiables dans `src/lib/relances.ts`. | En place (21/10) — à recetter |
| Colonne Employeur : email et **code postal seulement** (plus la ville). | En place (21/10) |
| **Vérifier la configuration** (onglet Abonnements) : contrôle sans paiement de la clé secrète Supabase, des identifiants Systempay (appel du service de test), du format de la clé publique, du secret de la tâche quotidienne, de l'adresse de notification et de la clé d'envoi des emails. En mode test, un échec de « Continuer vers le paiement » affiche aussi sa cause technique. | En place (21/10) |
| **Solder une demande** (21/10) : sur la fiche d'un compte, chaque demande en attente peut être close avec un **commentaire facultatif** transmis à l'abonné (notification, email et affichage dans sa gestion) : « Refuser la modification… » (le bulletin en ligne est maintenu), « Clore sans bulletin… » (déclaration du mois), « Clore sans avenant… » et « Marquer comme traitée sans document… » (avenant). | En place (21/10, brique 7d) — à recetter |
| **Onglet Abonnements** : chiffres clés (abonnements actifs, montant mensuel théorique, places utilisées / totales, nombre à vérifier) ; filtres Actifs / Quota dépassé / Sans gestion / Résiliés ; tableau Réf., Abonné, Depuis le, Tarif, Places, À vérifier, Paiement. Bloc **« Paiements à suivre »** (brique 5a) : échéances refusées (nombre de refus, prochain essai, code de la banque) et impayées, paiements à vérifier (double paiement, montant inattendu), cartes qui expirent d'ici la fin du mois suivant, bouton « Lancer le traitement maintenant ». Chiffre clé « Encaissé ce mois ». Colonne Paiement : Hors site / À jour (prochain prélèvement) / Refusé, nouvel essai / Impayé. **Tri** (23/10) : par défaut les abonnements les plus récents d'abord (Résiliés : dernières résiliations d'abord) ; clic sur Réf., Abonné, Depuis le, Tarif, Places ou Paiement pour trier, ▲▼ comme dans la liste des comptes. Suspension des comptes impayés : brique 6. | En place (21/10) — à recetter |
| **Onglet Archivés** : comptes sans gestion en cours ni en attente et sans abonnement actif, avec la même recherche et le même tri ; rien n'est supprimé. | En place (21/10) |
| **Homonymes** : référence client unique `C00001…` (administration seulement, aussi en tête de la fiche du compte) ; pastille « Homonyme ×N » quand plusieurs comptes portent le même prénom et nom ; email, ville et salariés affichés sur chaque ligne pour départager. | En place (21/10) |
| Fiche d'un compte : **une seule gestion dépliée à la fois** (« Détail : N document(s) · k déclaration(s) à traiter »), fond blanc et cadre violet ; les autres sont sur fond gris clair. À l'arrivée, la gestion visée par un lien « Déposer le bulletin » est dépliée, sinon la première qui attend une action. | En place (20/10) |
| **Actions attendues toujours visibles** : une gestion qui attend une action porte une pastille violette « 1 action à faire » dans son en-tête, même repliée. Les déclarations, les documents et la zone de dépôt sont regroupés dans le détail. | En place (20/10) |
| Documents répartis en **trois catégories** : *Éléments contractuels* (contrat, avenants, rupture conventionnelle, licenciement, et documents de fin de contrat : certificat de travail, solde de tout compte, attestation France Travail), *Bulletins de paie*, *Autres documents* (attestations de salaire ou sur l'honneur, courriers, divers). Une catégorie vide tient sur une ligne (« aucun document »). | En place (20/10) — rattachement des documents de fin de contrat à valider par Frédéric |
| Colonnes identiques dans les trois catégories, pour un alignement vertical : **Type / Période (MM/AAAA) / Titre (vu par l'abonné) / Téléchargé le**, puis la poubelle ; ligne de titres colorée par catégorie (voir § 5.4). Le titre est le nom affiché à l'abonné (le nom technique du fichier dans le stockage n'est pas utile ici). | En place (20/10) |
| Chaque catégorie affiche ses **5 documents les plus récents** ; un bouton « Afficher les N documents suivants » déplie la suite dans une zone d'environ 10 lignes qui défile à la molette, en-tête toujours visible ; « Réduire » replie. | En place (20/10) |

### 5.5 Dépôt d'un document par l'administrateur (fichier par fichier)

| Règle | Statut |
|---|---|
| Dans la fiche d'un compte, chaque gestion a une zone de dépôt : glisser un PDF ou cliquer pour le choisir. | En place |
| Dès que le PDF est choisi, le **type**, la **période** et le **titre** sont préremplis d'après le nom du fichier (ex. « LHOPITALLIERKOT BOBOLABPG225 - 05-2022.pdf » → Bulletin de salaire, 2205, « Bulletin de salaire 05/2022 »). L'admin vérifie et corrige si besoin avant de déposer. | En place (19/10) — version provisoire, remplacée par la convention de la brique 4 |
| Dépôt unitaire d'un fichier à la norme (§ 5.6) : mêmes contrôles qu'en masse. Si la référence du nom (AG00123) n'est pas celle de la gestion où le fichier est glissé, ou si les noms ne correspondent pas, avertissement « Ce fichier semble destiné à une autre gestion » avant tout envoi. | En place (22/10, brique 4) — à recetter |
| Les doublons sont refusés **avant** l'envoi du fichier (pas d'attente inutile pour un fichier qui sera refusé). | En place (19/10) |
| Le fichier part directement du navigateur vers le stockage, sans passer par le serveur du site (pas de limite de taille liée à Vercel). | En place |

### 5.6 Dépôt en masse avec rangement automatique (brique 4)

**Objectif (Frédéric, 19/10/2026)** : déposer en une seule fois des centaines de PDF aux noms structurés, qui sont rangés automatiquement dans la bonne gestion du bon abonné. Le nom du fichier ne doit laisser **aucun doute** possible sur sa destination.

**En place (22/10, script `brique4_depot_en_masse.sql`)** : onglet **Dépôt** de l'administration (`/admin/depot`). Glisser des PDF ou un dossier entier (sous-dossiers compris), ou « Choisir des fichiers / un dossier ». Le navigateur lit chaque nom et calcule son empreinte (SHA-256) ; le serveur retrouve les gestions par leur référence et les documents déjà en ligne. Récapitulatif : prêts, à décider (noms à vérifier → « Confirmer quand même » ; document existant → « Remplacer » / « Ignorer », avec « Tout remplacer » / « Tout ignorer »), non déposables (nom non reconnu, référence inconnue, gestion pas encore validée, deux fichiers du lot pour le même document), déjà en ligne à l'identique (ignorés par défaut). « Déposer N fichiers » : 3 envois à la fois, barre de progression, état par fichier, échecs remis dans la liste d'un clic. Option « Prévenir les abonnés à la fin » (cochée par défaut) : une notification et un email par abonné, qui récapitulent tous ses documents, au lieu d'un message par fichier. Remplacement : trace dans `documents_remplacements`, affichée sous le document côté admin (« Remplacé le …, ancienne version du …, téléchargée le … / jamais téléchargée »). Le dépôt unitaire de la fiche d'un compte applique les mêmes règles : type, période et précision repris d'un nom normé, avertissement si la référence ou les noms ne correspondent pas, confirmation avant tout remplacement (la case « Remplacer le bulletin » disparaît).

**Exigences**

1. Un fichier n'est jamais rangé « au plus probable » : soit sa destination est certaine, soit il est mis de côté pour décision manuelle.
2. Avant tout envoi, un écran récapitulatif liste chaque fichier avec sa destination reconnue (abonné, salarié, type, période) et son état : prêt, conflit (un bulletin existe déjà pour ce mois), non reconnu. L'admin valide l'ensemble en un clic.
3. Les envois se font en parallèle avec une barre de progression ; un échec sur un fichier n'interrompt pas les autres, et le récapitulatif final liste les échecs à reprendre.
4. Les règles anti-doublons (5.2) s'appliquent exactement comme au dépôt unitaire.

**Convention de nommage — validée sur le principe le 19/10/2026, complétée le 21/10** (Frédéric peut adapter son logiciel de paie pour produire les noms choisis)

Les noms et prénoms ne suffisent pas à garantir l'absence de doute : homonymes, accents, noms composés, changement de nom après mariage, plusieurs gestions entre les mêmes personnes au fil des années. Chaque gestion a donc une **référence unique et définitive** (`AG00001`, `AG00002`…), attribuée automatiquement, impossible à modifier — **En place** (script `brique2f`). **Elle reste une référence d'administration** : affichée dans l'espace Administration uniquement, jamais dans l'espace de l'abonné (décision de Frédéric, 19/10).

**Norme de Frédéric, validée le 21/10** (remplace `<référence>_<code type>_<AAMM>`) — décisions : nom de famille seul, sans prénom ; AAMM obligatoire pour tout fichier ; complément facultatif (courriers notamment) ; code BP pour les bulletins ; document remplacé = ancien fichier supprimé, trace gardée côté admin. Tout nouveau document suit cette norme.

`<Réf gestion>_<Nom employeur>_<Nom salarié>_<Code type>_<AAMM>[_<complément>].pdf`

Exemple : `AG00123_DUPONT_MARTIN_BP_2605.pdf` → gestion AG00123, employeur Dupont, salariée Martin, bulletin de paie, mai 2026.

| Élément | Règle |
|---|---|
| Séparateur | Le tiret bas `_` sépare les éléments ; il est **interdit à l'intérieur** d'un élément. Espaces, tirets et apostrophes sont admis dans les noms (`DE LA FONTAINE`, `MARTIN-DIOP`, `N'DIAYE`). |
| Réf gestion | `AG` + 5 chiffres. **Seule clé de rangement.** |
| Nom employeur, nom salarié | Nom de famille seul, **sans prénom** (décision du 21/10). Majuscules sans accents recommandées (le site tolère accents et minuscules). **Contrôle de cohérence** : comparés, sans tenir compte des accents, majuscules, espaces et tirets, aux noms de la gestion AG00123. S'ils ne correspondent pas, le fichier n'est pas rangé : « à vérifier » (protège d'une faute de frappe dans la référence, ex. AG00132 au lieu de AG00123). Un clic « Confirmer quand même » (ex. nom d'usage différent) range le fichier. |
| Code type | Un code du tableau 5.1 (BP, CTRA, AV, CT, STC, FT, AS, ATTHON, LIC, RUPT, LET). Inconnu → « non reconnu ». |
| AAMM | **Obligatoire pour tous les types** : mois de paie pour un bulletin, mois du document pour les autres (signature du contrat, date d'effet de l'avenant, fin de contrat…). Mois de 01 à 12. |
| Complément (facultatif) | Précise un document qui n'est pas unique dans le mois : `_DEMISSION`, `_ATTESTATION EMPLOI`, `_2`. Il devient le titre affiché pour les courriers (LET) et départage deux documents du même type et du même mois. |

Ce que voit l'abonné : le **titre** affiché reste lisible (« Bulletin de salaire 05/2026 », « Courrier — Démission 05/2026 ») ; le **fichier téléchargé** porte le nom déposé sans la référence : `DUPONT_MARTIN_BP_2605.pdf` (§ 5.3).

Lecture du nom par le site : premier élément = référence ; puis, depuis la fin, le complément éventuel, l'AAMM et le code type ; les deux éléments restants = employeur et salarié. Un nom qui ne suit pas exactement ce schéma (élément manquant, `_` en trop, date invalide) est « non reconnu », jamais deviné.

**Ancienne version d'un document remplacé (décision du 21/10)** : l'ancien fichier est supprimé du stockage ; une ligne de trace est gardée côté admin (date du remplacement, nom de l'ancien fichier, date de téléchargement de l'ancienne version par l'abonné, ou « jamais téléchargée »).

**Questions ouvertes pour Frédéric**

- ~~Le logiciel de paie peut-il produire ces noms ?~~ Oui (Frédéric, 19/10). Il faudra y reporter la référence de chaque gestion : l'admin proposera une liste exportable des références.
- Validation des codes proposés pour les types qui n'en ont pas encore (CTRA, AV, LIC, RUPT, LET).
- ~~Norme du 21/10 : format des noms, AAMM pour tous les types, sort de l'ancienne version~~ Tranché le 21/10 (voir ci-dessus).
- Pour la reprise des PDF existants (brique 13), qui n'ont pas de référence : voir § 5.6 bis.

### 5.6 bis Reprise des PDF de l'ancien site (brique 13)

**Besoin (Frédéric, 21/10)** : environ 300 gestions à reprendre. Les PDF actuels n'ont pas de référence de gestion, mais leur nom contient toujours le nom de l'employeur, du salarié et le type. Mélange de glisser-déposer et de confirmation manuelle quand le site a un doute.

**Périmètre (décision du 21/10)** : dossiers des gestions **en cours** et des gestions **terminées depuis moins de 3 ans**. Types ajoutés pour la reprise : attestation employeur (AE) ; « Informations … licenciement » → procédure de licenciement (LIC) ; Cerfa et informations de rupture conventionnelle → RUPT ; APE → attestation France Travail. Les autres fichiers non typés (MP, attestations Pajemploi, semainiers…) seront typés plus tard si besoin.

**Préalable** : les comptes et les gestions existent déjà dans la nouvelle base (reprise des abonnés, brique 13), avec les noms de l'employeur et du salarié et les dates de début et de fin de chaque gestion. Plan Supabase Pro et sauvegarde des fichiers en place (vrais documents, § 5.3).

**Atelier de reprise (page d'administration dédiée)**

1. **Glisser un dossier entier** (ou des centaines de PDF). Le navigateur lit chaque nom (type, période, noms) sans rien envoyer. Le nom du dossier d'origine est aussi utilisé s'il désigne le client.
2. **Rapprochement avec les gestions**, sans tenir compte des accents, majuscules, espaces et tirets, y compris pour des noms collés (`LHOPITALLIERKOT BOBOLABPG225`) :
   - **Certain** (vert) : une seule gestion dont le nom de l'employeur ET celui du salarié figurent dans le nom du fichier ;
   - **À départager** (jaune) : plusieurs gestions possibles (homonymes, ou plusieurs gestions successives entre les mêmes personnes). La **période** du document départage d'abord : la gestion dont les dates couvrent le mois du document. S'il reste un doute, liste courte des candidates, choix d'un clic ;
   - **Non reconnu** (rouge) : champ de recherche (nom, référence AG, ville) pour désigner la gestion à la main.
3. **Apprentissage** : une confirmation manuelle vaut pour tous les fichiers qui portent la même « signature » de noms (ex. `LHOPITALLIERKOT BOBOLA` → AG00123). Avec 300 gestions, au plus 300 confirmations, en pratique beaucoup moins. Les correspondances confirmées sont mémorisées d'une séance à l'autre.
4. **Récapitulatif par gestion** avant tout envoi : documents reconnus, type et période lus, conflits (deux bulletins pour le même mois), période illisible à saisir. Correction possible ligne par ligne.
5. **Envoi** : « Ranger N fichiers », en parallèle, barre de progression ; un échec n'arrête pas les autres ; liste finale des échecs à reprendre. La reprise peut se faire en plusieurs fois (par client, par année) : un fichier déjà repris (contenu identique) est reconnu et ignoré.
6. **Nom des fichiers repris** : chaque document reçoit le nom de la nouvelle norme (`AG00123_DUPONT_MARTIN_BP_2205.pdf`) ; l'abonné le télécharge sans la référence (`DUPONT_MARTIN_BP_2205.pdf`). Le nom d'origine est gardé dans la trace côté admin.
7. **Discrétion** : les documents repris ne déclenchent **ni notification ni email**, et n'apparaissent pas comme « Nouveau » (l'abonné les a déjà eus sur l'ancien site).
8. **Fin de reprise** : export de la liste des gestions avec leur référence AG, nom de l'employeur et du salarié, à reporter dans le logiciel de paie pour les nouveaux noms de fichiers.

**Constats sur le dossier actuel (lecture des noms seulement, 21/10 ; exemples ci-dessous inventés)**

- **Organisation** : un dossier par employeur (environ 600, anciens clients compris), puis le plus souvent **un sous-dossier par salarié** : `DUPONT/MARTIN/…`. Quelques anciens dossiers ont des fichiers directement à la racine de l'employeur, avec des sous-dossiers pour d'autres salariés. Quelques dossiers d'employeurs ne diffèrent que par un accent ou un prénom (`PEREZ` / `PÉREZ`, `LEFRANCOIS` / `Lefrançois`, `DUPONT` / `DUPONT Paul`) : doublons ou clients distincts, à confirmer à la main.
- **Bulletins** : `DUPONTMARTINBPG249.pdf`, `DUPONT MARTIN BPG2604.pdf`, anciens `DUPONTMARTINBP1610.pdf`. Noms collés ou séparés par une espace ; codes BP (anciens) puis BPG ; période **AAM** (mois sans zéro : `249` = 09/2024) ou **AAMM** (`2604` = 04/2026). Lecture sans ambiguïté : l'année fait toujours 2 chiffres, le reste est le mois.
- **Fin de contrat** : `…CT247.pdf`, `…STC2604.pdf`, `…CT.pdf` (sans période), `…APE.pdf` (attestation Pôle emploi = France Travail), `… FT.pdf` ; parfois sans noms (`CT216.pdf`), le dossier donnant alors la destination.
- **Autres documents** : `Contrat DUPONT MARTIN.pdf`, `Avenant 2 DUPONT MARTIN.pdf`, `Lettre démission DUPONT MARTIN.pdf`, `Informations … licenciement DUPONT MARTIN.pdf`, `…-CERFA signé.pdf`, `AE2203 DUPONT MARTIN.pdf`, `MP DUPONT MARTIN.pdf`, attestations Pajemploi, semainiers.
- **Fichiers de travail mêlés aux documents** : .docx, .xlsm (« Gestion … », « Docs Légaux … », « Paie … »), brouillons, autorisations de prélèvement : jamais repris (filtre automatique : PDF seulement, liste d'exclusions).
- **Même bulletin en double** (deux orthographes du nom pour le même mois, ex. après une correction) : le plus récent est proposé, l'autre signalé.
- **Volume** : de quelques fichiers à environ 60 par gestion, 20 à 400 Ko chacun : de l'ordre de 3 à 5 Go pour 300 gestions. **Plan Supabase Pro obligatoire** (le plan gratuit est limité à 1 Go).

**Conséquences sur l'atelier** : la **destination vient d'abord des dossiers** (dossier employeur → compte, sous-dossier salarié → gestion), le nom du fichier sert de contrôle et donne le type et la période. On glisse un dossier d'employeur (ou plusieurs, ou tout `Contrats clients`) : chaque couple dossier employeur / sous-dossier salarié est rapproché une fois des gestions (automatiquement si un seul candidat, sinon un clic), puis tous ses fichiers suivent. Pour un document sans période (contrat, `CT.pdf`), la date du fichier est proposée comme AAMM, modifiable. Le dossier étant sur Dropbox, les fichiers « en ligne uniquement » seront téléchargés par Dropbox au moment de l'envoi (plus lent, sans autre conséquence).

**Correspondance des types (proposition, à valider)** : BP, BPG → bulletin ; CT → certificat de travail ; STC → solde de tout compte ; APE, FT → attestation France Travail ; « Contrat » → contrat ; « Avenant n » → avenant (complément n) ; « Lettre démission » → courrier (complément DEMISSION) ; « … licenciement » → courrier de licenciement ; CERFA → rupture conventionnelle ; AE → ? ; MP → ? ; attestations Pajemploi, semainiers → ? (reprendre en « Autre » ou ignorer).

### 5.7 Copie des notifications par email (brique 9b)

| Règle | Statut |
|---|---|
| À chaque nouveau document (ou bulletin corrigé) et à chaque étape d'une gestion (validée, à compléter), l'abonné reçoit, en plus de la notification sur ses appareils, un **email** : type et mois du document, nom du salarié, bouton vers son espace. **Jamais de pièce jointe ni de montant** : le document se télécharge depuis l'espace sécurisé. | En place (20/10) — à recetter |
| Lien d'un email ouvert avec un autre compte : l'administrateur est conduit à la fiche du compte concerné ; un abonné voit « Ce lien concerne un autre compte » avec un bouton pour se reconnecter (puis retour à la bonne page). Page « introuvable » en français. Bouton des emails compatible Outlook. | En place (20/10, après recette 9b.3) |
| Activé par défaut, désactivable dans « Mon compte » (case « Emails », enregistrée immédiatement). | En place (20/10) |
| Envoi par l'API Brevo, expéditeur `contact@aideetgarde.fr` (déjà vérifié, domaine authentifié). Un email qui ne part pas ne bloque jamais l'action ; l'administrateur voit le bilan (« email envoyé à … » ou la raison). Variables Vercel : `BREVO_API_KEY` (Secret), facultatives `EMAIL_EXPEDITEUR`, `EMAIL_ADMIN`. | En place (20/10) |

### 5.8 Notifications : aide à la réactivation

| Règle | Statut |
|---|---|
| Dans « Mon compte », un encadré « Notifications bloquées ou jamais reçues ? Comment les réautoriser » donne les étapes **propres au navigateur et à l'appareil utilisés** (iPhone application installée ou Safari, Android application installée, Chrome, Edge, Samsung Internet, Firefox, Safari sur Mac, Chrome/Edge/Firefox sur ordinateur), plus le réglage du système à vérifier (Windows, macOS, Android). Il est ouvert d'office quand les notifications sont bloquées. Un bouton « J'ai modifié le réglage : vérifier » recharge la page. | En place (20/10) |
| Détection : lecture de l'identifiant du navigateur (« user agent ») **dans le navigateur uniquement**, sans rien enregistrer ni transmettre au serveur ; il s'agit d'adapter l'affichage au service demandé, pas d'un traceur, donc pas de consentement à recueillir. À mentionner en une ligne dans la politique de confidentialité par transparence. | En place (20/10) |

## 6. Déclaration mensuelle et version mobile

### 6.1 Déclaration du mois par l'abonné

| Règle | Statut |
|---|---|
| Pour chaque gestion en cours, l'abonné déclare un mois (mois en cours ou les deux précédents ; par défaut, le mois précédent jusqu'au 10, puis le mois en cours) : heures travaillées (facultatif) et commentaire libre (absences, congés, heures en plus…). | En place (19/10) |
| L'envoi signale au back-office que le bulletin peut être établi. Le bouton le dit explicitement : « Envoyer : le bulletin peut être établi ». | En place |
| L'abonné peut corriger sa déclaration tant que le bulletin n'est pas en ligne ; ensuite elle est verrouillée. | En place |
| Réponse d'Aide & Garde visible par l'abonné : « Déclaration close » (pas de bulletin ce mois-là) ou « Réponse à votre demande de modification : le bulletin est maintenu », avec le commentaire éventuel ; même principe pour une demande d'avenant close (affichée 60 jours). | En place (21/10, brique 7d) |
| **Lisibilité de l'espace abonné** (retour du 21/10) : boutons de la carte « Déclarer le mois » ramenés à la taille courante ; bandeau des nouveaux documents compact (bandeau jaune de titre, une ligne par document avec son bouton) ; carte « Mon abonnement » avec bandeau turquoise, statut en pastille, trois chiffres clés (salariés suivis avec jauge, tarif, date de début) et bouton « Gérer mon abonnement » ; tableau des gestions en cours avec titres turquoise. | En place (21/10) — à recetter |
| **Gestions en cours sur téléphone** : tableau en colonnes (Salarié avec l'emploi en dessous, Bulletin, Mois en cours), intitulés affichés une seule fois en tête ; l'emploi, la date de début et le bouton « Détail » ne sont affichés en colonnes que sur ordinateur (le nom ouvre la gestion). | En place (21/10) — à recetter |
| **Œil sur les mots de passe** (connexion, inscription, nouveau mot de passe) : afficher ou masquer ce qui est saisi. | En place (21/10) |
| **Onglet « Abonnement »** pour l'abonné (en-tête sur ordinateur et barre d'onglets du téléphone, qui passe à 5 onglets : Accueil, Documents, Abonnement, Aide, Compte). | En place (21/10) |
| **Barre d'onglets du téléphone** : fond violet bordé de jaune, bien distincte du contenu ; rubrique en cours sur pastille blanche. | En place (21/10) — à recetter |
| Dépôt du bulletin du mois par l'admin → la déclaration passe automatiquement à « traitée » et l'abonné voit « Bulletin de … établi ». | En place |
| Impossible de déclarer un mois dont le bulletin est déjà en ligne, ou pour une gestion terminée. | En place |
| Tableau de bord : pour chaque gestion en cours, l'état du mois (« Déclarer octobre 2026 » / « déclaration envoyée » / « bulletin établi »). | En place |
| Espace admin : liste « Déclarations à traiter », de la plus ancienne à la plus récente. Chaque ligne a un bouton **« Déposer le bulletin »** qui mène **directement à la zone de dépôt de la bonne gestion** (gestion mise en évidence, bloc documents ouvert). | En place (20/10) |
| Dans la zone de dépôt, **pré-renseignés et modifiables** : type « Bulletin de salaire », mois de la déclaration (ex. 2610 pour octobre 2026), titre « Nom Prénom de l'employeur – Nom Prénom du salarié ». Le nom du fichier déposé ne remplace pas ces valeurs ; il complète seulement ce qui est vide. Sans déclaration en attente, le mois et le type sont déduits du nom du fichier quand c'est possible. | En place (20/10) |
| Toute gestion avec une déclaration en attente est encadrée en violet dans la fiche du compte. | En place (20/10) |
| **Demande de modification d'un bulletin** : quand le bulletin d'un mois est en ligne, l'abonné peut cliquer sur « Demander une modification du bulletin » et indiquer ce qui doit être corrigé (obligatoire). La demande revient dans « Déclarations à traiter » côté admin, avec le motif, et un bouton « Déposer le bulletin corrigé ». | En place (20/10) |
| Dépôt d'un bulletin corrigé : case « Remplacer le bulletin déjà en ligne pour ce mois » (cochée d'office quand une modification est demandée). L'ancien fichier est supprimé, la fiche du document est mise à jour, l'abonné reçoit « Bulletin corrigé disponible ». La règle « un seul bulletin par mois » est respectée. | En place (20/10) |
| Si l'admin supprime le bulletin d'un mois, la déclaration de ce mois redevient « à traiter » (corrige l'affichage « bulletin établi » sans bulletin en ligne constaté le 20/10). | En place (20/10) |
| Contenu complet de la déclaration (heures majorées, absences, congés, frais…) — à définir avec Frédéric. | À trancher (brique 7) |
| Email à l'administrateur à chaque nouvelle déclaration ; email à l'abonné à chaque bulletin mis en ligne. | À faire |

### 6.2 Version mobile

**Navigation sur téléphone (20/10)** : barre de 4 onglets fixée en bas de l'écran, pour une personne connectée — Accueil (tableau de bord), Documents (tous les documents, par salarié et par catégorie, filtre par salarié), Aide (téléphone et email ; « Admin » à la place pour l'administrateur), Compte (coordonnées, notifications, déconnexion). Rubrique en cours en violet ; la barre respecte la zone du geste d'accueil de l'iPhone. Elle remplace le menu « ☰ ». Sur ordinateur, les mêmes rubriques sont dans l'en-tête ; le menu latéral gauche est reporté au moment où l'espace comptera assez de rubriques (4 à 6).

**Documents sur téléphone** : chaque document tient sur deux lignes (type et période, puis titre), avec un bouton rond de téléchargement à droite (40 px, facile à toucher) et des lignes alternées blanc / gris.


| Règle | Statut |
|---|---|
| Un seul site pour l'ordinateur et le téléphone : mêmes comptes, mêmes données, en temps réel. | En place |
| Installable sur l'écran d'accueil (Android : menu du navigateur « Installer l'application » ; iPhone : Partager → « Sur l'écran d'accueil »), ouverture plein écran sur le tableau de bord. | En place (19/10) |
| Menu adapté au téléphone (bouton « Menu », grands liens faciles à toucher). | En place |
| Formulaires pensés pour le doigt : grands champs, clavier numérique pour les heures, bouton pleine largeur. | En place (déclaration) ; à généraliser |
| **Notification à la mise en ligne d'un document** : dès qu'un PDF est déposé pour un abonné, chacun de ses appareils où les notifications sont activées reçoit « Nouveau document disponible — Bulletin de salaire d'octobre 2026 ». Un toucher ouvre la gestion concernée. Le message ne contient ni nom ni montant (il peut s'afficher sur un écran verrouillé) ; il est chiffré de bout en bout. | En place (19/10) |
| L'abonné peut **refuser** : bouton « Non merci » sur la carte du tableau de bord (choix mémorisé sur l'appareil) ; les notifications restent activables plus tard depuis « Mon compte ». | En place (20/10) |
| Activation par l'abonné, appareil par appareil : carte « Notifications » sur le tableau de bord (tant qu'elles ne sont pas activées) et dans « Mon compte » (activer / désactiver). Sur iPhone, il faut d'abord installer l'espace sur l'écran d'accueil (iOS 16.4 minimum) : la carte l'explique. | En place (19/10) |
| Un appareil partagé n'est rattaché qu'au dernier compte qui y a activé les notifications. | En place |
| Doublure par email de chaque mise en ligne (pour les abonnés sans notifications ou sur iPhone non installé). | À faire — l'email reste le canal fiable |
| Fonctionnement hors connexion. | À faire (brique 9) |

## 6 bis. Centre d'aide (FAQ) — arborescence validée le 21/10

**Besoin (Frédéric, 21/10)** : une arborescence d'aides et d'informations (secteur, site, bulletins et autres documents émis), dans un onglet à part, avec le simulateur de coût. Base : présentation « site aide et garde » (61 diapositives).

**Emplacement** : l'onglet **Aide** existant devient le centre d'aide (pas de 6e onglet : 5 au plus sur téléphone). Contact (téléphone, email) en bas de chaque page.

**Arborescence proposée** (thèmes de la présentation, regroupés en 3 portes d'entrée)

| Porte d'entrée | Thème | Questions (une par page ou par bloc dépliable) |
|---|---|---|
| Comprendre mes documents | Le bulletin de paie | Les heures (mensualisées, effectives, déclarées à l'Urssaf, taux horaire reconstitué) · L'écart de salaire (exonération des heures supplémentaires) · Les congés payés sur le bulletin (acquis, pris, solde) |
| | Les documents de fin de contrat | Certificat de travail, solde de tout compte, attestation France Travail : à quoi ils servent, quoi faire signer |
| Employer un salarié à domicile | Le contrat | Le CDD · La situation irrégulière · Le repas · L'enfant supplémentaire (garde partagée) · La période d'essai (calcul, rupture, délai de prévenance) |
| | Les aides de la CAF | Obtenir le CMG · Comment fonctionnent déclaration, prélèvement Urssaf et crédit d'impôt · Les montants du CMG · Les chèques préfinancés · Pajemploi+ |
| | La fin du contrat | Licenciement (3 étapes, exemples de délais) · Démission · Rupture conventionnelle (5 étapes) · Justifier la rupture (motif économique, personnel) · Indemnités (congés payés, licenciement, rupture conventionnelle) · Documents à fournir · Préavis (licenciement, démission, rupture conventionnelle) |
| | L'arrêt de travail | Indemnités (sécurité sociale, IRCEM) · Accident du travail · Arrêt maladie · Congé maternité · Congés payés pendant un arrêt |
| | Les congés | Les 10 % inclus · Le repos hebdomadaire · Les jours pris au-delà de ce qui est acquis · Quand prendre ses congés |
| | Les jours fériés | Le 1er mai · Les autres jours fériés |
| | La santé du salarié | La visite d'information et de prévention · La complémentaire santé |
| Utiliser mon espace | Le site Aide & Garde (à rédiger) | Déclarer le mois · Télécharger un document · Ajouter un salarié · Les notifications · L'abonnement et la résiliation |
| Outils | Simulateur de coût | Coût mensuel et annuel avant et après aides (port du simulateur déjà codé) |

**Bonnes pratiques retenues**

- Une **recherche** en tête du centre d'aide (questions et mots clés, sans tenir compte des accents).
- Pages **courtes**, une question par page, réponse en une phrase puis le détail ; **exemples chiffrés** et **tableaux en texte** (délais de prévenance, préavis, indemnités) plutôt qu'en images, pour la lecture sur téléphone, l'accessibilité et le référencement.
- **Aide contextuelle** : liens depuis l'endroit où la question se pose (« Comprendre mon bulletin » à côté d'un bulletin, « Les heures » dans la déclaration du mois, « Documents de fin de contrat » sur un certificat de travail).
- Pages **publiques** (sauf « Utiliser mon espace » si on préfère) : elles servent aussi au référencement et aux réponses générées par IA (§ 8). Chaque page porte une date de mise à jour.
- Contenu rédigé dans le site (fichiers de contenu), modifiable sans toucher au code ; une version par loi en vigueur, revue chaque année (comme la table des valeurs légales datées).

**En place (21/10)** : `/aide` (recherche instantanée, trois portes d'entrée, outils, contact) et une page par thème (`/aide/<thème>`, questions dépliables avec réponse courte puis détail, adresse propre à chaque question, ouverte automatiquement depuis la recherche). Contenu dans `src/lib/aide/contenu.ts` (10 thèmes, 40 questions). Aide contextuelle : liens « Comprendre mon bulletin » et « Les documents de fin de contrat » au-dessus des catégories de documents de l'abonné. Tant que le contenu est en relecture (`EN_RELECTURE`), bandeau d'avertissement et pages non indexées. Liste de contrôle : `docs/centre-aide-relecture.md`. Simulateur affiché « Bientôt ».

**Texte de référence** (transmis par Frédéric le 22/10) : convention collective de la branche du secteur des particuliers employeurs et de l'emploi à domicile (IDCC 3239), https://www.legifrance.gouv.fr/conv_coll/id/KALIARTI000043941784/?idConteneur=KALICONT000044594539. Chaque réponse du centre d'aide qui en découle cite l'article (« Référence : … ») ; le pied de chaque page renvoie au texte sur Légifrance.

**Contenu à vérifier avant publication** (la présentation contient des règles qui ont changé) :

- **CMG** : réformé au 1er septembre 2025 (nouveau mode de calcul, extension de l'âge pour les familles monoparentales) ; les montants et âges de la présentation sont à reprendre.
- **Congés payés pendant un arrêt maladie** : la loi du 22 avril 2024 limite l'acquisition (4 semaines par an en cas de maladie non professionnelle) et le report (15 mois) ; la mention « sans limite de temps » est à corriger.
- Montants datés (taux horaires minimums 8,77 € / 9,67 €, 4,70 € par repas, plafond de 471 €), « Pôle emploi » devenu France Travail, une coquille « ???? Dépend du nouveau bulletin » (diapositive 37).
- **Simulateur** : un seul cas de référence vérifié contre l'Excel (`claude/Simulateur_cout_reprise.md`), 6 cas de test en attente, et règles CMG antérieures à la réforme 2025 à confirmer avant mise en ligne.

## 7. Hébergement et localisation des données

| Règle | Statut |
|---|---|
| Héberger autant que possible en France, à Paris, pour des raisons pratiques et légales. | Règle permanente |
| Base de données et fichiers PDF : Supabase, région Paris (`eu-west-3`, centre de données AWS en Île-de-France). | En place |
| Serveurs du site : Vercel, région Paris (`cdg1`). | En place (19/10) |
| Emails : Brevo (société française). | En place |
| Opérateur d'hébergement : rester sur Supabase + Vercel, à Paris (analyse dans `Hebergement_operateur_francais_analyse.md`). | Décidé (Frédéric, 19/10/2026) |
| **Droits d'accès écrits en clair** : chaque script SQL accorde lui-même les droits de chaque table (abonnés et administrateur), aucun accès pour les visiteurs non connectés. Conforme à la règle Supabase du 30/10/2026 (plus de droits automatiques sur les nouvelles tables). En cas de reconstruction de la base : exécuter `droits_api_explicites.sql` en dernier. Ne pas réactiver l'exposition automatique dans les réglages Supabase. | En place (21/10) |
| Les échanges avec les API Urssaf (Cesu, Pajemploi) partent du serveur du site à Paris, sont journalisés, et leurs identifiants d'accès restent des secrets serveur. | À faire (brique 0bis) |

## 8. Référencement (moteurs de recherche et réponses générées par IA)

**Objectif (Frédéric, 19/10/2026)** : que le site ressorte, et soit cité, quand un particulier employeur pose une question sur l'emploi d'un salarié à domicile — dans les résultats classiques comme dans les réponses rédigées par l'IA de Google ou par les assistants conversationnels. C'est une exigence de construction, pas une finition.

| Règle | Statut |
|---|---|
| Pages publiques « Conseils » qui répondent directement aux questions fréquentes (déclarer une garde d'enfants ou une aide à domicile, Cesu / Pajemploi, coût réel et crédit d'impôt, contrat, congés payés, rupture conventionnelle, licenciement, fin de contrat…) : réponse claire en tête de page, puis détail, date de mise à jour, auteur identifié, renvois vers les sources officielles. | À faire (brique 10, priorité relevée) |
| Le simulateur de coûts est la page de référence sur la question du coût. | À faire (brique 11) |
| Pages rapides et rendues côté serveur (le texte est lisible par les robots sans exécuter de JavaScript), adresses propres et stables, titres et descriptions travaillés, données structurées (organisation, service, FAQ, article), plan du site `sitemap.xml`. | Socle technique en place ; à appliquer à chaque page publique |
| Robots des moteurs et des IA autorisés sur les pages publiques, interdits sur les espaces privés (administration, tableau de bord, compte, documents). | Prêt (s'active avec l'indexation) |
| **Site de test non indexé** : tant que le site est sur son adresse provisoire, aucune page ne doit apparaître dans les moteurs (concurrence avec le vrai site, pages inachevées). L'indexation s'ouvre uniquement sur le domaine définitif (`NEXT_PUBLIC_INDEXATION=oui` dans Vercel). | En place (19/10) |
| Google Search Console et fiche Google Business Profile dès la bascule du domaine. | À faire |

## 9. Obligations légales du site (fiche service-public F37351, vérifiée le 22/10/2026)

Le site vend un abonnement en ligne à des particuliers : il doit respecter les règles de la vente à distance. Les informations d'Aide & Garde sont regroupées dans `src/lib/entreprise.ts` ; tant qu'une valeur n'est pas renseignée, elle s'affiche en jaune « [… à compléter] » sur les pages, pour ne jamais publier une information inventée. **Le site ne s'ouvre pas au public tant qu'il reste une mention à compléter.**

| Règle | Ce que fait le site | État |
|---|---|---|
| **Mentions légales** (jusqu'à 75 000 € / 375 000 € d'amende) | Page `/mentions-legales` : éditeur (dénomination, forme, capital, siège, immatriculation, TVA, téléphone, email), directeur de la publication, activité réglementée (déclaration ou agrément services à la personne et autorité), hébergeur (Vercel, serveurs à Paris), propriété intellectuelle. | En place (22/10) — identité à compléter |
| **Lien sur chaque page** | Pied de page sur toutes les pages : Mentions légales, Confidentialité et cookies, Conditions générales de vente, **« Résilier votre contrat »**, Contact. | En place (22/10) |
| **Confidentialité (RGPD)** | Page `/confidentialite` réécrite d'après ce que fait réellement le site : responsable, tableau données / finalités / bases légales, prestataires (Supabase, Vercel, Brevo, Systempay-BRED, Urssaf), stockage à Paris et garanties de transfert, durées, droits et CNIL, sécurité. **Durées de conservation** (proposition du 23/10, référentiel CNIL « gestion commerciale » et délais de prescription) : compte et données des salariés, documents de paie : pendant l'abonnement puis 5 ans (aussi la durée de conservation du double des bulletins par l'employeur) ; compte sans abonnement : 2 ans sans connexion, 3 mois si email jamais confirmé ; preuves (CGV, rétractation, résiliation) : 5 ans ; pièces comptables : 10 ans ; journaux : 12 mois ; email d'une personne recommandée : jamais conservé. **La suppression automatique à ces échéances reste à programmer** (tâche quotidienne, avec une liste à valider par l'administrateur avant effacement). | En place (23/10) — durées à valider, purge à programmer |
| **Cookies** | Sans configuration, uniquement des traceurs strictement nécessaires (session, mémoire du choix sur les notifications, paiement) : pas de bandeau. **Pixel Meta (Facebook) prêt mais inactif** : il s'active en renseignant `NEXT_PUBLIC_META_PIXEL_ID` dans Vercel. Il apparaît alors un bandeau « Cookies publicitaires » avec « Tout refuser » et « Tout accepter » de même poids, choix gardé 6 mois, modifiable par « Gérer les cookies » en pied de page ; le pixel n'est chargé qu'après accord et **jamais** dans les espaces privés ni sur connexion / inscription (aucune donnée de compte, de salarié ou de paie chez Meta). La politique de confidentialité s'adapte d'elle-même. L'ancien site déclarait Google Analytics : non repris. | En place (22/10) — activation à décider |
| **CGV** (obligatoires pour vendre à des particuliers) | Page `/cgv`, **limitée aux mentions obligatoires** (décision de Frédéric du 22/10) : mention mandataire en tête (« le consommateur est l'employeur… »), vendeur (identité, n° SAP, contact), objet du mandat (liste des missions), obligations de l'employeur (compte Urssaf, transmission, demande expresse), prix TTC et HT avec TVA et nature du prix (frais de mandat), paiement, durée et résiliation, rétractation (délai, modalités, remboursement au prorata), réclamations et médiateur, formulaire type de rétractation en annexe. Version datée (`VERSION_CGV`), à changer à chaque modification. | En place (22/10) |
| **Acceptation des CGV** | À la souscription, deux cases obligatoires (vérifiées aussi côté serveur) : « J'ai lu et j'accepte les CGV » et « Je demande que le service commence dès le paiement… ». La commande garde la preuve : version des CGV, date et heure, demande d'exécution immédiate. À l'inscription (création du compte, sans achat), la case renvoie aux CGV et à la politique de confidentialité. | En place (22/10, script 5d) — à recetter |
| **Résiliation en ligne** (depuis le 1er juin 2023) | Lien « Résilier votre contrat » en pied de page vers le bloc de résiliation de « Mon abonnement » (brique 5b), confirmation par email. | En place |
| **Rétractation en ligne : bouton « Renoncer au contrat ici »** (obligatoire depuis le 19 juin 2026, art. L221-21 ; jusqu'à 75 000 € d'amende) | Sur « Mon abonnement », pendant les 14 jours qui suivent une souscription en ligne : bloc « Droit de rétractation », bouton « Renoncer au contrat ici » qui ouvre un court formulaire (nom, prénom, email, contrat concerné) puis « **Confirmer la rétractation** ». Effet immédiat : abonnement résilié le jour même, échéances à venir annulées. **Accusé de réception** envoyé aussitôt par email (contenu de la demande, date et heure), alerte à Aide & Garde avec le montant à rembourser (montant payé moins les jours de service fournis, au prorata sur 30 jours). Le remboursement se fait depuis le Back Office Systempay, sous 14 jours ; la date est notée dans la table `retractations`. | En place (22/10, script 5d) — à recetter |
| **TVA** | Franchise en base (Frédéric, 23/10) : « TVA non applicable, article 293 B du CGI » à côté des prix et dans les mentions légales ; un seul prix affiché (pas de HT / TTC). Réglage `tauxTva` dans `src/lib/entreprise.ts` (mettre 20 si la société devient assujettie : les prix HT et TTC s'afficheront d'eux-mêmes). | En place (23/10) |
| **Suivi médical (SPSTN)** | Depuis le 2 janvier 2025, le suivi de santé au travail des salariés des particuliers employeurs est assuré par le SPSTN (adhésion par l'APNI via Cesu/Pajemploi, contact à l'embauche par l'employeur ou le salarié, une visite par type d'emploi). Encadré « Nouveau salarié : pensez à son suivi médical » sur le formulaire de création d'une gestion, avec lien vers la réponse détaillée du centre d'aide (réécrite d'après spstn.org le 23/10). | En place (23/10) |
| **Services à la personne : information du consommateur** (arrêté du 17 mars 2015 ; DGCCRF, « focus sur le mode mandataire ») | Pied de page de chaque page : organisme déclaré, n° SAP, mode mandataire, lien vers les activités. Mentions légales : déclaration (n° SAP 838154383, DREETS Île-de-France UD 75), liste des 12 activités déclarées en mode mandataire, mention obligatoire « le consommateur est l'employeur… », adhésion à la Charte nationale Qualité (logo transmis par NOVA). CGV : mention mandataire en tête. Sous chaque grille de prix (Découvrir, souscription) : **notes discrètes** (petit texte gris, sans encadré) avec la nature du prix et la TVA, le crédit d'impôt, la mention mandataire complète et la mention du devis gratuit (retirées puis remises le 23/10 sous cette forme allégée, à la demande de Frédéric). Textes dans `src/lib/entreprise.ts` et `src/components/MentionsPrix.tsx`. | En place (22/10) — taux de TVA à compléter |
| **Déclarations Urssaf pour le compte de l'abonné** (demande de Frédéric du 22/10) | CGV, article 7 : l'employeur ouvre lui-même son compte Pajemploi ou Cesu, transmet à Aide & Garde les informations nécessaires et lui **demande expressément** de déclarer ; sans cela, pas de déclaration possible et les déclarations restent à sa charge. À la souscription, 3e case obligatoire (« Je demande à Aide & Garde de déclarer pour mon compte… »), contrôlée par le serveur et gardée dans la commande (`mandat_declaration`). | En place (22/10, script 5d) — à recetter |
| **Logo « S ! services à la personne »** (Code du travail, R7232-19 : obligatoire sur tous les supports commerciaux d'un organisme déclaré ; règlement d'usage de la marque n° 4736023 et charte graphique NOVA) | Pied de page de chaque page : fichier d'origine fourni par NOVA (non retouché, non recompressé), 80 px de large (minimum 60), zone blanche de protection, cliquable vers servicesalapersonne.gouv.fr. | En place (22/10) |
| **Médiateur de la consommation** (obligatoire) | Nommé dans les CGV (article Réclamations). La plateforme européenne de règlement en ligne des litiges a fermé en 2025 : elle n'est plus citée. | À choisir et compléter |

**Identité renseignée le 22/10** d'après le Kbis du 04/03/2025, le récépissé SAP du 23/07/2018 et l'espace NOVA. **Reste à fournir par Frédéric** : médiateur choisi (nom et site ; Frédéric se renseigne), validation des durées de conservation proposées, confirmation que l'adhésion à la Charte nationale Qualité est toujours active (logo de l'année en cours), décision sur le pixel Meta.

## 4 bis. CDD de remplacement hors quota — 23/10/2026

| Élément | Règle | État |
|---|---|---|
| **Principe** (demande de Frédéric) | Une gestion ouverte pour remplacer un salarié en **congé maternité** ou en **arrêt maladie** s'ajoute à l'abonnement **sans en occuper une place**, donc sans surcoût, même quand l'abonnement est complet. | En place (script 3d) — à recetter |
| **Création par l'abonné** | Formulaire « Créer une gestion » : case « Ce salarié remplace un salarié absent (congé maternité ou arrêt maladie) », proposée s'il a au moins une gestion en cours ; puis salarié remplacé (liste de ses gestions en cours) et motif. Le contrat passe en CDD ; la date de fin devient facultative (fin au retour du salarié absent, terme imprécis). Le bandeau « abonnement complet » signale cette exception. | En place |
| **Garde-fous (base de données)** | Le salarié remplacé est une gestion en cours du même employeur, qui n'est pas elle-même un remplacement ; un seul remplacement à la fois par salarié absent ; un remplacement est obligatoirement un CDD. Les comptages de places (abonné, administration, souscription, vue des comptes) ignorent les remplacements. | En place, testé (base locale) |
| **Affichage** | Tableau de bord : « remplace Marie Durand (congé maternité) » sous l'emploi. Fiche du compte (admin) : pastille « CDD de remplacement de … (motif) · hors quota » ; l'email « gestion à valider » le précise. Centre d'aide : astuce dans « arrêt maladie » et « congé maternité ». | En place |
| **Depuis la gestion du salarié absent** (retour du 23/10) | Sur la page d'une gestion en cours (hors remplacement) : bouton « + Ajouter un salarié remplaçant », qui ouvre le formulaire titré « Ajouter un salarié remplaçant » avec la case cochée, le salarié remplacé, l'emploi et le CDD déjà remplis. Si un remplacement existe déjà : « Remplacement prévu : … » avec lien. Sur la page du remplaçant : « CDD de remplacement de … (motif), sans surcoût d'abonnement ». | En place (23/10) |
| **Fin** | Au retour du salarié absent, Aide & Garde termine la gestion de remplacement comme une autre. Si le salarié absent quitte son emploi, c'est à l'administrateur de juger (le remplaçant peut alors être réintégré dans le quota en ouvrant une gestion classique). | Règle de gestion |

## 8 bis. Page d'accueil et inscription — 23/10/2026

| Élément | Règle | État |
|---|---|---|
| **Page d'accueil** (`/`) | Reprend les arguments de l'ancien site (service RH de l'emploi à domicile, conseiller gratuit au téléphone, 3 étapes embauche / chaque mois / fin de contrat, 12,90 € par mois soit 6,45 € après crédit d'impôt, sans engagement, organisme déclaré) et ajoute ceux de la refonte (données hébergées en France, documents privés, notifications sur téléphone, résiliation en ligne). Structure : promesse + un seul appel à l'action « Commencer » (vers l'inscription), emplois gérés, comment ça marche, pourquoi Aide & Garde, prix (avec les mentions légales en notes discrètes), conseiller, 4 questions fréquentes, appel final. Illustration de l'espace sur téléphone (décorative, sans vraies données). | En place (23/10) — textes à relire |
| **Témoignages clients** (23/10) | Section « Ce que nos clients nous écrivent » entre les atouts et les prix : 6 extraits mis en avant, 13 autres derrière « Voir … autres témoignages ». Extraits de messages reçus (`src/lib/temoignages.ts`), texte d'origine (orthographe et ponctuation corrigées, « […] » pour les coupes), **initiales seulement**. Règles des avis en ligne (Code de la consommation, L111-7-2 et D111-17) : chaque témoignage porte la **date de l'échange** (mois et année, à compléter par Frédéric) ; mention sous la section : extraits publiés avec accord, sélection par Aide & Garde, pas de contrôle par un organisme extérieur, aucune contrepartie, du plus récent au plus ancien. **Sur le site public, seuls les témoignages dont l'accord est noté (`accord: true`) s'affichent** ; le site de test les montre tous avec le repère « accord à obtenir ». Lien « Voir nos avis sur Google » et, dans l'encart « Recommander », « Donner mon avis sur Google » (proposé à tous les abonnés, Google interdisant de ne solliciter que les clients satisfaits), affichés dès que les liens sont renseignés dans `src/lib/entreprise.ts`. Pas de données structurées « avis » : Google ne les affiche pas pour les avis publiés par l'entreprise sur son propre site. | En place — dates, accords et liens Google à fournir |
| **Note et avis Google** (23/10) | En tête de la section « Ce que nos clients en disent » : note moyenne, étoiles et nombre d'avis Google (lien vers la fiche), puis jusqu'à 5 avis Google tels que Google les fournit (étoiles, texte, nom et lien de l'auteur, ancienneté, « Lire sur Google », mention « Avis Google ») ; mention : sélection et ordre établis par Google. Les extraits de messages reçus suivent, sous le titre « Extraits de messages reçus ». Lecture par l'API Places (New) côté serveur (`src/lib/avis-google.ts`), réponse gardée 6 heures (environ 4 appels par jour). Variables Vercel : `GOOGLE_PLACES_API_KEY` (Sensitive) et `GOOGLE_PLACE_ID` ; sans elles, le bloc ne s'affiche pas. | En place — clé et identifiant de fiche à créer |
| **Référencement** | Titre et description dédiés, adresse canonique, un seul H1 et des H2 par section, données structurées schema.org (organisme, service et prix, questions fréquentes), `metadataBase` sur le domaine définitif (ou `NEXT_PUBLIC_SITE_URL`). Indexation toujours bloquée tant que `NEXT_PUBLIC_INDEXATION` ≠ « oui ». | En place |
| **Recommandations** | Les emails de recommandation mènent à `/?source=recommandation` (bandeau de bienvenue) ; l'ancienne page `/decouvrir` redirige vers l'accueil. | En place |
| **Inscription plus rapide** | Un seul champ mot de passe (avec l'œil pour vérifier la saisie ; la confirmation est supprimée, bonne pratique actuelle), aide « 8 caractères au moins », colonne « Dans 2 minutes, votre espace est prêt » (4 bénéfices) ; après envoi, écran « Vérifiez votre boîte mail » avec l'adresse utilisée, l'astuce des courriers indésirables et le numéro du conseiller. | En place (23/10) |
| **Téléphone : plus de zoom à la saisie** (retour du 23/10) | Sur iPhone, un champ en police de moins de 16 px faisait zoomer la page au toucher (connexion, inscription, Mon compte, recherche) et il fallait réajuster avec deux doigts. Tous les champs sont en 16 px sur téléphone ; le zoom volontaire reste possible. Aucune page ne dépasse la largeur de l'écran (contrôle automatique de 15 pages à 390 px). | En place (23/10) — à recetter sur iPhone |

## 9 bis. Recommandation (bouche à oreille) et page « Découvrir » — 23/10/2026

| Élément | Règle | État |
|---|---|---|
| **Recommander à un proche** | Encart « Satisfait d'Aide & Garde ? Recommander à un proche » en bas du tableau de bord et dans Mon compte (abonnés). Page `/recommander` : email du contact (obligatoire), son prénom (facultatif), message proposé **modifiable**, signé du nom de l'abonné, bouton « Revenir au message proposé ». | En place (23/10, script 5e) — à recetter |
| **Email envoyé** | Par Brevo, expéditeur « Prénom Nom via Aide & Garde », réponse directe à l'abonné (Reply-To), objet « Prénom Nom vous recommande Aide & Garde », « Bonjour {prénom}, », le message, bouton « Découvrir Aide & Garde » vers `/decouvrir?source=recommandation`, pied de message : qui l'a écrit, adresse non conservée. | En place |
| **Règles CNIL (« envoyer à un ami »)** | L'abonné est identifié comme l'auteur ; l'adresse du contact sert une seule fois et n'est enregistrée nulle part ; seule la date d'envoi est comptée (table `recommandations`, sans donnée du contact) pour limiter à 10 envois par 24 h et mesurer le bouche à oreille. **Pas de récompense** : un parrainage récompensé changerait le cadre juridique (à étudier avant de le proposer). | En place |
| **Page « Découvrir »** (`/decouvrir`) | Publique : « Employer à domicile, sans la paperasse », 4 étapes, ce qui est compris, prix (avec les mentions obligatoires), contact, boutons « Créer mon compte ». Bandeau d'accueil quand on arrive depuis une recommandation. Uniquement des arguments vrais à l'ouverture du site (Arguments_marketing.md). Peut devenir la page d'accueil. | En place (23/10) — texte à relire par Frédéric |
| **En-tête et bas de page fixes** (demande du 23/10) | L'en-tête avec les onglets reste en haut de l'écran pendant le défilement (ordinateur et téléphone). Sur ordinateur, une bande fine fixe en bas porte les liens légaux ; le logo « S ! services à la personne » et la mention mandataire restent en fin de page. Sur téléphone, la barre d'onglets du bas était déjà fixe. Les ancres (#section) s'arrêtent sous l'en-tête. | En place (23/10) — à recetter |
| **Avantages du salarié** (niveaux 1 et 2, voir `Avantages_salaries_ASC_Ircem.md`) | Thème du centre d'aide « Les avantages de votre salarié » : ce à quoi il a droit, ASC loisirs, Ircem, santé au travail. Fiche PDF d'une page « Vos droits et avantages » (`public/fiche-avantages-salarie.pdf`, régénérée par `outils/fiche-salarie/generer.py`), proposée sur la page de chaque gestion en cours, dans le centre d'aide et dans l'email de validation d'une gestion. Aucune donnée des salariés n'est utilisée : c'est l'employeur qui remet la fiche. Informations à revérifier chaque année. | En place (23/10) — textes à relire |
| **Mesure des visites envoyées aux partenaires** (brique 10, 23/10) | Tous les liens vers l'ASC loisirs, l'Ircem et le SPSTN (centre d'aide, encadré de création d'une gestion, liens et **QR codes** de la fiche PDF) et le téléchargement de la fiche passent par `/avantages/<partenaire>?depuis=<endroit>` : le clic est enregistré (partenaire, provenance, date, compte de l'abonné s'il est connecté ; ni IP ni cookie), puis la personne est redirigée. Non comptés : l'administrateur et les robots. Lien effacé du compte après 13 mois (tâche quotidienne), totaux conservés. **Administration > Partenaires** : visites, abonnés distincts, **part des abonnés** (abonnés distincts / abonnés actifs ; pour la fiche, fiches téléchargées / salariés suivis) et visiteurs non connectés sur 12 mois ; par mois avec la part entre parenthèses ; par provenance ; une phrase prête à copier pour chaque partenaire, pourcentage compris (demande du 23/10). Mentionné dans la politique de confidentialité. Les liens de la fiche visent le domaine définitif (https://www.aideetgarde.fr) : comptés une fois le nouveau site en ligne sur ce domaine. | En place (script 10) — à recetter |
| **Modifier les textes soi-même** | Guide `docs/modifier-les-textes.md` : fichier de chaque page et de chaque email, règles pour ne rien casser. | En place |

## 10. Historique de ce document

- 23/10/2026 — Brique 10 : liens suivis vers les partenaires (ASC, Ircem, SPSTN), QR codes sur la fiche, onglet Administration > Partenaires.
- 23/10/2026 — Note et avis Google sur l'accueil (API Places, côté serveur).
- 23/10/2026 — Témoignages clients sur l'accueil (initiales, accord et date obligatoires), liens vers les avis Google.
- 23/10/2026 — Page d'accueil (arguments, référencement, données structurées) ; inscription simplifiée ; zoom des champs sur téléphone corrigé ; bouton « Ajouter un salarié remplaçant » dans la gestion ; Abonnements (admin) : plus récents d'abord et tri par colonne ; barre de test Systempay masquée.
- 23/10/2026 — Mentions légales des prix remises en notes discrètes ; principe « simplicité avant tout » ; avantages du salarié : thème du centre d'aide et fiche PDF à remettre au salarié (niveaux 1 et 2).
- 23/10/2026 — Mention du devis gratuit et mot « Attention » retirés de l'affichage des prix (Frédéric) ; CDD de remplacement hors quota (script 3d, script 2g à relancer) ; suivi médical SPSTN (encadré à la création d'une gestion, réponse du centre d'aide réécrite).
- 23/10/2026 — TVA non applicable (franchise) ; durées de conservation proposées ; recommandation à un proche et page « Découvrir » (script 5e) ; en-tête fixe et bande légale fixe sur ordinateur ; guide de modification des textes ; pixel Meta laissé désactivé.
- 22/10/2026 — CGV réduites aux mentions obligatoires ; logo « S ! services à la personne » en pied de page ; point agrément levé (Aide & Garde n'a pas de salarié intervenant, Frédéric).
- 22/10/2026 — Identité légale renseignée (Kbis, récépissé SAP, NOVA) ; information du consommateur propre aux services à la personne (mode mandataire, activités déclarées, prix HT/TTC, devis, crédit d'impôt, Charte nationale Qualité) ; comptes Urssaf et mandat de déclaration (CGV art. 7, case à la souscription) ; bandeau cookies et pixel Meta activables.
- 22/10/2026 — Obligations légales (F37351) : mentions légales, confidentialité réécrite, CGV avec formulaire de rétractation, pied de page avec « Résilier votre contrat », acceptation des CGV et demande d'exécution immédiate à la souscription, bouton « Renoncer au contrat ici » avec accusé de réception (obligatoire depuis le 19/06/2026), script 5d.

- 22/10/2026 — Centre d'aide vérifié sur la convention collective IDCC 3239 (période d'essai, licenciement, préavis, indemnités, jours fériés : conformes ; repos hebdomadaire corrigé), références d'articles affichées.
- 22/10/2026 — Brique 4 : dépôt en masse (onglet Dépôt), lecture stricte de la norme, contrôle des noms, empreinte des fichiers, remplacement sur confirmation avec trace, notification groupée par abonné ; dépôt unitaire aligné.
- 21/10/2026 — Centre d'aide en place (10 thèmes, recherche, aide contextuelle, en relecture) ; onglet courant mis en valeur dans l'en-tête ; synthèse de l'abonnement remise au tableau de bord ; lien de retour retiré de la page Abonnement ; filtre Tarif en liste déroulante.
- 21/10/2026 — Types AE / LIC / RUPT, précision au lieu du titre libre, lignes de documents sans répétition des noms, nom du fichier téléchargé normé, tableau de bord simplifié, onglet Documents par pastilles, périmètre de la reprise (en cours + terminées < 3 ans), proposition de centre d'aide (§ 6 bis).
- 21/10/2026 — Reprise des PDF : constats sur l'organisation actuelle (dossiers employeur / salarié, codes, périodes AAM), destination par les dossiers, correspondance des types à valider.
- 21/10/2026 — Norme de nommage validée (sans prénom, AAMM pour tout fichier, complément facultatif, code BP, remplacement avec trace) ; atelier de reprise des PDF de l'ancien site (§ 5.6 bis).
- 21/10/2026 — Norme de nommage des PDF déposés en masse (référence, employeur, salarié, type, AAMM), nom du fichier téléchargé sans la référence, remplacement proposé au lieu d'un refus : propositions à valider (§ 5.2, 5.3, 5.5, 5.6).
- 21/10/2026 — Comptes non confirmés rangés à part, liste sur une page (200 / tout), bouton Copier fixe, recherche et filtres dans l'onglet Abonnements, bandeau de résiliation de l'administrateur conforme à « le mois reste dû ».
- 21/10/2026 — Brique 5b : résiliation par l'abonné (fin du mois civil, annulable), onglet Abonnement.
- 21/10/2026 — Relances par email standardisées (9c), vérification de la configuration du paiement, gestions en colonnes sur téléphone, œil sur les mots de passe, code postal seul dans la liste.
- 21/10/2026 — Retours ergonomie : recherche par colonne, titres violets, email copiable, thème sombre de l'administration, demandes soldées avec commentaire (7d), barre d'onglets du téléphone colorée, tableau de bord de l'abonné plus lisible.
- 21/10/2026 — Décisions de Frédéric : prélèvement à la date anniversaire, résiliation en fin de mois civil, prélèvements déclenchés par le site validés, grille provisoire validée pour la recette.
- 21/10/2026 — Droits d'accès explicites (changement Supabase du 30/10), § 7.
- 21/10/2026 — Brique 5a : souscription et paiement en ligne (mode test), prélèvements mensuels déclenchés par le site, refus et régularisation, suivi des paiements dans l'administration (§ 3, § 3.1).
- 21/10/2026 — Navigation propre à l'administrateur : onglets Comptes, Abonnements, Archivés.
- 21/10/2026 — Liste des comptes de l'administration pour des milliers d'abonnés (recherche, tri, onglets, homonymes, comptes à surveiller).
- 20/10/2026 — Brique 3c : messages explicites à l'envoi d'une gestion (champs manquants, quota), brouillon sans nom.
- 20/10/2026 — Brique 3b : quota fiable, demandes d'avenant, actions à effectuer (admin), liens d'emails ouverts avec un autre compte, page 404 en français.
- 20/10/2026 — Brique 3 (création de gestion par l'abonné, cycle brouillon → envoyée → en cours → terminée, validation par l'administrateur) et brique 9b (copie des notifications par email).
- 20/10/2026 — Barre d'onglets sur téléphone, page « Mes documents », page « Aide et contact », documents compacts sur téléphone, gestions repliées sur fond gris côté admin.
- 20/10/2026 — Documents par catégories côté abonné avec bouton Télécharger ; lignes de titres colorées (violet / turquoise / orange) ; « Terminer la gestion » sans saisie de date.
- 20/10/2026 — Confirmations Oui/Non, icônes poubelle, lignes alternées, comptes cliquables, une gestion dépliée à la fois avec pastille « action à faire », encadré de téléchargement qui disparaît au clic, aide à la réactivation des notifications.
- 20/10/2026 — Identité visuelle de l'ancien site, tableaux à colonnes (gestions en cours, derniers documents), documents admin par catégories avec dépliage.
- 19/10/2026 — Documents nouvellement disponibles mis en avant (encadré en haut de page, grands boutons, pastille « Nouveau », date de téléchargement visible par l'administrateur).
- 19/10/2026 — Notifications push à la mise en ligne d'un document.
- 19/10/2026 — Déclaration mensuelle de l'abonné (première version) et socle mobile (PWA).
- 19/10/2026 — Fluidité (objectifs chiffrés), hébergement à Paris, référencement moteurs + IA, convention de nommage validée et référence de gestion en place.
- 19/10/2026 — Liste complète des types de documents et codes de fichiers ; règle de réactivité.
- 19/10/2026 — Création. Intègre les retours de recette de Frédéric : curseur main, mentions avant les listes, ordre type/période/lien, tri des documents côté abonné, préremplissage depuis le nom de fichier, noms lisibles dans le stockage, objectif et exigences du dépôt en masse, règle « un seul bulletin par mois ».
