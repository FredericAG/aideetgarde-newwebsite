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
| Bulletin de salaire | BPG |
| Contrat de travail | CTRA (proposition) |
| Avenant | AV (proposition) |
| Certificat de travail | CT |
| Solde de tout compte | STC |
| Attestation France Travail | FT |
| Attestation de salaire | AS |
| Attestation sur l'honneur | ATTHON |
| Courrier de licenciement | LIC (proposition) |
| Procédure de rupture conventionnelle | RUPT (proposition) |
| Courrier / lettre (démission, engagement d'un mineur, attestation d'emploi…) | LET (proposition) |
| Autre attestation | — |
| Autre | — |

Les codes sans mention sont ceux déjà utilisés par Frédéric. Les « propositions » sont à valider. Pour les courriers, le titre précise la nature de la lettre ; si certains courriers reviennent souvent et doivent être triés à part (par exemple les démissions), ils pourront devenir des types distincts.

### 5.2 Règles anti-doublons

| Règle | Statut |
|---|---|
| **Un seul bulletin de salaire par mois et par gestion, sans exception.** Un bulletin corrigé remplace l'ancien : on supprime l'ancien puis on dépose le nouveau. Un bulletin doit toujours avoir une période. | En place |
| Pour les autres types : pas deux documents avec le même type, la même période et le même titre dans une gestion (comparaison insensible aux majuscules et aux espaces en trop). | En place |
| La période est au format AAMM, avec un mois de 01 à 12. | En place |
| Lors d'un dépôt en masse, un bulletin pour un mois déjà rempli n'est jamais écrasé silencieusement : il apparaît en « conflit » et l'admin choisit explicitement de remplacer ou d'ignorer. | À faire (brique 4) |

### 5.3 Stockage et conservation

| Règle | Statut |
|---|---|
| Les PDF sont stockés dans un espace **privé** : aucun fichier n'a d'adresse publique. Un abonné ne peut lire que ses propres fichiers ; l'administrateur peut tout lire, déposer et supprimer. | En place |
| Les documents restent **en permanence** dans l'espace de l'abonné. Il peut les retélécharger autant de fois qu'il le souhaite (par exemple après la perte de son ordinateur), sans intervention de l'admin. | En place |
| À chaque clic, le site fabrique un lien de téléchargement valable 60 secondes : un lien copié ou transféré cesse de fonctionner au bout d'une minute. | En place |
| Le fichier téléchargé porte un nom lisible (titre et période), pas un code. | En place |
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
| Ordre des informations sur chaque ligne de document : **type**, puis **période**, puis le **titre cliquable** (lien de téléchargement). Colonnes alignées. | En place (19/10) |
| Tri par défaut : du plus récent au plus ancien (période, puis date de dépôt). | En place |
| L'abonné peut changer le tri dans le détail d'une gestion : plus récents, plus anciens, ordre alphabétique, par type (bulletins, contrats, avenants, soldes de tout compte…). Le tri choisi reste dans l'adresse de la page (il survit au rafraîchissement). | En place (19/10) |
| **Document nouvellement disponible mis en avant** : tant que l'abonné ne l'a pas téléchargé, un document apparaît **en haut** du tableau de bord et du détail de la gestion, dans un encadré « Un nouveau document est disponible », avec un **grand bouton de téléchargement** (« ⬇ Télécharger : Bulletin de salaire de [mois] »). Dans les listes, il porte une pastille « Nouveau ». Le premier téléchargement par l'abonné le fait passer en « consulté » : l'encadré et la pastille disparaissent. Un bulletin remplacé (corrigé) redevient « nouveau ». | En place (19/10, brique 7c) |
| Dans la carte « Déclaration du mois », quand le bulletin est établi, un grand bouton « ⬇ Télécharger le bulletin de [mois] » est affiché à côté de la demande de modification. | En place (19/10) |
| Côté administrateur, chaque document indique la date de premier téléchargement par l'abonné, ou un tiret rouge s'il ne l'a pas encore téléchargé (utile en cas de réclamation « je n'ai rien reçu »). Les téléchargements de l'administrateur ne comptent pas. | En place (19/10, présentation 20/10) |
| **Tableau de bord, « Mes gestions en cours »** : tableau Salarié / Emploi / Depuis le / Dernier bulletin (lien de téléchargement direct, pastille « Nouveau ») / Statut du mois en cours (« Déclarer [mois] », « Déclaration envoyée », « Correction en cours », « ✓ Disponible ») / bouton « Détail ». Un bulletin déjà en ligne pour le mois vaut « Disponible », même s'il a été déposé sans déclaration. | En place (20/10) |
| « Vos 5 derniers documents » : tableau Type / Période / Document / Salarié. | En place (20/10) |
| **Détail d'une gestion (abonné)** : documents répartis dans les mêmes **trois catégories** que côté administration, tableaux aux colonnes titrées Type / Période / Document / Mis en ligne le, et un bouton « ⬇ Télécharger » par ligne (pas de suppression côté abonné). Pastille « Nouveau » tant que le document n'a pas été téléchargé. 5 documents par catégorie puis dépliage. Le tri choisi (récents, anciens, alphabétique, par type) s'applique à l'intérieur de chaque catégorie. Sur téléphone : une fiche par document, lignes alternées. | En place (20/10) |
| **Lignes de titres colorées par catégorie**, inspirées de l'ancien espace client : violet (éléments contractuels), turquoise (bulletins de paie), orange (autres) ; texte blanc, nettement distinctes des lignes de documents alternées blanc / gris. Turquoise et orange sont plus foncés que sur l'ancien site pour que le texte blanc reste lisible (contraste ≥ 4,5:1). Un petit carré de la même couleur précède le nom de la catégorie (repère conservé sur téléphone, où les titres de colonnes sont remplacés par les intitulés dans chaque fiche). | En place (20/10) |
| Après un clic sur un bouton de téléchargement, le document **disparaît aussitôt** de l'encadré « nouveau document » (l'encadré disparaît avec le dernier) ; les pastilles « Nouveau » se mettent à jour d'elles-mêmes une à deux secondes plus tard, sans actualiser la page. | En place (20/10) |
| Le tableau de bord affiche **uniquement les 5 derniers documents** (« Vos 5 derniers documents »), tous salariés confondus, avec le nom du salarié ; la liste complète est dans le détail de chaque gestion. | En place |

