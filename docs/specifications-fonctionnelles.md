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
| L'abonné demande lui-même la résiliation (effet en fin de mois), avec confirmation. | À faire (brique 5/6) |
| Grille tarifaire à paliers (plafond 25,80 € à partir de 4 salariés). | À trancher (brique 12) |

## 4. Gestions

| Règle | Statut |
|---|---|
| Une gestion = un salarié employé par l'abonné : type (garde d'enfants, aide à domicile, employé de maison), nom et prénom du salarié, dates de début et de fin, statut. | En place |
| L'abonné voit ses gestions en cours ; les gestions terminées sont regroupées dans un bloc repliable. | En place |
| L'abonné crée lui-même une nouvelle gestion, dans la limite de son quota. | À faire (brique 3) |
| Cycle de vie complet de l'ancien site (brouillon → soumis → validé → en cours → terminé) ou simplifié. | À trancher (avant brique 3) |

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
| Le tableau de bord affiche **uniquement les 5 derniers documents** (« Vos 5 derniers documents »), tous salariés confondus, avec le nom du salarié ; la liste complète est dans le détail de chaque gestion. | En place |

### 5.4 bis Documents d'une gestion côté administrateur

| Règle | Statut |
|---|---|
| Documents répartis en **trois catégories** : *Éléments contractuels* (contrat, avenants, rupture conventionnelle, licenciement, et documents de fin de contrat : certificat de travail, solde de tout compte, attestation France Travail), *Bulletins de paie*, *Autres documents* (attestations de salaire ou sur l'honneur, courriers, divers). Une catégorie vide tient sur une ligne (« aucun document »). | En place (20/10) — rattachement des documents de fin de contrat à valider par Frédéric |
| Colonnes identiques dans les trois catégories, pour un alignement vertical : **Type / Période (MM/AAAA) / Titre (vu par l'abonné) / Téléchargé le**, puis « Supprimer ». Le titre est le nom affiché à l'abonné (le nom technique du fichier dans le stockage n'est pas utile ici). | En place (20/10) |
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

## 6. Déclaration mensuelle et version mobile

### 6.1 Déclaration du mois par l'abonné

| Règle | Statut |
|---|---|
| Pour chaque gestion en cours, l'abonné déclare un mois (mois en cours ou les deux précédents ; par défaut, le mois précédent jusqu'au 10, puis le mois en cours) : heures travaillées (facultatif) et commentaire libre (absences, congés, heures en plus…). | En place (19/10) |
| L'envoi signale au back-office que le bulletin peut être établi. Le bouton le dit explicitement : « Envoyer : le bulletin peut être établi ». | En place |
| L'abonné peut corriger sa déclaration tant que le bulletin n'est pas en ligne ; ensuite elle est verrouillée. | En place |
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

- 20/10/2026 — Identité visuelle de l'ancien site, tableaux à colonnes (gestions en cours, derniers documents), documents admin par catégories avec dépliage.
- 19/10/2026 — Documents nouvellement disponibles mis en avant (encadré en haut de page, grands boutons, pastille « Nouveau », date de téléchargement visible par l'administrateur).
- 19/10/2026 — Notifications push à la mise en ligne d'un document.
- 19/10/2026 — Déclaration mensuelle de l'abonné (première version) et socle mobile (PWA).
- 19/10/2026 — Fluidité (objectifs chiffrés), hébergement à Paris, référencement moteurs + IA, convention de nommage validée et référence de gestion en place.
- 19/10/2026 — Liste complète des types de documents et codes de fichiers ; règle de réactivité.
- 19/10/2026 — Création. Intègre les retours de recette de Frédéric : curseur main, mentions avant les listes, ordre type/période/lien, tri des documents côté abonné, préremplissage depuis le nom de fichier, noms lisibles dans le stockage, objectif et exigences du dépôt en masse, règle « un seul bulletin par mois ».
