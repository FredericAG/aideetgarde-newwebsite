-- ============================================================================
-- Brique 13 — Registre des scripts SQL et alerte des erreurs (13/11/2026)
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique12. Peut être
-- relancé sans danger.
--
-- 1. Registre : chaque script exécuté s'inscrit dans public.scripts_sql
--    (les scripts à venir le font eux-mêmes, en dernière ligne). Ce script
--    inscrit aussi ceux déjà exécutés, reconnus à ce qu'ils ont créé.
--    « Vérifier la configuration » (Administration > Abonnements) compare
--    avec supabase/ORDRE.txt et liste ceux qui manquent.
-- 2. Erreurs du site : une ligne par erreur distincte (page + message),
--    pour n'envoyer qu'un e-mail par heure et par erreur à Aide & Garde.
-- ============================================================================

-- 1. Registre ------------------------------------------------------------------
create table if not exists public.scripts_sql (
  nom          text primary key,
  applique_le  timestamptz not null default now(),
  -- true : inscrit par ce script d'après ce qu'il a trouvé dans la base.
  detecte      boolean not null default false
);

alter table public.scripts_sql enable row level security;
revoke all on public.scripts_sql from anon, authenticated;
grant select on public.scripts_sql to authenticated;
grant all on public.scripts_sql to service_role;
drop policy if exists scripts_sql_equipe on public.scripts_sql;
create policy scripts_sql_equipe on public.scripts_sql
  for select to authenticated using (public.is_admin());

create or replace function pg_temp.colonne(t text, c text) returns boolean
language sql as $$
  select exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = t and column_name = c);
$$;
create or replace function pg_temp.contrainte(n text, contenu text) returns boolean
language sql as $$
  select exists (select 1 from pg_constraint where conname = n and pg_get_constraintdef(oid) like '%' || contenu || '%');
$$;
create or replace function pg_temp.fonction(n text) returns boolean
language sql as $$
  select exists (select 1 from pg_proc p join pg_namespace s on s.oid = p.pronamespace
                  where s.nspname = 'public' and p.proname = n);
$$;

