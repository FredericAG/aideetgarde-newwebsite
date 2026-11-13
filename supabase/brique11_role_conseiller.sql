-- ============================================================================
-- Brique 11 — Rôle « conseiller » (13/11/2026)
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique3i. Peut être
-- relancé sans danger.
--
-- Deux niveaux dans l'administration :
-- - « admin » (Frédéric) : tout ;
-- - « conseiller » : tout voir, valider, déposer, relancer, exporter ; PAS
--   de suppression (gestion, document, fichier, déclaration), PAS de
--   création ni de modification d'abonnement (tarif, résiliation).
--
-- public.is_admin() devient « membre de l'équipe » (admin ou conseiller) :
-- toutes les règles existantes s'appliquent donc aux conseillers. Les
-- actions réservées passent par public.est_administrateur() (admin seul).
--
-- Donner le rôle à un conseiller (son compte doit déjà exister) :
--   update public.profiles set role = 'conseiller' where email = 'prenom@aideetgarde.fr';
-- Le retirer :
--   update public.profiles set role = 'employeur' where email = 'prenom@aideetgarde.fr';
-- ============================================================================

-- 1. Le rôle existe
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('employeur', 'salarie', 'admin', 'conseiller'));

-- 2. Équipe (admin ou conseiller) et administrateur seul
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('admin', 'conseiller')
  );
$$;

create or replace function public.est_administrateur()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function public.est_administrateur() from public;
grant execute on function public.est_administrateur() to authenticated;

-- 3. Abonnements : l'équipe lit, seul l'administrateur écrit (tarif,
--    création, résiliation).
drop policy if exists abonnements_admin_all on public.abonnements;
drop policy if exists abonnements_equipe_lecture on public.abonnements;
create policy abonnements_equipe_lecture on public.abonnements
  for select to authenticated
  using (public.is_admin());
drop policy if exists abonnements_admin_ecriture on public.abonnements;
create policy abonnements_admin_ecriture on public.abonnements
  for all to authenticated
  using (public.est_administrateur()) with check (public.est_administrateur());

-- 4. Gestions, documents, déclarations, fichiers : l'équipe lit et écrit,
--    seul l'administrateur supprime.
drop policy if exists gestions_admin_all on public.gestions;
drop policy if exists gestions_equipe_lecture on public.gestions;
create policy gestions_equipe_lecture on public.gestions
  for select to authenticated using (public.is_admin());
drop policy if exists gestions_equipe_ajout on public.gestions;
create policy gestions_equipe_ajout on public.gestions
  for insert to authenticated with check (public.is_admin());
drop policy if exists gestions_equipe_maj on public.gestions;
create policy gestions_equipe_maj on public.gestions
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists gestions_admin_suppression on public.gestions;
create policy gestions_admin_suppression on public.gestions
  for delete to authenticated using (public.est_administrateur());

drop policy if exists documents_admin_all on public.documents;
drop policy if exists documents_equipe_lecture on public.documents;
create policy documents_equipe_lecture on public.documents
  for select to authenticated using (public.is_admin());
drop policy if exists documents_equipe_ajout on public.documents;
create policy documents_equipe_ajout on public.documents
  for insert to authenticated with check (public.is_admin());
drop policy if exists documents_equipe_maj on public.documents;
create policy documents_equipe_maj on public.documents
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists documents_admin_suppression on public.documents;
create policy documents_admin_suppression on public.documents
  for delete to authenticated using (public.est_administrateur());

drop policy if exists declarations_admin_delete on public.declarations_mensuelles;
create policy declarations_admin_delete on public.declarations_mensuelles
  for delete to authenticated using (public.est_administrateur());

drop policy if exists documents_fichiers_admin on storage.objects;
drop policy if exists documents_fichiers_equipe_lecture on storage.objects;
create policy documents_fichiers_equipe_lecture on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and public.is_admin());
drop policy if exists documents_fichiers_equipe_depot on storage.objects;
create policy documents_fichiers_equipe_depot on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and public.is_admin());
drop policy if exists documents_fichiers_equipe_maj on storage.objects;
create policy documents_fichiers_equipe_maj on storage.objects
  for update to authenticated
  using (bucket_id = 'documents' and public.is_admin())
  with check (bucket_id = 'documents' and public.is_admin());
drop policy if exists documents_fichiers_admin_suppression on storage.objects;
create policy documents_fichiers_admin_suppression on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and public.est_administrateur());

