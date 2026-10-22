# Fiche de recette — briques 1 et 2

Objectif : vérifier, scénario par scénario, que le nouveau site fait au moins
ce que fait l'ancien (Rubedo) pour les fonctions de ces deux briques, et noter
précisément ce qui est volontairement différent ou reporté.

**Fiche interactive (depuis le 22/10)** : cochez les scénarios directement sur la page « Recette Aide & Garde » (https://claude.ai/artifact/AoiGVx7CEdjRSCv7feVHLQ), ou signalez un problème en une phrase ; Claude lit ces coches à chaque échange. La colonne « Statut » ci-dessous n'est plus tenue à jour : la page fait foi. Elle est régénérée à partir de ce fichier (`outils/recette-interactive/generer.py`).

**Comment l'utiliser** : suivre les scénarios dans l'ordre sur l'adresse de
prévisualisation Vercel de la branche. Pour chaque ligne, cocher
OK / KO / Écart accepté et noter une remarque. Utiliser **deux navigateurs** (ou
une fenêtre privée) : un connecté en *client*, l'autre en *administrateur*.

Comptes de test à créer (adresses email à vous, Brevo envoie de vrais emails ;
données fictives uniquement) : `client-test` et le compte administrateur
(votre compte, passé en rôle admin via le script SQL).

## Brique 1 — Authentification et « Mon compte »

| # | Scénario | Ancien site | Résultat attendu sur le nouveau site | Statut |
|---|---|---|---|---|
| 1.1 | Créer un compte (email + mot de passe) | Formulaire d'inscription | Compte créé, arrivée sur le tableau de bord ; email de confirmation reçu si la confirmation est activée | |
| 1.2 | Mot de passe trop court (< 8 car.) | Refus | Message en français « Mot de passe trop court » | |
| 1.3 | Créer un compte avec un email déjà utilisé | Refus | Message « Un compte existe déjà avec cette adresse email » | |
| 1.4 | Se déconnecter puis se reconnecter | OK | Retour sur le tableau de bord | |
| 1.5 | Mauvais mot de passe | Refus | Message « Email ou mot de passe incorrect » | |
| 1.6 | Mot de passe oublié | Email avec lien | Email reçu, lien → page de nouveau mot de passe, connexion avec le nouveau | |
| 1.7 | Modifier ses coordonnées dans « Mon compte » | Fiche profil | Message « Profil mis à jour », valeurs conservées après rechargement | |
| 1.8 | Accéder à `/tableau-de-bord` ou `/mon-compte` déconnecté | Redirection | Redirection vers la connexion, puis retour sur la page demandée après connexion | |
| 1.9 | Connecté, ouvrir `/connexion` | — | Redirection vers le tableau de bord | |
| 1.10 | Client : ouvrir `/admin` | n/a | Page « introuvable » (404), aucun indice que l'espace existe | |
| 1.11 | Admin : liste des comptes | Back-office Rubedo | `/admin` liste tous les comptes (nom, email, rôle, date d'inscription, état d'abonnement) | |
| 1.12 | Vérifier que le client ne peut pas se donner le rôle admin | n/a | Impossible depuis le site (seule la console Supabase le permet) | |

**Écarts connus brique 1 vs ancien site** : l'ancien site avait des champs
supplémentaires sur la fiche (photo, présentation, rôle « intervenant » avec
profil public, etc.) — non repris : à décider avec la brique « salarié »
(décisions 2 et 13). Le délai d'envoi des emails dépend de Brevo (voir
`Diagnostic_mail_confirmation_inscription.md`).

## Brique 2 — Tableau de bord client + back-office minimal

Préparation côté admin (fiche du compte `client-test` dans `/admin`) :

| # | Scénario (admin) | Résultat attendu | Statut |
|---|---|---|---|
| 2.1 | Créer un abonnement (quota 2, 12,90 €) | Abonnement actif affiché, « 0 / 2 gestions » | |
| 2.2 | Ajouter une gestion « Garde d'enfants », salarié fictif | Gestion visible, « 1 / 2 » | |
| 2.3 | Ajouter une 2ᵉ gestion | « 2 / 2 » | |
| 2.4 | Ajouter une 3ᵉ gestion | **Refus** : « Quota atteint : 2 gestion(s) en cours pour un quota de 2 » | |
| 2.5 | Terminer la 1ʳᵉ gestion | Gestion « terminée », l'abonnement reste actif, « 1 / 2 » : une place est libérée | |
| 2.6 | Ajouter une 3ᵉ gestion de nouveau | Accepté (place libérée) | |
| 2.7 | Rouvrir la gestion terminée alors que le quota est plein | **Refus** (quota) | |
| 2.8 | Ajouter 2–3 documents (bulletin, période 2609, etc.) à une gestion | Documents listés ; période hors format AAMM refusée | |
| 2.8b | Ajouter un document identique à un document existant (même type, même période, même titre — y compris en changeant seulement les majuscules ou en ajoutant un espace) | **Refus** : « Ce document existe déjà pour cette gestion… » | |
| 2.8d | Déposer un 2ᵉ bulletin de salaire pour un mois qui en a déjà un, même avec un titre différent | **Refus** : « Un bulletin de salaire existe déjà pour ce mois… » ; après suppression de l'ancien, le dépôt est accepté | |
| 2.8e | Déposer un bulletin sans période | **Refus** : la période est obligatoire pour un bulletin | |
| 2.8f | Déposer un PDF par glisser-déposer (admin), puis le télécharger côté client depuis le tableau de bord et depuis le détail de la gestion | Le fichier se télécharge ; un lien copié ne fonctionne plus au bout d'une minute | |
| 2.8g | Déposer un fichier qui n'est pas un PDF, ou de plus de 20 Mo | **Refus** avec message | |
| 2.8h | Supprimer le document | Fiche et fichier supprimés (vérifiable dans Supabase > Storage > documents) | |
| 2.8c | Saisir une période avec un mois invalide (ex. 2613 ou 2600) | **Refus** : message sur le format AAMM | |
| 2.9 | Résilier l'abonnement | Statut « Résilié », **gestions en cours inchangées** ; impossible d'ajouter une gestion | |

| # | Scénario (client, autre navigateur) | Ancien site (tableau de bord) | Résultat attendu | Statut |
|---|---|---|---|---|
| 2.10 | Voir son tableau de bord | « Inscrit le », liste « Mes abonnements en cours » avec prix mensuel | Bonjour + date d'inscription, carte Abonnement (statut, gestions x/quota, tarif, date de début) | |
| 2.11 | Voir la liste de ses gestions | « Mes gestions administratives » | Gestions en cours listées ; terminées dans un bloc repliable | |
| 2.12 | Ouvrir le détail d'une gestion | Détail de la gestion | Infos + liste des documents (titre, type, période) | |
| 2.13 | Voir les derniers documents | Dans le détail de chaque gestion | Cinq derniers documents sur le tableau de bord | |
| 2.14 | Isolation : le client saisit dans l'URL l'identifiant d'une gestion d'un autre compte | — | Page « introuvable » | |
| 2.15 | Les modifications de l'admin apparaissent chez le client après rechargement | — | Oui | |
| 2.16 | Admin qui ouvre lui-même `/tableau-de-bord` | — | Il voit **ses propres** données, pas celles des autres comptes | |

## Écarts assumés / reportés (à ne pas compter comme des anomalies)

