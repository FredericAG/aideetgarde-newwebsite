# Modifier soi-même les textes du site

Les textes du site sont écrits **dans le code**, dans le dossier `aideetgarde-newwebsite` de votre ordinateur. Une modification enregistrée puis publiée (Commit + Push dans GitHub Desktop) est en ligne 1 à 2 minutes plus tard, après le redéploiement de Vercel.

## Où se trouve chaque texte

| Ce que vous voulez changer | Fichier |
|---|---|
| Identité de la société, téléphone, email, n° SAP, TVA, médiateur, activités déclarées, mentions « mode mandataire » et « devis » | `src/lib/entreprise.ts` |
| Prix des formules | `src/lib/formules.ts` |
| Conditions générales de vente | `src/app/cgv/page.tsx` (puis changer `VERSION_CGV` dans `src/lib/entreprise.ts`) |
| Mentions légales | `src/app/mentions-legales/page.tsx` |
| Confidentialité et cookies, durées de conservation | `src/app/confidentialite/page.tsx` |
| Page « Comment fonctionne Aide & Garde » (lien des recommandations) | `src/app/decouvrir/page.tsx` |
| Message proposé pour recommander le site | `src/app/recommander/FormulaireRecommandation.tsx` (fonction `messageParDefaut`) |
| Centre d'aide (questions et réponses) | `src/lib/aide/contenu.ts` |
| Courriers préremplis (attestation d'emploi, lettres de licenciement, démission…) | texte : `src/lib/courriers/generer.ts` ; titres, descriptions, champs du petit formulaire et textes de motif proposés : `src/lib/courriers/modeles.ts` |
| Cadre « Que souhaitez-vous faire ? » d'une gestion (explications, étapes) | `src/app/tableau-de-bord/gestions/[id]/ActionsGestion.tsx` |
| Champs du formulaire « Créer une gestion » (libellés, aides, obligatoires, conditions) | `src/lib/contrat/champs.ts` |
| Étapes d'installation sur téléphone | `src/lib/installation.ts` |
| Tableau de bord | `src/app/tableau-de-bord/page.tsx` |
| Mon abonnement (souscription, résiliation, rétractation) | `src/app/tableau-de-bord/abonnement/page.tsx` et `Paiement.tsx` |
| Mon compte | `src/app/mon-compte/page.tsx` |
| Pied de page | `src/components/PiedDePage.tsx` |
| Emails envoyés par le site | le texte de chaque email est à côté de l'action qui l'envoie : `src/app/tableau-de-bord/abonnement/actions.ts` (abonnement, résiliation, rétractation), `src/app/tableau-de-bord/gestions/actions.ts` (gestions), `src/lib/prevenir.ts` (nouveaux documents), `src/lib/paiement.ts` (paiements), `src/app/admin/relances-actions.ts` (relances), `src/app/recommander/actions.ts` (recommandation) |
| Emails de connexion (confirmation d'inscription, mot de passe oublié) | dans Supabase > Authentication > Emails (voir `docs/emails-supabase.md`) |

Pour trouver une phrase précise : dans Visual Studio Code, **Ctrl + Maj + F** puis tapez quelques mots de la phrase.

## Comment modifier sans rien casser

1. Ouvrez le dossier dans Visual Studio Code (ou modifiez le fichier directement sur github.com, bouton crayon).
2. Ne changez que le texte **entre les balises** : ce qui est entre `>` et `<`, ou entre guillemets `"…"` dans les fichiers `.ts`.
3. Dans les pages (`.tsx`), une apostrophe s'écrit `&apos;` : `l&apos;employeur`. Dans les fichiers `.ts` (entre guillemets), on écrit l'apostrophe normalement.
4. Ne touchez pas à ce qui est entre accolades `{…}` : ce sont des valeurs calculées (prix, nom, dates).
5. Enregistrez, puis dans GitHub Desktop : résumé de la modification, **Commit**, **Push**.
6. Si Vercel affiche « Error » sur le déploiement, rien n'est cassé en ligne (l'ancienne version reste affichée) : envoyez-moi le message d'erreur, ou annulez la modification dans GitHub Desktop (clic droit sur le commit > « Revert »).

## Plus tard : modifier les textes depuis l'administration

Si vous modifiez souvent certains textes (page d'accueil, centre d'aide), ils peuvent être déplacés dans la base de données avec un éditeur dans l'onglet Administration : plus besoin de passer par le code. C'est un chantier à part ; les textes juridiques (CGV, mentions légales) gagnent à rester dans le code, où chaque version est conservée et datée.
