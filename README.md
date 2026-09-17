# Aide & Garde — nouveau site (refonte)

Nouvelle base technique du site aideetgarde.fr, développée en briques
incrémentales pendant que le site actuel continue de fonctionner normalement
pour les abonnés. Le nom de domaine définitif ne sera basculé vers ce nouveau
site qu'à la toute fin, une fois les données existantes migrées.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript)
- [Tailwind CSS v4](https://tailwindcss.com)
- Supabase — PostgreSQL + Auth (authentification et profil utilisateur, voir
  "Configurer Supabase" ci-dessous) ; Storage à brancher dans une prochaine
  brique. Remplace Firebase, choisi initialement puis abandonné (voir la
  feuille de route, décision actée n°8 : le métier est relationnel, une base
  SQL permet d'imposer les règles d'intégrité au niveau de la base elle-même)
- [Vercel](https://vercel.com) pour l'hébergement (déploiement continu sur une adresse provisoire tant que la migration n'est pas terminée)
- SystemPay (paiement), SendGrid (emails transactionnels) — à brancher dans une prochaine brique

## Polices et logo

Corporative et Stevie Sans sont des polices commerciales achetées par
Aide & Garde (fichiers dans `src/fonts/`, self-hostées via `next/font/local` —
jamais via Google Fonts). Le logo vectoriel (`public/aide-et-garde-logo.svg`)
est extrait du PDF de marque officiel. Dépôt privé, usage interne uniquement.

## Configurer Supabase (nécessaire pour l'authentification)

1. Créer un compte et un projet sur [supabase.com](https://supabase.com/dashboard).
   Choisir une **région européenne** (ex. Frankfurt/`eu-central-1`) pour rester
   cohérent avec les obligations RGPD.
2. Authentication > Sign In / Up : le fournisseur **Email** est activé par
   défaut. Dans ses réglages, **désactiver "Confirm email"** pour l'instant —
   sans quoi l'inscription n'ouvre pas immédiatement une session (comportement
   différent de ce qui est codé ici) ; à réactiver plus tard si on veut
   ajouter une étape de vérification d'email.
3. SQL Editor > coller et exécuter le contenu de `supabase/schema.sql` (à la
   racine du dépôt) : crée la table `profiles`, ses règles de sécurité (RLS)
   et le trigger qui initialise le profil à l'inscription.
4. Authentication > Emails > modèle **"Reset Password"** : remplacer l'URL de
   confirmation par
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/mon-compte/nouveau-mot-de-passe`
   (nécessaire pour que "mot de passe oublié" fonctionne — Supabase, contrairement
   à Firebase, ne fournit pas de page de traitement du lien toute faite).
5. Project Settings > API Keys : copier l'URL du projet et la **Publishable
   key** dans les variables `NEXT_PUBLIC_SUPABASE_*` (voir `.env.example`).
   Aucune clé secrète n'est nécessaire pour cette brique.
6. Authentication > URL Configuration : renseigner l'URL du site
   (`https://aideetgarde-newwebsite.vercel.app` en attendant le domaine
   définitif) en Site URL, pour que les liens envoyés par email pointent au
   bon endroit.

## Démarrer en local

```bash
npm install
cp .env.example .env.local   # puis renseigner les valeurs Supabase
npm run dev
```

Puis ouvrir [http://localhost:3000](http://localhost:3000).

## Feuille de route (briques)

Ce dépôt suit une feuille de route en 14 briques (fondations → authentification
→ tableau de bord → espace "Mes salariés" → paiement → abonnement → etc.).
Le détail complet, les décisions actées et les points encore ouverts sont
suivis en dehors de ce dépôt, dans la base de connaissance partagée du projet.

**État actuel : Brique 1 — authentification et espace "Mon compte".**
Inscription / connexion / mot de passe oublié (Supabase Auth, session gérée
par cookies via `@supabase/ssr`), route `/mon-compte` protégée (Proxy +
vérification serveur) avec formulaire de profil éditable (Server Action),
table `profiles` avec RLS (voir `supabase/schema.sql`). Brique 0 (fondations
Next.js/Tailwind + charte graphique définitive) est terminée.

## Notes de conception

- Aucune trace de l'ancien projet "Mille Pépites" (mise en relation) : ce
  dépôt repart de zéro plutôt que de migrer le code PHP/Rubedo existant.
- Le modèle de données doit rester extensible dès cette brique : prévoir un
  champ salarié/intervenant optionnel (nul par défaut) sur les futures
  entités de gestion, et des permissions écrites par rôle générique
  (employeur / salarié / admin) plutôt que codées en dur.