### 5.4 bis Documents d'une gestion côté administrateur

| Règle | Statut |
|---|---|
| Liste des comptes : **toute la ligne** est cliquable (pas seulement le nom). | En place (20/10) |
| **Liste des comptes pour des milliers d'abonnés** (21/10) : une ligne par compte — Réf. client, Employeur (Prénom NOM, email, code postal et ville), Inscrit le, Abonnement (actif / résilié / aucun), Gestions (en cours / quota, à valider, brouillons, terminées), Salariés, Actions (bouton violet « N actions »). Recherche instantanée (nom, email, référence client ou de gestion, salarié, ville, téléphone ; sans tenir compte des accents ; plusieurs mots possibles). Tri en cliquant sur les titres de colonnes. Pagination par 50 ; tri, recherche et pagination faits par la base (vue `admin_comptes`) pour rester fluide. | En place (21/10, brique 2g) — à recetter |
| **Onglets** : *Clients actifs* (au moins une gestion en cours ou à valider, par défaut, comptes avec actions en tête) ; *À surveiller : abonnement sans gestion* (abonnement actif sans gestion en cours ni en attente — abonnement à suspendre ou rembourser ?), signalé par un bandeau jaune ; *Avec actions à effectuer* ; *Inactifs* (ni gestion ni abonnement actif) affichés seulement à la demande, en fin de barre. Le bandeau du haut donne la somme des actions de toutes les lignes. | En place (21/10) |
| **Navigation de l'administrateur** (21/10) : l'administrateur n'a plus les onglets d'un abonné (tableau de bord, documents, aide). Ses onglets : **Comptes** (liste des comptes, pastille du nombre d'actions à effectuer), **Abonnements** (suivi), **Archivés** (comptes inactifs), **Mon compte**. Mêmes onglets en bas de l'écran sur téléphone. Le logo et les pages abonné le ramènent à l'administration. | En place (21/10) — à recetter |
| **Recherche par colonne** (retour du 21/10) : la recherche générale est placée juste au-dessus du tableau ; sous la ligne de titres, un filtre par colonne : Réf. (texte), Employeur (nom, email, ville), Inscrit le (année), Abonnement (actif / résilié / aucun), Gestions (en cours, à valider, brouillon, sans gestion active), Salariés (texte), Actions (avec / sans). Les filtres se combinent, cherchent dans tous les comptes (y compris archivés) et s'effacent d'un clic. Ligne de titres violette en gras, texte blanc (comme les tableaux de l'abonné), aussi dans l'onglet Abonnements. | En place (21/10) — à recetter (relancer le script 2g) |
| **Email copiable** : au survol de l'adresse email d'un abonné (liste des comptes, onglet Abonnements, fiche), un bouton « Copier » la place dans le presse-papiers ; il est toujours visible sur téléphone. La mention « rôle : employeur » est retirée de la fiche (identique pour tous les comptes). | En place (21/10) |
| **Thème sombre de l'administration** (demande du 21/10, « comme initialement ») : fond #14232b, texte clair, couleurs de la charte éclaircies pour rester lisibles, logo sur une pastille blanche. L'espace abonné reste sur fond blanc. Chiffres clés de l'onglet Abonnements : titres en gras, liseré violet. | En place (21/10) — à recetter |
| **Relances par email standardisées** (21/10, brique 9c) : bouton « ✉ Relancer » en fin de ligne pour les comptes « abonnement sans gestion » (rappel d'ouvrir une gestion ou de demander la résiliation) et les inscrits sans abonnement ; sur la fiche du compte, cinq messages (abonnement sans gestion, gestion pas encore envoyée, déclaration du mois, inscrit sans abonnement, prélèvement refusé), ceux qui correspondent à la situation en violet. Une fenêtre affiche le destinataire et le texte exact avant l'envoi (« Oui, envoyer » / « Non, annuler ») et prévient si le même message a déjà été envoyé. Chaque envoi est enregistré (« relancé le … », historique sur la fiche). Textes modifiables dans `src/lib/relances.ts`. | En place (21/10) — à recetter |
| Colonne Employeur : email et **code postal seulement** (plus la ville). | En place (21/10) |
| **Vérifier la configuration** (onglet Abonnements) : contrôle sans paiement de la clé secrète Supabase, des identifiants Systempay (appel du service de test), du format de la clé publique, du secret de la tâche quotidienne, de l'adresse de notification et de la clé d'envoi des emails. En mode test, un échec de « Continuer vers le paiement » affiche aussi sa cause technique. | En place (21/10) |
| **Solder une demande** (21/10) : sur la fiche d'un compte, chaque demande en attente peut être close avec un **commentaire facultatif** transmis à l'abonné (notification, email et affichage dans sa gestion) : « Refuser la modification… » (le bulletin en ligne est maintenu), « Clore sans bulletin… » (déclaration du mois), « Clore sans avenant… » et « Marquer comme traitée sans document… » (avenant). | En place (21/10, brique 7d) — à recetter |
| **Onglet Abonnements** : chiffres clés (abonnements actifs, montant mensuel théorique, places utilisées / totales, nombre à vérifier) ; filtres Actifs / Quota dépassé / Sans gestion / Résiliés ; tableau Réf., Abonné, Depuis le, Tarif, Places, À vérifier, Paiement. Bloc **« Paiements à suivre »** (brique 5a) : échéances refusées (nombre de refus, prochain essai, code de la banque) et impayées, paiements à vérifier (double paiement, montant inattendu), cartes qui expirent d'ici la fin du mois suivant, bouton « Lancer le traitement maintenant ». Chiffre clé « Encaissé ce mois ». Colonne Paiement : Hors site / À jour (prochain prélèvement) / Refusé, nouvel essai / Impayé. Suspension des comptes impayés : brique 6. | En place (21/10) — à recetter |
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
| Les doublons sont refusés **avant** l'envoi du fichier (pas d'attente inutile pour un fichier qui sera refusé). | En place (19/10) |
| Le fichier part directement du navigateur vers le stockage, sans passer par le serveur du site (pas de limite de taille liée à Vercel). | En place |

### 5.6 Dépôt en masse avec rangement automatique (brique 4)

**Objectif (Frédéric, 19/10/2026)** : déposer en une seule fois des centaines de PDF aux noms structurés, qui sont rangés automatiquement dans la bonne gestion du bon abonné. Le nom du fichier ne doit laisser **aucun doute** possible sur sa destination.

**Exigences**

1. Un fichier n'est jamais rangé « au plus probable » : soit sa destination est certaine, soit il est mis de côté pour décision manuelle.
2. Avant tout envoi, un écran récapitulatif liste chaque fichier avec sa destination reconnue (abonné, salarié, type, période) et son état : prêt, conflit (un bulletin existe déjà pour ce mois), non reconnu. L'admin valide l'ensemble en un clic.
3. Les envois se font en parallèle avec une barre de progression ; un échec sur un fichier n'interrompt pas les autres, et le récapitulatif final liste les échecs à reprendre.
4. Les règles anti-doublons (5.2) s'appliquent exactement comme au dépôt unitaire.

**Convention de nommage — validée sur le principe le 19/10/2026** (Frédéric peut adapter son logiciel de paie pour produire les noms choisis)

Les noms et prénoms ne suffisent pas à garantir l'absence de doute : homonymes, accents, noms composés, changement de nom après mariage, plusieurs gestions entre les mêmes personnes au fil des années. La proposition est donc retenue : chaque gestion a une **référence unique et définitive** (`AG00001`, `AG00002`…), attribuée automatiquement, impossible à modifier — **En place** (script `brique2f`). **Elle reste une référence d'administration** : affichée dans l'espace Administration uniquement, jamais dans l'espace de l'abonné (décision de Frédéric, 19/10). Le nom de fichier commence par cette référence :

`AG00123_BPG_2605.pdf` → gestion AG00123, bulletin de paie, mai 2026.

Format : `<référence>_<code type>_<AAMM>[_texte libre].pdf`, le texte libre éventuel (noms, mentions) étant ignoré pour le rangement. Codes types : ceux du tableau 5.1.

**Questions ouvertes pour Frédéric**

- ~~Le logiciel de paie peut-il produire ces noms ?~~ Oui (Frédéric, 19/10). Il faudra y reporter la référence de chaque gestion : l'admin proposera une liste exportable des références.
- Validation des codes proposés pour les types qui n'en ont pas encore (CTRA, AV, LIC, RUPT, LET).
- Pour la reprise des PDF existants (brique 13), qui n'ont pas de référence : rapprochement par noms, avec la même règle (aucun rangement en cas de doute, liste des cas ambigus à valider à la main).

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

## 9. Historique de ce document

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
