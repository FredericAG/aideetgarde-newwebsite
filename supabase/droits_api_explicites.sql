-- ============================================================================
-- Droits d'accès explicites à l'API de données (« Data API »)
--
-- Contexte : à partir du 30/10/2026, Supabase n'accorde plus automatiquement
-- les droits d'accès à l'API aux NOUVELLES tables du schéma public (rôles
-- anon, authenticated, service_role). Les tables déjà créées gardent leurs
-- droits : le site actuel n'est pas concerné.
--
-- Chaque script brique*.sql écrit déjà ses droits en clair pour les
-- abonnés et l'administrateur (rôle authenticated), et aucun accès n'est
-- donné aux visiteurs non connectés (anon) : c'est le choix fait dès la
-- brique 1, que la nouvelle règle de Supabase rejoint.
--
-- Ce script complète pour le serveur du site (clé secrète, rôle
-- service_role) : utile seulement si la base est un jour RECONSTRUITE à
-- partir des scripts (nouveau projet, copie de test). À exécuter alors en
-- dernier, après tous les autres. Sans danger à relancer.
-- ============================================================================

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Rappel : aucun droit pour anon (visiteur non connecté) sur les tables.
do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke all on public.%I from anon', t.tablename);
  end loop;
end;
$$;
