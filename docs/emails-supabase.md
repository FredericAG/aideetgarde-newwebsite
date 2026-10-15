# Modèles d'emails Supabase (en français)

À coller dans Supabase > Authentication > Emails (onglet « Templates »).
Règle permanente du projet : tout texte reçu par l'utilisateur est en français.

Les liens pointent vers la route `/auth/confirm` du site avec `token_hash` :
ce format fonctionne même si l'email est ouvert sur un autre appareil que
celui de l'inscription (contrairement au lien par défaut `{{ .ConfirmationURL }}`).

Prérequis : Authentication > URL Configuration
- **Site URL** : `https://aideetgarde-newwebsite.vercel.app` (puis le domaine définitif le jour de la bascule)
- **Redirect URLs** : `https://aideetgarde-newwebsite.vercel.app/**` et `http://localhost:3000/**`

---

## Confirm signup — confirmation d'inscription

**Subject** : `Confirmez votre adresse email — Aide & Garde`

```html
<h2>Bienvenue chez Aide &amp; Garde</h2>
<p>Bonjour,</p>
<p>Merci d'avoir créé votre espace employeur. Pour activer votre compte, confirmez votre adresse email en cliquant sur le lien ci-dessous :</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/tableau-de-bord">Confirmer mon adresse email</a></p>
<p>Si vous n'êtes pas à l'origine de cette inscription, ignorez simplement cet email.</p>
<p>L'équipe Aide &amp; Garde</p>
```

## Reset Password — mot de passe oublié

**Subject** : `Réinitialisation de votre mot de passe — Aide & Garde`

```html
<h2>Réinitialisation de votre mot de passe</h2>
<p>Bonjour,</p>
<p>Vous avez demandé à réinitialiser le mot de passe de votre espace Aide &amp; Garde. Cliquez sur le lien ci-dessous pour en choisir un nouveau :</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/mon-compte/nouveau-mot-de-passe">Choisir un nouveau mot de passe</a></p>
<p>Si vous n'avez rien demandé, ignorez cet email : votre mot de passe actuel reste valable.</p>
<p>L'équipe Aide &amp; Garde</p>
```

## Change Email Address — changement d'adresse email

**Subject** : `Confirmez votre nouvelle adresse email — Aide & Garde`

```html
<h2>Changement d'adresse email</h2>
<p>Bonjour,</p>
<p>Vous avez demandé à remplacer l'adresse {{ .Email }} par {{ .NewEmail }} pour votre espace Aide &amp; Garde. Confirmez ce changement en cliquant sur le lien ci-dessous :</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change&next=/mon-compte">Confirmer la nouvelle adresse</a></p>
<p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email et contactez-nous.</p>
<p>L'équipe Aide &amp; Garde</p>
```

## Magic Link — lien de connexion (non utilisé pour l'instant)

**Subject** : `Votre lien de connexion — Aide & Garde`

```html
<h2>Connexion à votre espace</h2>
<p>Bonjour,</p>
<p>Cliquez sur le lien ci-dessous pour vous connecter à votre espace Aide &amp; Garde :</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/tableau-de-bord">Me connecter</a></p>
<p>Si vous n'avez rien demandé, ignorez cet email.</p>
<p>L'équipe Aide &amp; Garde</p>
```

## Invite user — invitation (non utilisé pour l'instant)

**Subject** : `Vous êtes invité(e) sur Aide & Garde`

```html
<h2>Invitation</h2>
<p>Bonjour,</p>
<p>Un espace Aide &amp; Garde a été créé pour vous. Cliquez sur le lien ci-dessous pour l'activer :</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/mon-compte/nouveau-mot-de-passe">Activer mon espace</a></p>
<p>L'équipe Aide &amp; Garde</p>
```

## Reauthentication — code de vérification (non utilisé pour l'instant)

**Subject** : `Votre code de vérification — Aide & Garde`

```html
<h2>Code de vérification</h2>
<p>Bonjour,</p>
<p>Voici votre code de vérification : <strong>{{ .Token }}</strong></p>
<p>Si vous n'avez rien demandé, ignorez cet email.</p>
<p>L'équipe Aide &amp; Garde</p>
```
