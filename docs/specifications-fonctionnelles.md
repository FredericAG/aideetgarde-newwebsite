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
| Chaque action qui échoue affiche un message en français qui dit quoi faire, jamais un écran figé ou une erreur technique brute. | En place |
| Réactivité : chaque clic produit un effet visible immédiat (bouton qui passe en « Suppression… », indicateur « Chargement… » au changement de page), même si le résultat prend quelques centaines de millisecondes. Les serveurs du site et la base de données sont dans la même région (Europe) pour limiter les temps de réponse. | En place (19/10) |

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
| Le tableau de bord affiche les cinq derniers documents, tous salariés confondus, avec le nom du salarié concerné. | En place |

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

**Proposition de convention de nommage (À trancher)**

Les noms et prénoms ne suffisent pas à garantir l'absence de doute : homonymes, accents, noms composés, changement de nom après mariage, plusieurs gestions entre les mêmes personnes au fil des années. La proposition est donc d'attribuer à chaque gestion une **référence unique et définitive**, courte et lisible (par exemple `AG01234`), affichée dans l'espace Administration et dans l'espace de l'abonné (utile aussi pour les échanges par téléphone ou email). Le nom de fichier commencerait par cette référence :

`AG01234_BPG_2605.pdf` → gestion AG01234, bulletin de paie, mai 2026.

Format : `<référence>_<code type>_<AAMM>[_texte libre].pdf`, le texte libre éventuel (noms, mentions) étant ignoré pour le rangement. Codes types : ceux du tableau 5.1.

**Questions ouvertes pour Frédéric**

- Le logiciel de paie peut-il produire des noms de fichiers contenant une telle référence (saisie une fois par salarié/employeur dans le logiciel) ?
- Validation des codes proposés pour les types qui n'en ont pas encore (CTRA, AV, LIC, RUPT, LET).
- Pour la reprise des PDF existants (brique 13), qui n'ont pas de référence : rapprochement par noms, avec la même règle (aucun rangement en cas de doute, liste des cas ambigus à valider à la main).

## 6. Historique de ce document

- 19/10/2026 — Liste complète des types de documents et codes de fichiers ; règle de réactivité.
- 19/10/2026 — Création. Intègre les retours de recette de Frédéric : curseur main, mentions avant les listes, ordre type/période/lien, tri des documents côté abonné, préremplissage depuis le nom de fichier, noms lisibles dans le stockage, objectif et exigences du dépôt en masse, règle « un seul bulletin par mois ».
