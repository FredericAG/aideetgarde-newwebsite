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
