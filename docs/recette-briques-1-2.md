# Fiche de recette — briques 1 et 2

Objectif : vérifier, scénario par scénario, que le nouveau site fait au moins
ce que fait l'ancien (Rubedo) pour les fonctions de ces deux briques, et noter
précisément ce qui est volontairement différent ou reporté.

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
| R.1 | Administration : cliquer n'importe où sur la ligne d'un compte (rôle, date, abonnement) | La fiche du compte s'ouvre | |
| R.2 | Fiche d'un compte avec plusieurs gestions | Une seule gestion dépliée (cadre violet), les autres en cadre gris clair ; déplier une autre gestion replie la précédente | |
| R.3 | Gestion avec une déclaration à traiter | Pastille « 1 action à faire » visible même repliée ; c'est elle qui est dépliée à l'arrivée | |
| R.4 | Cliquer la poubelle d'un document | Fenêtre « Supprimer ce document ? » avec type, période et titre ; « Non, annuler » ou Échap ne supprime rien ; « Oui, supprimer » supprime | |
| R.5 | Poubelle d'une gestion | Fenêtre de confirmation rappelant le nombre de documents effacés et suggérant « Terminer la gestion » | |
| R.6 | « Terminer la gestion » puis « Résilier l'abonnement » | Une confirmation Oui/Non pour chacun | |
| R.7 | Client sur ordinateur : cliquer le bouton de l'encadré « nouveau document » | Le PDF se télécharge et le bouton disparaît aussitôt ; l'encadré disparaît avec le dernier document ; la pastille « Nouveau » disparaît des tableaux 1 à 2 secondes plus tard, sans actualiser | |
| R.8 | Téléphone : tableau de bord et détail d'une gestion | Fiches / lignes de documents alternées blanc et gris | |
| R.9 | Mon compte, notifications bloquées dans le navigateur | Encadré ouvert avec les étapes pour ce navigateur et cet appareil (vérifier sur l'iPhone installé, Android, et l'ordinateur) | |
| R.10 | Suivre les étapes, puis « J'ai modifié le réglage : vérifier » | La page se recharge ; le bouton « Activer les notifications » réapparaît | |

## Retours du 20/10 (suite) — Documents par catégories côté abonné

Aucun script SQL.

| # | Scénario | Résultat attendu | Statut |
|---|---|---|---|
| C.1 | Client : détail d'une gestion (ordinateur) | Trois catégories ; tableaux avec ligne de titres colorée (violet / turquoise / orange) : Type / Période / Document / Mis en ligne le ; bouton « Télécharger » sur chaque ligne ; aucune poubelle | |
| C.2 | Cliquer « Télécharger » sur un document « Nouveau » | Le PDF se télécharge ; la pastille disparaît 1 à 2 s plus tard | |
| C.3 | Changer de tri (Plus anciens, Ordre alphabétique, Par type) | Le tri s'applique dans chaque catégorie | |
| C.4 | Même page sur téléphone | Une fiche par document, alternance blanc / gris, bouton « Télécharger » pleine largeur, carré de couleur devant chaque catégorie | |
| C.5 | Admin : tableaux de documents | Mêmes couleurs de lignes de titres que côté client | |
| C.6 | Admin : « Terminer la gestion » | Plus de champ de date ; confirmation Oui/Non ; la gestion est terminée à la date du jour | |

