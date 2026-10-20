-- ============================================================================
-- Brique 9b — copie des notifications par email
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor (peut être relancé).
--
-- Chaque abonné reçoit, en plus des notifications sur ses appareils, un
-- email à chaque nouveau document et à chaque étape de ses gestions. Il
-- peut le désactiver dans « Mon compte ». Activé par défaut : c'est le seul
-- moyen d'être prévenu pour un abonné qui n'a pas installé l'application
-- sur son téléphone (cas fréquent sur iPhone).
-- ============================================================================

alter table public.profiles
  add column if not exists notifications_email boolean not null default true;

-- L'abonné peut modifier SA préférence (en plus de ses coordonnées), et
-- rien d'autre : le rôle et l'email restent hors de sa portée.
grant update (notifications_email) on public.profiles to authenticated;