insert into public.scripts_sql (nom, detecte)
select nom, true
  from (values
    ('schema',                               to_regclass('public.profiles') is not null),
    ('brique2',                              to_regclass('public.gestions') is not null),
    ('brique2b_documents_doublons',          to_regclass('public.documents_sans_doublon') is not null),
    ('brique2c_stockage_pdf',                pg_temp.colonne('documents', 'nom_fichier_origine')),
    ('brique2d_documents_ergonomie',         exists (select 1 from pg_policies where policyname = 'documents_fichiers_lecture_employeur' and qual like '%"right"(%')),
    ('brique2e_types_documents',             pg_temp.contrainte('documents_type_document_check', 'certificat_travail')),
    ('brique2f_reference_gestion',           pg_temp.colonne('gestions', 'reference')),
    ('brique7a_declarations_mensuelles',     to_regclass('public.declarations_mensuelles') is not null),
    ('brique9a_notifications_push',          to_regclass('public.notifications_push') is not null),
    ('brique7b_modification_bulletin',       pg_temp.colonne('declarations_mensuelles', 'motif_modification')),
    ('brique7c_documents_consultes',         pg_temp.colonne('documents', 'consulte_le')),
    ('brique7d_cloture_demandes',            pg_temp.colonne('declarations_mensuelles', 'cloturee_le')),
    ('brique9b_notifications_email',         pg_temp.colonne('profiles', 'notifications_email')),
    ('brique3_gestions_abonne',              pg_temp.colonne('gestions', 'type_contrat')),
    ('brique3b_quota_avenants',              to_regclass('public.demandes_avenant') is not null),
    -- 3c ne crée rien de nouveau : déduit de 3d, qui le suit.
    ('brique3c_envoi_gestion',               pg_temp.colonne('gestions', 'motif_remplacement')),
    ('brique2g_liste_comptes_admin',         to_regclass('public.admin_comptes') is not null),
    ('brique2h_types_et_precision',          pg_temp.colonne('documents', 'complement')),
    ('brique4_depot_en_masse',               to_regclass('public.documents_remplacements') is not null),
    ('brique5a_paiements',                   to_regclass('public.commandes') is not null),
    ('brique5b_resiliation',                 pg_temp.fonction('appliquer_resiliations')),
    ('brique5d_obligations_legales',         to_regclass('public.retractations') is not null),
    ('brique5e_recommandations',             to_regclass('public.recommandations') is not null),
    ('brique5f_suivi_traitement_quotidien',  to_regclass('public.traitements_quotidiens') is not null),
    ('brique9c_relances',                    to_regclass('public.relances') is not null),
    ('brique3d_cdd_remplacement',            pg_temp.colonne('gestions', 'motif_remplacement')),
    ('brique3e_actions_courriers',           to_regclass('public.signalements') is not null),
    ('brique3f_formulaire_contrat',          pg_temp.fonction('gestion_enregistrer_details')),
    ('brique3g_categories_profil',           pg_temp.colonne('profiles', 'date_naissance')),
    ('brique3h_terminer_gestion_abonne',     pg_temp.fonction('gestion_terminer')),
    ('brique3i_trajet_paternite_reouverture', pg_temp.contrainte('signalements_type_check', 'reouverture')),
    ('brique10_clics_partenaires',           to_regclass('public.clics_partenaires') is not null),
    ('droits_api_explicites',                has_table_privilege('service_role', 'public.profiles', 'SELECT')),
    ('brique11_role_conseiller',             pg_temp.fonction('est_administrateur')),
    ('brique3j_brouillon_sans_abonnement',   exists (select 1 from information_schema.columns
                                                      where table_schema = 'public' and table_name = 'gestions'
                                                        and column_name = 'abonnement_id' and is_nullable = 'YES')),
    ('brique5g_changement_carte',            pg_temp.colonne('abonnements', 'carte_alerte_pour')),
    ('brique12_mesure_tunnel',               to_regclass('public.visites_jour') is not null)
  ) as v(nom, present)
 where present
on conflict (nom) do nothing;

-- 2. Erreurs du site -----------------------------------------------------------
create table if not exists public.erreurs_site (
  empreinte      text primary key,
  chemin         text not null,
  message        text not null,
  nb             integer not null default 1,
  premiere       timestamptz not null default now(),
  derniere       timestamptz not null default now(),
  dernier_email  timestamptz
);

alter table public.erreurs_site enable row level security;
revoke all on public.erreurs_site from anon, authenticated;
grant select on public.erreurs_site to authenticated;
grant all on public.erreurs_site to service_role;
drop policy if exists erreurs_site_equipe on public.erreurs_site;
create policy erreurs_site_equipe on public.erreurs_site
  for select to authenticated using (public.is_admin());

-- Compte l'erreur et répond true s'il faut envoyer l'e-mail (aucun envoyé
-- pour cette erreur depuis une heure). Appelée par le serveur du site.
create or replace function public.signaler_erreur(p_empreinte text, p_chemin text, p_message text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dernier timestamptz;
begin
  insert into public.erreurs_site (empreinte, chemin, message)
  values (left(p_empreinte, 64), left(coalesce(p_chemin, ''), 200), left(coalesce(p_message, ''), 1000))
  on conflict (empreinte) do update
     set nb = public.erreurs_site.nb + 1, derniere = now()
  returning dernier_email into v_dernier;
  if v_dernier is null or v_dernier < now() - interval '1 hour' then
    update public.erreurs_site set dernier_email = now() where empreinte = left(p_empreinte, 64);
    return true;
  end if;
  return false;
end;
$$;

revoke all on function public.signaler_erreur(text, text, text) from public, anon, authenticated;
grant execute on function public.signaler_erreur(text, text, text) to service_role;

insert into public.scripts_sql (nom) values ('brique13_registre_et_erreurs') on conflict (nom) do nothing;