-- 5. La liste des comptes n'affiche pas l'équipe
create or replace view public.admin_comptes
with (security_invoker = true)
as
select
  p.id,
  p.reference_client,
  p.prenom,
  p.nom,
  p.email,
  p.telephone,
  p.code_postal,
  p.ville,
  p.role,
  p.created_at,
  -- Tri alphabétique sans tenir compte des accents ni des majuscules.
  public.texte_recherche(trim(p.nom) || ' ' || trim(p.prenom)) as nom_tri,
  -- Filtres par colonne de la liste (mise à jour du 21/10) : texte simplifié
  -- de la colonne Employeur (nom, prénom, email, ville) et des salariés.
  public.texte_recherche(concat_ws(' ', p.prenom, p.nom, p.email, p.code_postal, p.ville)) as employeur_tri,
  public.texte_recherche(g.salaries) as salaries_tri,
  abo.statut          as abonnement_statut,
  abo.quota_gestions  as quota,
  abo.tarif_mensuel   as tarif_mensuel,
  abo.date_debut      as abonnement_debut,
  abo.date_fin        as abonnement_fin,
  -- Paiement et résiliation (briques 5a et 5b).
  abo.mode_paiement,
  abo.statut_paiement,
  abo.prochaine_echeance,
  abo.fin_prevue,
  abo.quota_gestions - coalesce(g.places, 0) as places_restantes,
  p.email_confirme_le,
  coalesce(g.en_cours, 0)   as nb_en_cours,
  coalesce(g.envoyees, 0)   as nb_envoyees,
  coalesce(g.brouillons, 0) as nb_brouillons,
  coalesce(g.terminees, 0)  as nb_terminees,
  coalesce(g.salaries, '')  as salaries,
  coalesce(g.places, 0) as places_utilisees,
  (abo.statut = 'actif'
   and coalesce(g.places, 0) > abo.quota_gestions) as quota_depasse,
  coalesce(g.envoyees, 0) + coalesce(d.nb, 0) + coalesce(av.nb, 0) + coalesce(sg.nb, 0) as nb_actions,
  -- Catégorie de suivi :
  --  actif       : au moins une gestion en cours ou en attente de validation
  --  a_surveiller: abonnement actif mais aucune gestion en cours ni en
  --                attente (abonnement payé pour rien ?)
  --  non_confirme: inscription dont l'email n'a jamais été confirmé
  --  inactif     : ni gestion en cours ou en attente, ni abonnement actif
  case
    when coalesce(g.en_cours, 0) + coalesce(g.envoyees, 0) > 0 then 'actif'
    when abo.statut = 'actif' then 'a_surveiller'
    when p.email_confirme_le is null then 'non_confirme'
    else 'inactif'
  end as categorie,
  -- Nombre de comptes portant exactement le même prénom et le même nom.
  count(*) over (
    partition by public.texte_recherche(trim(p.nom)), public.texte_recherche(trim(p.prenom))
  ) as nb_homonymes,
  public.texte_recherche(
    concat_ws(' ', p.reference_client, p.prenom, p.nom, p.email, p.ville, p.code_postal,
              p.telephone, g.salaries, g.references)
  ) as recherche
from public.profiles p
left join lateral (
  select a.statut, a.quota_gestions, a.tarif_mensuel, a.date_debut, a.date_fin,
         a.mode_paiement, a.statut_paiement, a.prochaine_echeance, a.fin_prevue
    from public.abonnements a
   where a.employeur_id = p.id
   order by (a.statut = 'actif') desc, a.date_debut desc
   limit 1
) abo on true
left join lateral (
  select
    count(*) filter (where statut = 'en_cours')  as en_cours,
    count(*) filter (where statut = 'envoyee')   as envoyees,
    count(*) filter (where statut = 'brouillon') as brouillons,
    count(*) filter (where statut = 'terminee')  as terminees,
    -- Places occupées : les CDD de remplacement n'en prennent pas (brique 3d).
    count(*) filter (where statut in ('en_cours', 'envoyee') and remplace_gestion_id is null) as places,
    string_agg(nullif(trim(prenom_salarie || ' ' || nom_salarie), ''), ', '
               order by (statut in ('en_cours', 'envoyee')) desc, nom_salarie)
      filter (where statut <> 'brouillon' or nom_salarie <> '') as salaries,
    string_agg(reference, ' ') as references
  from public.gestions
  where employeur_id = p.id
) g on true
left join lateral (
  select count(*) as nb from public.declarations_mensuelles
   where employeur_id = p.id and statut in ('envoyee', 'modification')
) d on true
left join lateral (
  select count(*) as nb from public.demandes_avenant
   where employeur_id = p.id and statut = 'envoyee'
) av on true
left join lateral (
  select count(*) as nb from public.signalements
   where employeur_id = p.id and statut = 'envoyee'
) sg on true
where p.role not in ('admin', 'conseiller');

-- Registre des scripts (brique13) : ce script s'inscrit s'il est déjà en place.
do $$
begin
  if to_regclass('public.scripts_sql') is not null then
    insert into public.scripts_sql (nom) values ('brique11_role_conseiller') on conflict (nom) do nothing;
  end if;
end;
$$;
