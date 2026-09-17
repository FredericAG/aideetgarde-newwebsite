# Aide & Garde — nouveau site (refonte)

Nouvelle base technique du site aideetgarde.fr, développée en briques
incrémentales pendant que le site actuel continue de fonctionner normalement
pour les abonnés. Le nom de domaine définitif ne sera basculé vers ce nouveau
site qu'à la toute fin, une fois les données existantes migrées.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript)
- [Tailwind CSS v4](https://tailwindcss.com)
- Firebase (Auth / Firestore / Storage / Cloud Functions) — à brancher dans une prochaine brique
- [Vercel](https://vercel.com) pour l'hébergement (déploiement continu sur une adresse provisoire tant que la migration n'est pas terminée)
- SystemPay (paiement), SendGrid (emails transactionnels) — à brancher dans une prochaine brique

## Démarrer en local

```bash
npm install
npm run dev
```

Puis ouvrir [http://localhost:3000](http://localhost:3000).

## Feuille de route (briques)

Ce dépôt suit une feuille de route en 14 briques (fondations → authentification
→ tableau de bord → espace "Mes salariés" → paiement → abonnement → etc.).
Le détail complet, les décisions actées et les points encore ouverts sont
suivis en dehors de ce dépôt, dans la base de connaissance partagée du projet.

**État actuel : Brique 0 — fondations.** Scaffold Next.js + Tailwind en place.
Charte graphique 2018 intégrée : couleurs exactes en tokens CSS dans
`src/app/globals.css` (`--brand-teal`, `--brand-violet`, `--brand-jaune`, etc.),
polices de marque auto-hébergées (`src/fonts/`, chargées via `next/font/local`
dans `src/fonts/index.ts` : Corporative pour le texte courant, Stevie Sans
pour les titres), logo vectoriel officiel dans `public/aide-et-garde-logo.svg`
et favicon/apple-icon dérivés du logo. Prochaine étape : Brique 1 —
authentification et espace "Mon compte".

## Polices et logo

Les fichiers de police (`src/fonts/*.otf`) et le logo vectoriel proviennent
des fichiers de marque fournis par Frédéric (charte 2018, dépôt de
`AideEtGarde_Logo.ai` / `AideGarde_Logo.pdf`). Ce sont des polices commerciales
achetées pour Aide & Garde : dépôt privé, usage interne au projet uniquement.

## Notes de conception

- Aucune trace de l'ancien projet "Mille Pépites" (mise en relation) : ce
  dépôt repart de zéro plutôt que de migrer le code PHP/Rubedo existant.
- Le modèle de données doit rester extensible dès cette brique : prévoir un
  champ salarié/intervenant optionnel (nul par défaut) sur les futures
  entités de gestion, et des permissions écrites par rôle générique
  (employeur / salarié / admin) plutôt que codées en dur.