| Fonction de l'ancien site | État | Où cela sera traité |
|---|---|---|
| Le **client crée lui-même** sa gestion (statut « brouillon », autorisée tant qu'il reste de la place selon ses commandes) | Pour l'instant créée par l'admin | Brique 3 (création de gestion par le client, avec le quota déjà imposé par la base) |
| Cycle de vie complet d'une gestion : brouillon → soumis → validé → en cours → terminé | Seulement « en cours » / « terminée » | Brique 3 |
| Le client peut **supprimer** une gestion en brouillon et **terminer** une gestion | Admin seulement | Brique 3 |
| Le client **demande la résiliation** de son abonnement (effet fin de mois), via un bouton avec confirmation | Admin seulement | Brique 5 (paiement/abonnement) |
| Prix mensuel cumulé de plusieurs commandes | Un seul abonnement avec quota et tarif fixe | Décisions 3 et 9 (paliers) |
| Accès aux coordonnées des membres (mise en relation) | Absent | Briques de mise en relation |
| Documents : dépôt **en masse** avec rattachement automatique par nom de fichier | Dépôt fichier par fichier (brique 2c) | Brique 4 ; reprise des PDF existants en brique 13 |
| Espace « salarié / intervenant » qui voit les gestions où il est intervenant | Absent | Décisions 2 et 13 |

## Briques 7a et 9 (socle) — Déclaration du mois et téléphone

Préparation : exécuter `supabase/brique7a_declarations_mensuelles.sql`. Tester avec le compte client **sur un téléphone** (adresse du site de test) et le compte admin sur l'ordinateur.

| # | Scénario | Résultat attendu | Statut |
|---|---|---|---|
| 7.1 | Téléphone : se connecter, ouvrir le menu « Menu ☰ » | Liens Tableau de bord / Mon compte / Se déconnecter, faciles à toucher ; le menu se referme après un choix | |
| 7.2 | Téléphone : installer le site sur l'écran d'accueil (Android : « Installer l'application » ; iPhone : Partager → « Sur l'écran d'accueil ») | Icône Aide & Garde ; ouverture plein écran sur le tableau de bord | |
| 7.3 | Tableau de bord : une gestion en cours sans déclaration | Bouton « Déclarer [mois] » | |
| 7.4 | Ouvrir la gestion, saisir 151,67 h et un commentaire, envoyer | Message « Déclaration … envoyée » ; le tableau de bord affiche « déclaration envoyée » | |
| 7.5 | Admin (ordinateur) : ouvrir Administration | La déclaration apparaît dans « Déclarations à traiter » avec heures et commentaire | |
| 7.6 | Client : corriger la déclaration (ex. 160 h) | « mise à jour » ; l'admin voit la nouvelle valeur | |
| 7.7 | Saisir des heures invalides (ex. « abc ») | Refus avec message | |
| 7.8 | Admin : déposer le bulletin de ce mois pour cette gestion | La déclaration disparaît de « à traiter » ; côté client : « Bulletin de … établi », formulaire verrouillé | |
| 7.9 | Client : tenter de déclarer un mois dont le bulletin est déjà en ligne | Refus : « Le bulletin de ce mois est déjà en ligne… » | |
| 7.10 | Téléphone : télécharger un bulletin | Le PDF s'ouvre ou se télécharge correctement | |
| 7.11 | Déclarer depuis le téléphone, vérifier immédiatement sur l'ordinateur (et inversement) | Même information des deux côtés | |

## Brique 9a — Notifications à la mise en ligne d'un document

Préparation : exécuter `supabase/brique9a_notifications_push.sql` ; renseigner les deux clés VAPID dans Vercel, puis redéployer.

| # | Scénario | Résultat attendu | Statut |
|---|---|---|---|
| 9.1 | iPhone : ouvrir le site dans Safari (non installé) | Carte « Notifications » expliquant qu'il faut d'abord installer l'espace sur l'écran d'accueil | |
| 9.2 | Téléphone (application installée) : tableau de bord → « Activer les notifications » → autoriser | « Notifications activées sur cet appareil » ; la carte disparaît du tableau de bord | |
| 9.3 | Admin (ordinateur) : déposer un bulletin pour ce compte | En quelques secondes, le téléphone affiche « Nouveau document disponible — Bulletin de salaire de [mois] », même application fermée | |
| 9.4 | Toucher la notification | L'application s'ouvre sur la gestion concernée, le document est dans la liste | |
| 9.5 | Vérifier le contenu affiché sur l'écran verrouillé | Ni nom de salarié, ni montant | |
| 9.6 | Mon compte → « Désactiver sur cet appareil », puis nouveau dépôt | Plus de notification sur cet appareil | |
| 9.7 | Ordinateur (Chrome/Edge/Firefox) : activer aussi, puis nouveau dépôt | Notification reçue sur l'ordinateur et sur le téléphone | |
| 9.8 | Refuser l'autorisation lors de la demande | Message expliquant comment réautoriser dans les réglages ; le dépôt du document fonctionne normalement | |

## Brique 7b — Demande de modification, refus des notifications

Préparation : exécuter `supabase/brique7b_modification_bulletin.sql`.

| # | Scénario | Résultat attendu | Statut |
|---|---|---|---|
| 7b.1 | Client : tableau de bord, carte Notifications → « Non merci » | La carte disparaît et ne revient pas sur cet appareil ; « Mon compte » permet toujours d'activer | |
| 7b.2 | Tableau de bord avec plus de 5 documents | Seuls les 5 plus récents sont affichés | |
| 7b.3 | Client : gestion avec bulletin du mois en ligne | « Le bulletin de … est en ligne » + bouton « Demander une modification du bulletin » | |
| 7b.4 | Envoyer une demande sans motif | Refus : motif obligatoire | |
| 7b.5 | Envoyer une demande avec motif | Message de confirmation ; la carte affiche « Modification … demandée le … » ; tableau de bord : « modification demandée » | |
| 7b.6 | Admin : Administration | La demande apparaît dans « Déclarations à traiter » avec le motif et le bouton « Déposer le bulletin corrigé » | |
| 7b.7 | Cliquer sur « Déposer le bulletin corrigé », déposer un PDF | Arrivée directe sur la bonne gestion ; case « Remplacer » cochée ; message « Bulletin remplacé — … » ; un seul bulletin pour le mois ; l'ancien fichier a disparu de Supabase > Storage | |
| 7b.8 | Client : vérifier | Nouveau bulletin téléchargeable ; notification « Bulletin corrigé disponible » si activée ; la demande disparaît de « à traiter » | |
| 7b.9 | Admin : supprimer un bulletin pour lequel une déclaration existe | La déclaration redevient « à traiter » ; côté client, le formulaire de déclaration réapparaît | |

## Brique 7c — Documents nouvellement disponibles mis en avant

Préparation : exécuter `supabase/brique7c_documents_consultes.sql` (les documents déjà en ligne sont considérés comme déjà consultés, pour ne pas afficher d'encadré sur l'historique).

| # | Scénario | Résultat attendu | Statut |
|---|---|---|---|
| 7c.1 | Admin : déposer un bulletin pour le compte client | Dans la liste des documents de la gestion : « pas encore téléchargé » | |
| 7c.2 | Client : tableau de bord (ordinateur et téléphone) | En haut de page, encadré « Un nouveau document est disponible » avec un grand bouton « ⬇ Télécharger : Bulletin de salaire de [mois] » et le nom du salarié ; dans « Vos 5 derniers documents », pastille « Nouveau » | |
| 7c.3 | Client : ouvrir la gestion concernée | Même encadré en haut de page ; dans la carte « Déclaration du mois », bouton « ⬇ Télécharger le bulletin de [mois] » | |
| 7c.4 | Cliquer sur le grand bouton | Le PDF s'ouvre ; au retour sur la page (rafraîchir si besoin), l'encadré et la pastille « Nouveau » ont disparu | |
| 7c.5 | Admin : rafraîchir la fiche du compte | « téléchargé par l'abonné le [date] » | |
| 7c.6 | Admin : télécharger lui-même un autre document non consulté | Le document reste « pas encore téléchargé » (seul l'abonné compte) | |
| 7c.7 | Admin : déposer deux documents d'affilée | Encadré « 2 nouveaux documents sont disponibles » avec deux boutons | |
| 7c.8 | Admin : remplacer un bulletin déjà téléchargé (demande de modification) | Le bulletin corrigé redevient « Nouveau » côté client et « pas encore téléchargé » côté admin | |

## Présentation (20/10) — Charte de l'ancien site et tableaux

Aucun script SQL. Tester sur ordinateur **et** sur téléphone.

| # | Scénario | Résultat attendu | Statut |
|---|---|---|---|
| P.1 | Ouvrir n'importe quelle page, y compris avec le téléphone ou l'ordinateur en mode sombre | Fond blanc ; boutons en pilule à contour jaune (violets pour l'action principale, blancs à texte teal sinon) ; polices de la marque | |
| P.2 | En-tête (ordinateur) | « Tableau de bord », « Administration » (admin), « Mon compte » en boutons pilule ; « Se déconnecter » en lien | |
| P.3 | Tableau de bord, « Mes gestions en cours » (ordinateur) | Colonnes Salarié / Emploi / Depuis le / Dernier bulletin / Statut — [mois] / Détail | |
| P.4 | Même tableau sur téléphone | Une fiche par salarié, chaque valeur précédée de son intitulé, bouton « Détail » pleine largeur, aucun défilement horizontal | |
| P.5 | Colonne « Dernier bulletin » | Lien « ⬇ [mois] » qui télécharge directement ; pastille jaune « Nouveau » tant que l'abonné ne l'a pas téléchargé | |
| P.6 | Colonne Statut, selon les cas | « Déclarer [mois] » (bouton) / « Déclaration envoyée » / « Correction en cours » / « ✓ Disponible » (y compris si le bulletin a été déposé sans déclaration) | |
| P.7 | « Vos 5 derniers documents » | Tableau Type / Période / Document / Salarié | |
| P.8 | Admin : fiche d'un compte, gestion avec documents | Trois catégories (Éléments contractuels, Bulletins de paie, Autres documents) aux colonnes alignées : Type / Période / Titre / Téléchargé le / Supprimer | |
| P.9 | Document jamais téléchargé par l'abonné | Tiret rouge dans « Téléchargé le » (info-bulle au survol) | |
| P.10 | Catégorie de plus de 5 documents | 5 lignes + bouton « Afficher les N documents suivants » ; au clic, zone d'environ 10 lignes qui défile à la molette, en-tête visible ; « Réduire » replie | |
| P.11 | Supprimer un document depuis la zone dépliée | Suppression effectuée, message de confirmation | |

## Retours du 20/10 — Confirmations, gestions, notifications

Aucun script SQL.

| # | Scénario | Résultat attendu | Statut |
|---|---|---|---|
| R.1 | Administration : cliquer n'importe où sur la ligne d'un compte (rôle, date, abonnement) | La fiche du compte s'ouvre || OK (20/10) |
| R.2 | Fiche d'un compte avec plusieurs gestions | Une seule gestion dépliée (cadre violet), les autres en cadre gris clair ; déplier une autre gestion replie la précédente || OK (20/10, après correction — voir T.8) |
| R.3 | Gestion avec une déclaration à traiter | Pastille « 1 action à faire » visible même repliée ; c'est elle qui est dépliée à l'arrivée || OK (20/10) |
| R.4 | Cliquer la poubelle d'un document | Fenêtre « Supprimer ce document ? » avec type, période et titre ; « Non, annuler » ou Échap ne supprime rien ; « Oui, supprimer » supprime || OK (20/10) |
| R.5 | Poubelle d'une gestion | Fenêtre de confirmation rappelant le nombre de documents effacés et suggérant « Terminer la gestion » || OK (20/10) |
| R.6 | « Terminer la gestion » puis « Résilier l'abonnement » | Une confirmation Oui/Non pour chacun || OK (20/10) |
| R.7 | Client sur ordinateur : cliquer le bouton de l'encadré « nouveau document » | Le PDF se télécharge et le bouton disparaît aussitôt ; l'encadré disparaît avec le dernier document ; la pastille « Nouveau » disparaît des tableaux 1 à 2 secondes plus tard, sans actualiser || OK (20/10) |
| R.8 | Téléphone : tableau de bord et détail d'une gestion | Fiches / lignes de documents alternées blanc et gris || OK (20/10) |
| R.9 | Mon compte, notifications bloquées dans le navigateur | Encadré ouvert avec les étapes pour ce navigateur et cet appareil (vérifier sur l'iPhone installé, Android, et l'ordinateur) || OK (20/10) |
| R.10 | Suivre les étapes, puis « J'ai modifié le réglage : vérifier » | La page se recharge ; le bouton « Activer les notifications » réapparaît || OK (20/10) |

## Retours du 20/10 (suite) — Documents par catégories côté abonné

Aucun script SQL.

| # | Scénario | Résultat attendu | Statut |
|---|---|---|---|
| C.1 | Client : détail d'une gestion (ordinateur) | Trois catégories ; tableaux avec ligne de titres colorée (violet / turquoise / orange) : Type / Période / Document / Mis en ligne le ; bouton « Télécharger » sur chaque ligne ; aucune poubelle || OK (20/10) |
| C.2 | Cliquer « Télécharger » sur un document « Nouveau » | Le PDF se télécharge ; la pastille disparaît 1 à 2 s plus tard || OK (20/10) |
| C.3 | Changer de tri (Plus anciens, Ordre alphabétique, Par type) | Le tri s'applique dans chaque catégorie || OK (20/10) |
| C.4 | Même page sur téléphone | Une fiche par document, alternance blanc / gris, bouton « Télécharger » pleine largeur, carré de couleur devant chaque catégorie || OK (20/10) |
| C.5 | Admin : tableaux de documents | Mêmes couleurs de lignes de titres que côté client || OK (20/10) |
| C.6 | Admin : « Terminer la gestion » | Plus de champ de date ; confirmation Oui/Non ; la gestion est terminée à la date du jour || OK (20/10) |

## Retours du 20/10 (fin) — Barre d'onglets et documents compacts sur téléphone

Aucun script SQL.

| # | Scénario | Résultat attendu | Statut |
|---|---|---|---|
| T.1 | Téléphone, connecté : n'importe quelle page | Barre fixe en bas : Accueil / Documents / Aide (Admin pour l'administrateur) / Compte ; onglet en cours en violet ; elle ne cache pas le bas des pages || OK (20/10) |
| T.2 | iPhone, application installée | La barre reste au-dessus de la zone du geste d'accueil || OK (20/10) |
| T.3 | Onglet « Documents » | Page « Mes documents » : tous les documents, salarié par salarié, en trois catégories ; boutons pour filtrer par salarié || OK (20/10) |
| T.4 | Onglet « Aide » | Bouton « Appeler le 01 88 320 118 » (ouvre le téléphone) et adresse email || OK (20/10) |
| T.5 | Onglet « Compte » | Bouton « Se déconnecter » en bas de page || OK (20/10) |
| T.6 | Téléphone : détail d'une gestion et « Vos 5 derniers documents » | Chaque document sur deux lignes (type + période, puis titre), bouton rond de téléchargement à droite, alternance blanc / gris || OK (20/10) |
| T.7 | Ordinateur : en-tête | Tableau de bord / Documents / (Administration) / Mon compte / Aide / Se déconnecter ; pas de barre en bas || OK (20/10) |
| T.8 | Admin : fiche d'un compte | Gestions repliées sur fond gris ; gestion dépliée sur fond blanc, cadre violet || OK (20/10) |

## Brique 9b — Copie des notifications par email

Préparation :
1. Exécuter `supabase/brique9b_notifications_email.sql`.
2. Dans Brevo : « SMTP et API » > onglet « Clés API » > « Générer une nouvelle clé API » (nom : `site-vercel`). Copier la clé.
3. Dans Vercel : Settings > Environment Variables > `BREVO_API_KEY` = la clé, type **Secret** (pas de préfixe NEXT_PUBLIC_). Redéployer.

| # | Scénario | Résultat attendu | Statut |
|---|---|---|---|
| 9b.1 | Client : Mon compte | Bloc « Emails », case cochée par défaut || OK (20/10) |
| 9b.2 | Admin : déposer un bulletin | Message « Document déposé — notification… ; email envoyé à … » ; email reçu par le client : titre, mois, salarié, bouton vers l'espace, aucune pièce jointe || OK (20/10) |
| 9b.3 | Cliquer le bouton de l'email (déconnecté) | Page de connexion, puis arrivée sur la gestion || OK après correction (20/10, voir 3b/3c) |
| 9b.4 | Client : décocher la case, puis nouveau dépôt | Message « Plus d'email de notification » ; admin : « pas d'email (désactivé par l'abonné) » ; aucun email reçu || OK (20/10) |
| 9b.5 | Si l'admin voit « email refusé par Brevo » | Vérifier la clé ; si la cause est l'adresse IP : Brevo > Sécurité > IP autorisées, désactiver le blocage (les serveurs Vercel changent d'adresse) || OK (20/10) |

## Brique 3 — L'abonné crée ses gestions

Préparation : exécuter `supabase/brique3_gestions_abonne.sql` (après 9b).

| # | Scénario | Ancien site | Résultat attendu | Statut |
|---|---|---|---|---|
| 3.1 | Client avec abonnement actif : tableau de bord | « Editer un contrat / Créer une gestion » | Bouton « + Créer une gestion » à côté de « Mes gestions en cours » | |
| 3.2 | Remplir seulement le nom, « Enregistrer le brouillon » | Brouillon | Message « Brouillon enregistré » ; tableau de bord : bloc « Gestions en préparation », « Brouillon : pas encore envoyé » | |
| 3.3 | Rouvrir le brouillon, choisir CDD | — | Le champ « Date de fin prévue du CDD » apparaît | |
| 3.4 | « Envoyer à Aide & Garde » avec des champs manquants | Contrôle | Message listant ce qui manque ; le brouillon est conservé | |
| 3.5 | Compléter et envoyer | Soumis | « Gestion envoyée… » ; statut « Envoyée le …, en attente de validation » ; récapitulatif en lecture seule ; « Places utilisées » augmente de 1 ; email « Gestion à valider » reçu sur contact@aideetgarde.fr | |
| 3.6 | « Annuler l'envoi pour modifier » | — | Retour en brouillon modifiable ; la place est libérée | |
| 3.7 | Envoyer alors que le quota est atteint | Refus | Message « Quota atteint… » ; le brouillon reste enregistré || OK après correction (20/10, voir 3b/3c) |
| 3.8 | Admin : Administration | Back-office | Bloc « Gestions à valider » ; « Vérifier et valider » ouvre la bonne gestion, dépliée, pastille « À valider », informations du contrat | |
| 3.9 | Admin : « Renvoyer à l'abonné pour qu'il complète » avec un message | Invalidation | Client : notification + email « Gestion à compléter » ; le message s'affiche en haut du brouillon ; pastille « À compléter » au tableau de bord | |
| 3.10 | Client renvoie, admin « Valider et démarrer » (confirmation) | Validé → en cours | Client : notification + email « Gestion validée » ; la gestion passe dans « Mes gestions en cours » avec « Déclarer [mois] » | |
| 3.11 | Client : supprimer un brouillon (poubelle, confirmation) | — | Brouillon effacé, message « Brouillon supprimé » | |
| 3.12 | Client : tenter de modifier une gestion en cours | — | Impossible : seul le récapitulatif « Informations du contrat » est affiché || OK, complété par la demande d'avenant (3b) |
| 3.13 | Admin : « Ajouter la gestion » depuis la fiche (ancien chemin) | — | Fonctionne toujours (gestion créée directement en cours) | |

**Écarts assumés brique 3** : l'ancien site avait 5 états (brouillon, soumis, validé, en cours, terminé) ; « validé » et « en cours » sont fusionnés (décision du 20/10). Les champs détaillés du contrat et les données sensibles du salarié ne sont pas encore collectés (voir spécifications § 4).

## Brique 3b — Quota fiable, demandes d'avenant, liens des emails

Préparation : exécuter `supabase/brique3b_quota_avenants.sql` (après brique3).

| # | Scénario | Résultat attendu | Statut |
|---|---|---|---|
| 3b.1 | Compte de test à 5 places pour un quota de 3 : fiche admin | Bandeau rouge « Quota dépassé » ; « Valider et démarrer » refusé avec le message « Quota atteint… » || OK (20/10) |
| 3b.2 | Admin : baisser le quota sous le nombre de places utilisées | Refus : « Quota trop bas : ce compte utilise déjà N place(s) » || OK (20/10) |
| 3b.3 | Remettre le compte dans les clous (terminer des gestions), puis envoyer une gestion de plus que le quota | Refus à l'envoi par l'abonné || OK (20/10) |
| 3b.4 | Client : gestion en cours → « Demander un avenant », cocher « Passage en garde partagée », décrire, envoyer | Message de confirmation ; encadré « Demande d'avenant en cours » ; email « Demande d'avenant » reçu sur contact@aideetgarde.fr || OK (20/10) |
| 3b.5 | Client : redemander un avenant sur la même gestion | Impossible tant que la première demande n'est pas traitée || OK (20/10) |
| 3b.6 | Admin : n'importe quelle page | Pastille jaune avec le nombre d'actions sur « Administration » (pastille rouge sur l'onglet Admin du téléphone) || OK (20/10) |
| 3b.7 | Admin : Administration | Encadré « Actions à effectuer (N) » avec un bouton par type ; liste « Demandes d'avenant » ; « Traiter » ouvre la bonne gestion, pastille « Avenant demandé » || OK (20/10) |
| 3b.8 | Admin : « Déposer l'avenant » | Zone de dépôt avec le type « Avenant » prérempli (et le mois d'effet) ; après dépôt, la demande passe « traitée » toute seule ; le client reçoit la notification du document || OK (20/10) |
| 3b.9 | Admin : « Marquer comme traitée sans document » sur une autre demande | Demande traitée ; client prévenu (notification + email) || OK (20/10) |
| 3b.10 | Admin : « Modifier les informations du contrat… » sur une gestion en cours | Nouvelles valeurs enregistrées, visibles côté client dans « Informations du contrat » || OK (20/10) |
| 3b.11 | Recevoir un email de document sur Outlook | Bouton violet à texte blanc lisible || OK (20/10) |
| 3b.12 | Cliquer le lien d'un email client en étant connecté en administrateur | Arrivée sur la fiche du compte concerné, gestion dépliée (plus de 404) || OK (20/10) |
| 3b.13 | Cliquer le lien en étant connecté avec un autre compte client | Page « Ce lien concerne un autre compte » ; « Se déconnecter » ramène à la connexion puis à la bonne page || OK (20/10) |
| 3b.14 | Ouvrir une adresse qui n'existe pas | Page « Page introuvable » en français, aux couleurs du site || OK (20/10) |

## Brique 3c — Envoi d'une gestion (corrections du 20/10)

Préparation : exécuter `supabase/brique3c_envoi_gestion.sql` (après brique3b). Si `brique3` est relancé un jour, relancer ensuite `brique3b` puis `brique3c`.

Constats de recette corrigés : message « L'enregistrement n'a pas abouti » au lieu de la liste des champs manquants (erreur dans la fonction d'envoi, reproduite et corrigée sur une base de test) ; message de quota pensé pour l'administrateur ; nom obligatoire pour un brouillon.

| # | Scénario | Résultat attendu | Statut |
|---|---|---|---|
| 3c.1 | Client : créer une gestion sans rien saisir, « Enregistrer le brouillon » | Brouillon enregistré ; titre « Nouveau salarié » ; « Sans nom » au tableau de bord || OK (20/10) |
| 3c.2 | « Envoyer » avec des champs vides | Message listant précisément ce qui manque (nom, prénom, type de contrat, durée de travail, salaire) || OK (20/10) |
| 3c.3 | Abonnement complet : tableau de bord, création, brouillon | Encadré jaune « Votre abonnement est complet (N / N) » expliquant quoi faire ; le brouillon reste enregistrable || OK (20/10) |
| 3c.4 | Abonnement complet : « Envoyer » une gestion complète | Message « Votre abonnement permet N gestion(s) et elles sont toutes utilisées… Votre brouillon est conservé… » || OK (20/10) |
| 3c.5 | Admin : augmenter le quota, puis le client renvoie | Envoi accepté || OK (20/10) |
| 3c.6 | Compte en dépassement (5 / 3) : tableau de bord client | Encadré « Vous dépassez votre abonnement » || OK (20/10) |

## Brique 2g — Liste des comptes de l'administration

Préparation : exécuter `supabase/brique2g_liste_comptes_admin.sql` (après brique3c). Le script attribue une référence client à chaque compte existant.

Vérification préalable faite par Claude sur une base de test de **3 000 comptes fictifs** : la liste, la recherche et les compteurs répondent en 50 à 110 ms ; un abonné qui interrogerait la vue ne voit que sa propre ligne.

| # | Scénario | Ancien site | Résultat attendu | Statut |
|---|---|---|---|---|
| 2g.1 | Ouvrir Administration | Liste « Gestions administratives » | Bandeau « N action(s) à effectuer, sur M compte(s) » ; onglets Clients actifs / À surveiller / Avec actions ; lien « Voir les comptes inactifs » à droite | |
| 2g.2 | Colonnes d'une ligne | Employeur – Intervenant, Service, État, Création | Réf. client, Employeur (Prénom NOM, email, ville), Inscrit le, Abonnement, Gestions, Salariés, Actions | |
| 2g.3 | Taper un nom sans accent (ex. « helene »), puis un nom de salarié, une référence C… ou AG… | Recherche | La liste se met à jour pendant la frappe, dans tous les comptes | |
| 2g.4 | Cliquer sur les titres Employeur, Inscrit le, Abonnement, Gestions, Actions | Tri | Tri croissant puis décroissant, flèche sur la colonne triée | |
| 2g.5 | Compte avec une gestion à valider ou un avenant demandé | — | Bouton violet « 1 action » sur la ligne ; le total du bandeau = somme des lignes | |
| 2g.6 | Créer un compte de test avec abonnement actif sans gestion | — | Bandeau jaune « N compte(s) paient un abonnement sans gestion » ; le compte apparaît dans « À surveiller » | |
| 2g.7 | Compte sans abonnement ni gestion | — | Absent des clients actifs ; visible dans « Voir les comptes inactifs » | |
| 2g.8 | Deux comptes avec le même prénom et nom | — | Pastille « Homonyme ×2 » ; références client différentes ; la référence apparaît aussi en tête de la fiche du compte | |
| 2g.9 | Plus de 50 comptes | — | Pagination « Suivants → » | |

## Navigation administrateur — Comptes, Abonnements, Archivés

Préparation : **relancer** `supabase/brique2g_liste_comptes_admin.sql` (mis à jour le 21/10 : tarif, dates et dépassement de quota dans la vue, chiffres de l'onglet Abonnements).

| # | Scénario | Résultat attendu | Statut |
|---|---|---|---|
| N.1 | Se connecter avec le compte administrateur (ordinateur) | En-tête : Comptes (pastille d'actions), Abonnements, Archivés, Mon compte, Se déconnecter ; plus de Tableau de bord, Documents ni Aide | |
| N.2 | Même chose sur téléphone | Barre du bas : Comptes / Abonnements / Archivés / Compte | |
| N.3 | Administrateur : ouvrir /tableau-de-bord, ou cliquer le logo | Retour à l'administration | |
| N.4 | Onglet Abonnements | Chiffres clés, filtres Actifs / Quota dépassé / Sans gestion / Résiliés avec leurs compteurs, tableau ; encadré « Paiements refusés et relances » annoncé pour plus tard | |
| N.5 | Onglet Archivés | Comptes inactifs uniquement, avec recherche et tri | |
| N.6 | Compte abonné | Navigation inchangée (Tableau de bord, Documents, Mon compte, Aide) | |

## Données de recette fictives (environ 100 comptes)

Fichiers : `supabase/donnees_recette_fictives.sql` (chargement) et `supabase/donnees_recette_suppression.sql` (suppression). Générés par `supabase/outils_generer_donnees_recette.py`, réutilisable pour produire un nouveau jeu.

Préparation : avoir exécuté tous les scripts `brique*` (dont `brique2g` à jour), puis coller le contenu de `donnees_recette_fictives.sql` dans Supabase > SQL Editor et l'exécuter. Le script ne charge rien s'il a déjà été lancé.

Contenu (vérifié sur une base de test) :
- **98 comptes inventés**, tous en `@recette.invalid`, domaine qui ne reçoit jamais d'email ; les notifications par email sont désactivées pour ces comptes ;
- **62 clients actifs** (1 à 3 gestions), dont :
  - 8 gestions envoyées à valider ;
  - 10 déclarations d'octobre à traiter ;
  - 3 demandes de correction de bulletin ;
  - 4 demandes d'avenant ;
  - 5 brouillons, dont 3 renvoyés à compléter ;
  - 3 comptes en dépassement de quota ;
- **12 abonnements payés sans gestion** (à surveiller) ;
- **14 anciens clients résiliés** et **10 inscrits sans abonnement** (archivés) ;
- **homonymes** : Marie MARTIN ×3, Thomas PETIT ×2, Sophie DURAND ×2, Nicolas BERNARD ×2 (plus un homonyme tiré au hasard) ;
- historique de bulletins (juillet à septembre), contrats, certificats de travail et soldes de tout compte : fiches **sans fichier PDF**, donc non téléchargeables.

Pour voir l'espace abonné d'un compte de test : se connecter avec son adresse `@recette.invalid` (visible dans l'administration) et le mot de passe `Recette2026!`.

**Avant la reprise réelle des clients** : exécuter `donnees_recette_suppression.sql`. Il supprime uniquement les comptes `@recette.invalid` et, en cascade, tout ce qui leur est rattaché.

| # | Scénario | Résultat attendu | Statut |
|---|---|---|---|
| D.1 | Charger les données, ouvrir Comptes | « 25 action(s) à effectuer », bandeau jaune « 12 compte(s) paient un abonnement sans gestion » | |
| D.2 | Onglet Abonnements | 74 actifs, 3 quotas dépassés, 12 sans gestion, 14 résiliés | |
| D.3 | Onglet Archivés | 24 comptes | |
| D.4 | Rechercher « martin marie » | 3 comptes, pastille « Homonyme ×3 », références différentes | |
| D.5 | Se connecter à un compte de test avec `Recette2026!` | Espace abonné avec gestions, déclarations et documents « sans fichier » | |
| D.6 | Exécuter le script de suppression | Plus aucun compte `@recette.invalid` ; les comptes réels restent intacts | |


## Brique 5a — Paiement Systempay en mode TEST (souscription, échéances, refus)

**Préparation (une seule fois)**

1. Exécuter `supabase/brique5a_paiements.sql` dans le SQL Editor (après 2g). Les abonnements existants, dont ceux des données fictives, passent en « hors site » : **ils ne seront jamais prélevés**.
2. Dans Vercel > Settings > Environment Variables (environnements Production et Preview) :
   - `SUPABASE_SECRET_KEY` (Supabase > Project Settings > API Keys > Secret keys), type **Secret** ;
   - `SYSTEMPAY_BOUTIQUE`, `SYSTEMPAY_MOT_DE_PASSE` (**Secret**), `NEXT_PUBLIC_SYSTEMPAY_CLE_PUBLIQUE` : les clés de **TEST** de la boutique Aide & Garde, ou en attendant celles de la boutique de démonstration indiquées dans `.env.example` ;
   - `CRON_SECRET` : une longue chaîne aléatoire, **Secret**.
3. Redéployer. **Rien à modifier dans le Back Office Systempay** : le site donne lui-même son adresse de notification à chaque paiement ; la règle de notification qui sert à l'ancien site reste intacte.

Avec un compte fictif `@recette.invalid` : Systempay refuse ces adresses (domaine réservé aux essais, erreur INT_015). En mode test, le site transmet alors l'adresse d'Aide & Garde à Systempay, qui y envoie le ticket de paiement ; l'email « Votre abonnement est actif » ne peut pas arriver (adresse inexistante). Pour vérifier les emails reçus par l'abonné, utiliser un compte de test avec une vraie adresse.

Faire la recette sur l'adresse principale `aideetgarde-newwebsite.vercel.app` (les adresses de prévisualisation sont protégées par Vercel : Systempay ne pourrait pas y envoyer sa notification). Cartes de test : date d'expiration future, code quelconque.

| # | Scénario | Résultat attendu | Statut |
|---|---|---|---|
| P.1 | Compte abonné **sans abonnement** : tableau de bord | Bouton « Souscrire un abonnement » | |
| P.2 | Page Mon abonnement | Bandeau « Mode test », 4 formules (1 salarié 12,90 € … 4 salariés 25,80 €) ; formules trop petites grisées si des gestions sont déjà en cours ou envoyées | |
| P.3 | Choisir 2 salariés, « Continuer vers le paiement » | Formulaire de carte Systempay dans la page, bouton « Payer 19,20 € » | |
| P.4 | Carte `4970 1000 0000 0113` | Refus affiché par le formulaire ; on peut réessayer sans recharger | |
| P.5 | Carte `4970 1000 0000 0055` | « Paiement accepté, activation en cours… » puis message vert ; formule, carte •••• 0055, prochain prélèvement dans un mois, « À jour » ; email « Votre abonnement est actif » à l'abonné et email « Nouvel abonnement » à Aide & Garde (un seul de chaque) | |
| P.6 | Historique de la page | Deux lignes : refusé puis payé, mention « test » | |
| P.7 | Admin > Abonnements | Colonne Paiement « À jour, prochain … » ; « Encaissé ce mois (test) » = 19,20 € ; fiche du compte : « Payé en ligne », derniers paiements | |
| P.8 | Fermer l'onglet juste après avoir cliqué sur Payer (nouveau compte, carte 0055) | Abonnement activé quand même (notification Systempay) — vérifier au rechargement | |
| P.9 | Échéance acceptée : dans le SQL Editor, `update abonnements set prochaine_echeance = current_date where mode_paiement = 'systempay';` puis Admin > Abonnements > « Lancer le traitement maintenant » | Bilan « 1 échéance(s) payée(s) » ; prochain prélèvement avancé d'un mois ; ligne « Échéance mensuelle » dans l'historique | |
| P.10 | Refus d'échéance : nouveau compte souscrit avec `4970 1000 0000 0675` (acceptée au premier paiement, refusée ensuite), puis même manipulation que P.9 | Bilan « refus avec nouvel essai programmé » ; email « Prélèvement refusé » à l'abonné ; bandeau rouge au tableau de bord ; Admin > « Échéances refusées » | |
| P.11 | Forcer les deux nouveaux essais : `update echeances set prochaine_tentative = current_date where statut = 'a_payer';` + « Lancer le traitement » (deux fois) | Après le 3e refus : « Impayée après 3 refus », emails « Échéance impayée » (abonné) et alerte (Aide & Garde), statut « Impayé » | |
| P.12 | Abonné impayé : « Régler 12,90 € avec une carte », carte `0055` | Échéance réglée, nouvelle carte •••• 0055 enregistrée, statut « À jour », l'alerte disparaît côté admin | |
| P.13 | Relancer « Lancer le traitement » sans rien changer | « rien à traiter » : jamais de double débit | |
| P.14 | Sécurité : `curl -X POST https://…/api/systempay/ipn -d "kr-answer={}&kr-hash=abc&kr-hash-algorithm=sha256_hmac"` | Réponse 401 « Signature invalide » | |

Testé ici avant livraison : fonctions SQL sur une base locale (souscription, refus puis réussite, doublon de notification, deuxième souscription, mauvais montant, échéances rattrapées sur deux mois, 3 refus, régularisation, résultat inconnu, droits d'un abonné) ; signature des notifications ; appels réels à la boutique de démonstration Systempay (création du formulaire avec nos paramètres, réponses d'erreur de `Order/Get` et du débit par alias).

## Retours ergonomie du 21/10 — administration et espace abonné

**Préparation** : exécuter `supabase/brique7d_cloture_demandes.sql`, puis **relancer** `supabase/brique2g_liste_comptes_admin.sql` (nouvelles colonnes pour les filtres). Commit + Push.

| # | Scénario | Résultat attendu | Statut |
|---|---|---|---|
| E.1 | Ouvrir l'administration | Fond sombre, texte clair, logo sur pastille blanche ; l'espace abonné reste blanc | |
| E.2 | Comptes : ligne de titres | Violette, texte blanc en gras ; tri actif en jaune | |
| E.3 | Recherche générale | Placée juste au-dessus du tableau | |
| E.4 | Filtres de colonnes : « martin » sous Employeur, puis Abonnement = Actif | Liste filtrée, « N compte(s) trouvé(s) », lien « Effacer les filtres des colonnes » | |
| E.5 | Filtre Réf. « C0001 », Inscrit le = 2026, Salariés « akbar », Actions = Avec actions | Chaque filtre restreint la liste ; combinables | |
| E.6 | Survoler un email (liste, onglet Abonnements, fiche) puis « Copier » | « Copié », l'adresse est dans le presse-papiers ; la fiche ne s'ouvre pas | |
| E.7 | Fiche d'un compte | Plus de mention « rôle : employeur » | |
| E.8 | Onglet Abonnements | Titres des chiffres clés en gras, ligne de titres violette, boutons de filtre inchangés | |
| E.9 | Fiche : demande de modification de bulletin > « Refuser la modification… » avec un commentaire | Demande soldée (le compteur d'actions baisse) ; l'abonné reçoit notification + email ; dans sa gestion : « Réponse à votre demande de modification : le bulletin est maintenu » + commentaire | |
| E.10 | Déclaration du mois > « Clore sans bulletin… » sans commentaire | « close sans bulletin » côté admin ; côté abonné « Déclaration close », tableau de bord « Close par Aide & Garde » | |
| E.11 | Demande d'avenant > « Clore sans avenant… » avec commentaire | « close sans avenant » + commentaire côté admin ; message affiché à l'abonné dans la gestion | |
| E.12 | Avenant > « Marquer comme traitée sans document… » avec commentaire | Traitée ; le commentaire figure dans l'email de l'abonné | |
| E.13 | Téléphone : barre d'onglets | Fond violet bordé de jaune, rubrique en cours sur pastille blanche (abonné et admin) | |
| E.14 | Abonné : carte « Déclarer le mois » d'un mois avec bulletin | Boutons de taille courante, alignés | |
| E.15 | Abonné : tableau de bord | Bandeau des nouveaux documents compact ; carte abonnement à bandeau turquoise, pastille « Actif », chiffres clés lisibles, bouton « Gérer mon abonnement » | |

## Retours du 21/10 (suite) — Relances, paiement, téléphone

**Préparation** : exécuter `supabase/brique9c_relances.sql`. Commit + Push.

| # | Scénario | Résultat attendu | Statut |
|---|---|---|---|
| F.1 | Admin > Abonnements > « Vérifier la configuration » | Une ligne ✓ ou ✗ par point (clé Supabase, Systempay, clé publique, CRON_SECRET, adresse IPN, Brevo), avec la marche à suivre en cas de ✗ | |
| F.2 | Refaire P.3 (« Continuer vers le paiement ») | Formulaire de carte ; sinon le message rouge indique maintenant la cause technique (mode test) : me l'envoyer | |
| F.3 | Comptes > « À surveiller » : bouton « ✉ Relancer » en fin de ligne | Fenêtre avec destinataire, sujet et texte exacts ; « Non, annuler » ne fait rien | |
| F.4 | « Oui, envoyer » (sur ton propre compte de test, pas un compte `@recette.invalid`) | « ✓ Envoyé », email reçu avec le bouton « Créer une gestion » ; « relancé le … » sous le bouton | |
| F.5 | Relancer une deuxième fois | La fenêtre prévient « Déjà relancé le … pour ce motif » | |
| F.6 | Fiche d'un compte > « Relancer l'abonné par email » | 5 boutons, ceux qui correspondent au compte en violet ; historique des relances | |
| F.7 | Liste des comptes, colonne Employeur | Email et code postal, sans la ville | |
| F.8 | Connexion / inscription / nouveau mot de passe : icône œil | Le mot de passe s'affiche puis se masque | |
| F.9 | Téléphone : tableau de bord > Mes gestions en cours | Tableau en colonnes (Salarié / Bulletin / mois), titres une seule fois, lignes compactes | |

## Brique 5b — Résiliation par l'abonné, onglet Abonnement

**Préparation** : relancer `supabase/brique5a_paiements.sql` (mise à jour : échéances limitées à la date de fin), puis exécuter `supabase/brique5b_resiliation.sql`. Commit + Push, et vérifier dans Vercel que le déploiement est « Ready ».

| # | Scénario | Résultat attendu | Statut |
|---|---|---|---|
| R5.1 | Abonné : en-tête et barre du téléphone | Onglet « Abonnement » (5 onglets sur téléphone) | |
| R5.2 | Mon abonnement > « Résilier mon abonnement » | Fenêtre : effet le dernier jour du mois en cours ; « le mois en cours reste dû » (dernier prélèvement annoncé avec sa date s'il tombe avant la fin du mois, sinon « déjà réglé ») ; annulable ; « Non, annuler » ne change rien | |
| R5.3 | « Oui, résilier » | Message vert avec la date de fin ; bloc jaune « Résiliation demandée » ; Prochain prélèvement : sa date suivie de « (dernier) » s'il tombe avant la fin du mois, sinon « aucun (résiliation) » ; email de confirmation à l'abonné et alerte à Aide & Garde | |
| R5.4 | Admin : fiche du compte et onglet Abonnements | Bandeau « Résiliation demandée par l'abonné » ; pastille « Résiliation au 31/10/2026 » | |
| R5.5 | Abonné : « Annuler la résiliation » | Confirmation, puis abonnement normal, prélèvements inchangés ; alerte à Aide & Garde | |
| R5.6 | Si la résiliation a été annulée en R5.5, résilier de nouveau. Puis simuler la fin du mois dans Supabase > SQL Editor : `update abonnements set fin_prevue = current_date - 1 where fin_prevue is not null;` puis Admin > « Lancer le traitement maintenant » | « Résiliations appliquées : 1 » ; abonnement « Résilié », gestions inchangées ; l'abonné voit « Choisir ma formule » pour se réabonner | |

**Ce qui se passe chez Systempay (R5.2 à R5.6)** : rien. Il n'existe pas d'« abonnement » chez Systempay pour les abonnés du nouveau site : Systempay garde seulement la carte enregistrée (alias), et c'est le site qui demande chaque prélèvement, le matin de l'échéance. Résilier fixe une date de fin côté site : la tâche du matin ne crée plus d'échéance après cette date. Annuler efface la date de fin : les prélèvements continuent. Pour un abonnement « hors site » (saisi par l'administration, comme les abonnements actuels), le site ne prélève jamais : il faut arrêter l'abonnement de l'ancien site dans le Back Office Systempay.

## Ergonomie de l'administration (21/10, lot 3)

**Préparation** : relancer `supabase/brique2g_liste_comptes_admin.sql` **après** 5a et 5b. Commit + Push, déploiement « Ready ».

| # | Scénario | Résultat attendu | Statut |
|---|---|---|---|
| A3.1 | Comptes : le compte `richard.gotainer@recette.invalid` (jamais confirmé) | Absent des onglets ; lien « Non confirmés (1) » à droite des onglets | |
| A3.2 | Archivés > « Inscriptions non confirmées » | Le compte y figure ; texte d'explication ; onglet « Archivés » à côté | |
| A3.3 | Recherche générale « gotainer » dans Comptes | Trouvé, avec la pastille « Email non confirmé » ; même pastille sur sa fiche | |
| A3.4 | Colonne Employeur | Plus large ; code postal puis email ; bouton « Copier » toujours visible ; au clic « Copié » sans décalage | |
| A3.5 | Bas de la liste (si plus de 200 comptes) | « 1–200 sur N », bouton « Tout afficher » puis « Par pages de 200 » | |
| A3.6 | Abonnements : barre de recherche et ligne de filtres | Taper un nom : la liste se filtre ; « Paiement : Hors site » affiche les abonnements saisis par l'administration ; « À vérifier : Résiliation demandée » affiche ceux en cours de résiliation ; « Effacer les filtres des colonnes » | |
| A3.7 | Fiche d'un compte en cours de résiliation | Bandeau : « le mois en cours reste dû » (abonnement hors site : arrêter l'ancien prélèvement après celui du mois ; abonnement payé sur le site : date du dernier prélèvement) | |

## Documents, tableau de bord et onglet Documents (21/10, lot 5)

**Préparation** : exécuter `supabase/brique2h_types_et_precision.sql` **avant** le Commit + Push (le site lit la nouvelle colonne « précision »).

| # | Scénario | Résultat attendu | Statut |
|---|---|---|---|
| D5.1 | Admin : déposer un PDF | Champ « Précision (facultatif) » au lieu de « Titre » ; type « Attestation employeur » dans la liste ; « Procédure de licenciement » | |
| D5.2 | Déposer un courrier avec la précision « Démission » | Ligne « Courrier / lettre — Démission » ; un second dépôt identique est refusé (même type, période, précision) | |
| D5.3 | Abonné : détail d'une gestion et onglet Documents | Colonnes Document / Période / Mis en ligne le ; plus de « Employeur – Salarié » répété | |
| D5.4 | Télécharger un bulletin (ordinateur puis téléphone) | Fichier `NOMEMPLOYEUR_NOMSALARIE_BP_AAMM.pdf` | |
| D5.5 | Tableau de bord | « Bonjour Prénom » ; seulement alertes utiles, nouveaux documents, en préparation, Mes salariés ; liens « Tous mes documents » et résumé de l'abonnement | |
| D5.6 | Onglet Documents avec plusieurs salariés | Pas de « Tous » ; pastilles par salarié (puis « Terminées »), nombre de nouveaux documents sur la pastille ; salarié avec nouveau document sélectionné par défaut | |
| D5.7 | Téléphone : onglet Documents | Pastilles qui défilent horizontalement ; lignes compactes (document, période, bouton) | |
| D5.8 | En-tête (ordinateur), abonné puis administrateur | L'onglet de la page affichée est mis en valeur (violet côté abonné, jaune dans l'administration) ; une gestion garde « Tableau de bord » actif, une fiche de compte garde « Comptes » | |
| D5.9 | Page Abonnement | Plus de lien « ← Tableau de bord » | |
| D5.10 | Tableau de bord | Encart « Mon abonnement » : salariés suivis x / y avec jauge, tarif, depuis le, lien « Gérer » | |
| D5.11 | Admin > Abonnements, colonne Tarif | Liste déroulante des tarifs existants ; le choix filtre la liste | |

## Centre d'aide (21/10)

| # | Scénario | Résultat attendu | Statut |
|---|---|---|---|
| H.1 | Onglet Aide | Centre d'aide : recherche, « Comprendre mes documents », « Employer un salarié à domicile », « Utiliser mon espace », Outils (simulateur « Bientôt »), contact | |
| H.2 | Taper « préavis démission » | Les questions correspondantes s'affichent ; un clic ouvre la page du thème avec la question dépliée | |
| H.3 | Ouvrir un thème | Fil d'Ariane, bandeau « en cours de relecture », questions dépliables, tableaux lisibles sur téléphone | |
| H.4 | Documents d'un salarié | Liens « Comprendre mon bulletin » et « Les documents de fin de contrat » au-dessus des catégories | |
| H.5 | Relecture du contenu | Cocher `docs/centre-aide-relecture.md`, puis demander la publication (fin du bandeau, indexation) | |

## Brique 4 — Dépôt en masse des PDF (22/10)

**Préparation** : exécuter `supabase/brique4_depot_en_masse.sql` (après brique2h) **avant** le Commit + Push. Préparer quelques PDF fictifs nommés à la norme pour 2 ou 3 gestions de test (référence AG visible sur la fiche du compte), par exemple `AG00012_DUPONT_MARTIN_BP_2610.pdf`.

| # | Scénario | Résultat attendu | Statut |
|---|---|---|---|
| M.1 | Admin : onglet « Dépôt » (ordinateur et téléphone) | Page « Dépôt de documents », zone de dépôt, boutons « Choisir des fichiers » et « Choisir un dossier » | |
| M.2 | Glisser 3 PDF bien nommés pour 2 gestions | Récapitulatif : 3 prêts, destination (employeur, référence, salarié), document et période lus | |
| M.3 | Ajouter un fichier mal nommé, une référence inexistante et un fichier non PDF | « Nom non reconnu » avec la raison, « Référence inconnue », « 1 fichier non PDF ignoré » ; aucun n'est déposable | |
| M.4 | Fichier dont le nom du salarié est faux (référence juste) | « Noms à vérifier » avec l'écart ; « Confirmer quand même » le rend prêt | |
| M.5 | Deux fichiers pour le même bulletin dans le lot | Le second : « En double dans le lot » | |
| M.6 | « Déposer N fichiers » | Barre de progression, « ✓ Déposé » sur chaque ligne ; documents visibles sur la fiche des comptes | |
| M.7 | Option « Prévenir les abonnés » cochée, 2 documents pour un même abonné | Une seule notification et un seul email récapitulant les 2 documents | |
| M.8 | Redéposer le même fichier, identique | « Déjà en ligne à l'identique », ignoré par défaut | |
| M.9 | Déposer une version différente d'un bulletin déjà en ligne | « Existe déjà » (date de dépôt, téléchargé ou non) ; « Remplacer » puis déposer : « ✓ Remplacé » ; sur la fiche, « Remplacé le … » sous le document ; l'abonné le voit « Nouveau » | |
| M.10 | Dépôt unitaire (fiche d'un compte) d'un fichier normé d'une autre gestion | Type, période, précision repris du nom ; avertissement « Ce fichier semble destiné à une autre gestion » | |
| M.11 | Dépôt unitaire d'un bulletin déjà en ligne | Fenêtre « existe déjà » (déposé le…, téléchargé ou non) : « Oui, remplacer » / « Non, garder l'existant » | |
| M.12 | Abonné : télécharger un document déposé en masse | Fichier `NOMEMPLOYEUR_NOMSALARIE_BP_AAMM.pdf` | |


## Obligations légales du site (22/10)

**Préparation** : exécuter `supabase/brique5d_obligations_legales.sql` (après brique5a et 5b) **avant** le Commit + Push. Les repères jaunes « [… à compléter] » sont normaux tant que les informations de la société ne sont pas fournies.

| # | Scénario | Résultat attendu | Statut |
|---|---|---|---|
| L.1 | Bas de n'importe quelle page (connecté ou non, ordinateur et téléphone) | Pied de page : Mentions légales, Confidentialité et cookies, Conditions générales de vente, Résilier votre contrat, Contact ; au-dessus de la barre d'onglets sur téléphone | |
| L.2 | Ouvrir « Mentions légales » | Éditeur, directeur de la publication, activité réglementée, hébergeur (Vercel, Paris), propriété intellectuelle ; informations manquantes en jaune | |
| L.3 | Ouvrir « Confidentialité et cookies » | 8 rubriques avec sommaire ; tableau des données lisible sur téléphone (défilement horizontal) ; cookies : uniquement nécessaires, pas de bandeau | |
| L.4 | Ouvrir « Conditions générales de vente » | 10 articles et l'annexe « formulaire de rétractation » ; tableau des prix identique à la grille de souscription ; version 2026-10-22 | |
| L.5 | « Résilier votre contrat » (pied de page), connecté | Page Mon abonnement, positionnée sur le bloc de résiliation ; non connecté : page de connexion puis retour | |
| L.6 | Inscription | Case « J'accepte les conditions générales de vente et j'ai lu la politique de confidentialité » ; les deux liens s'ouvrent dans un nouvel onglet ; sans la case : message d'erreur | |
| L.7 | Souscription en ligne (mode TEST), sans cocher les cases | Le navigateur bloque ; les deux cases (CGV, exécution immédiate) sont obligatoires | |
| L.8 | Souscription en ligne avec les deux cases | Paiement normal ; dans Supabase, la commande porte `cgv_version` = 2026-10-22, `cgv_acceptees_le` et `execution_immediate` = true | |
| L.9 | Abonné souscrit en ligne depuis moins de 14 jours : page Mon abonnement | Bloc « Droit de rétractation » avec la date limite ; « Renoncer au contrat ici » ouvre le formulaire (nom, prénom, email préremplis, contrat concerné) | |
| L.10 | « Confirmer la rétractation » | Message de confirmation ; abonnement résilié le jour même, plus de prochaine échéance ; email « accusé de réception » (contenu, date et heure, référence) ; alerte Aide & Garde avec le montant à rembourser | |
| L.11 | Abonné souscrit il y a plus de 14 jours, ou abonnement hors site | Pas de bloc « Droit de rétractation » ; seule la résiliation est proposée | |
| L.12 | Remboursement | Fait depuis le Back Office Systempay (mode TEST) ; date notée dans la table `retractations` (colonne `rembourse_le`) | |
