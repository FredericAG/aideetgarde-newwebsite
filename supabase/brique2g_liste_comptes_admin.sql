-- ============================================================================
-- Brique 2g — liste des comptes de l'administration, prête pour des milliers
-- de comptes
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique3c
-- (peut être relancé sans danger ; à relancer après chaque mise à jour :
-- 21/10 tarif et dates d'abonnement, puis 21/10 filtres par colonne, puis
-- 21/10 comptes non confirmés et filtres de l'onglet Abonnements).
--
-- Depuis la mise à jour du 21/10 (paiement et résiliation affichés dans la
-- liste des abonnements), à lancer APRÈS brique5a et brique5b.
--
-- Depuis le 24/10 (événements signalés : fin de contrat, accident, arrêt
-- maladie, comptés dans les actions à effectuer), à lancer APRÈS brique3e.
--
-- 1. Référence client (C00001, C00002…) : attribuée une fois pour toutes,
--    visible de l'administrateur seulement. Elle départage les homonymes au
--    téléphone (« Madame Martin, référence C00412 »), comme AG00001 pour
--    les gestions.
-- 2. Vue `admin_comptes` : une ligne par compte, avec tout ce que la liste
--    affiche (abonnement, nombre de gestions par état, salariés, actions à
--    effectuer, homonymes). Le tri, la recherche et la pagination sont faits
--    par la base : la page reste rapide avec des milliers de comptes, car
--    elle ne charge que les 50 lignes affichées.
--    `security_invoker` : la vue applique les règles d'accès de celui qui
--    l'interroge (l'administrateur voit tout, un abonné ne verrait que sa
--    propre ligne).
-- ============================================================================

-- 1. Référence client ---------------------------------------------------------
create sequence if not exists public.profiles_reference_seq start 1;

alter table public.profiles add column if not exists reference_client text;

do $$
declare
  p record;
begin
  for p in
    select id from public.profiles where reference_client is null order by created_at, id
  loop
    update public.profiles
       set reference_client = 'C' || lpad(nextval('public.profiles_reference_seq')::text, 5, '0')
     where id = p.id;
  end loop;
end;
$$;

alter table public.profiles
  alter column reference_client set default
    ('C' || lpad(nextval('public.profiles_reference_seq')::text, 5, '0'));

create unique index if not exists profiles_reference_client_unique
  on public.profiles (reference_client);

-- 1 bis. Inscriptions non confirmées (mise à jour du 21/10) -------------------
-- Un compte dont l'email n'a jamais été confirmé (lien du mail jamais
-- cliqué, adresse erronée) ne peut pas se connecter : il est rangé à part
-- (« Non confirmés ») au lieu d'encombrer la liste des comptes.
-- La date de confirmation vient de auth.users (inaccessible depuis le
-- site) : elle est recopiée dans profiles et tenue à jour par un trigger.
alter table public.profiles add column if not exists email_confirme_le timestamptz;

update public.profiles p
   set email_confirme_le = u.email_confirmed_at
  from auth.users u
 where u.id = p.id
   and p.email_confirme_le is distinct from u.email_confirmed_at;

create or replace function public.recopier_confirmation_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set email_confirme_le = new.email_confirmed_at
   where id = new.id
     and email_confirme_le is distinct from new.email_confirmed_at;
  return new;
end;
$$;
revoke all on function public.recopier_confirmation_email() from public, anon, authenticated;

-- Nom en « z… » : passe après le trigger qui crée le profil à l'inscription
-- (les triggers d'un même moment s'exécutent par ordre alphabétique).
drop trigger if exists zz_recopier_confirmation_email on auth.users;
create trigger zz_recopier_confirmation_email
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.recopier_confirmation_email();

-- 2. Index utiles au calcul des compteurs --------------------------------------
create index if not exists gestions_employeur_statut_idx on public.gestions (employeur_id, statut);
create index if not exists declarations_employeur_statut_idx on public.declarations_mensuelles (employeur_id, statut);
create index if not exists demandes_avenant_employeur_statut_idx on public.demandes_avenant (employeur_id, statut);
create index if not exists signalements_employeur_statut_idx on public.signalements (employeur_id, statut);
create index if not exists abonnements_employeur_idx on public.abonnements (employeur_id);

-- 3. Vue de la liste des comptes ------------------------------------------------
-- Texte « simplifié » pour la recherche : minuscules et sans accents
-- (é → e…), pour qu'« helene » trouve « Hélène ».
create or replace function public.texte_recherche(t text)
returns text
language sql
immutable
set search_path = ''
as $$
  select translate(lower(coalesce(t, '')),
    'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæ',
    'aaaaaaceeeeiiiinooooouuuuyyoa');
$$;

-- Colonne des CDD de remplacement (brique 3d), créée ici aussi pour que ce
-- script fonctionne même s'il est lancé avant brique3d.
alter table public.gestions add column if not exists remplace_gestion_id uuid
  references public.gestions(id) on delete set null;

drop view if exists public.admin_abonnements_resume;
drop view if exists public.admin_comptes_resume;
drop view if exists public.admin_comptes;
create view public.admin_comptes
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
where p.role <> 'admin';

revoke all on public.admin_comptes from anon;
grant select on public.admin_comptes to authenticated;

-- Compteurs des onglets (un seul aller-retour pour toute la liste).
create view public.admin_comptes_resume
with (security_invoker = true)
as
select categorie, count(*) as nb_comptes, sum(nb_actions) as nb_actions
  from public.admin_comptes
 group by categorie;

revoke all on public.admin_comptes_resume from anon;
grant select on public.admin_comptes_resume to authenticated;

-- Chiffres clés de l'onglet « Abonnements ».
create view public.admin_abonnements_resume
with (security_invoker = true)
as
select
  count(*) filter (where abonnement_statut = 'actif')                          as nb_actifs,
  coalesce(sum(tarif_mensuel) filter (where abonnement_statut = 'actif'), 0)  as total_mensuel,
  coalesce(sum(places_utilisees) filter (where abonnement_statut = 'actif'), 0) as places_utilisees,
  coalesce(sum(quota) filter (where abonnement_statut = 'actif'), 0)          as places_totales,
  count(*) filter (where quota_depasse)                                         as nb_depassement,
  count(*) filter (where categorie = 'a_surveiller')                            as nb_sans_gestion,
  count(*) filter (where abonnement_statut = 'resilie')                         as nb_resilies
from public.admin_comptes;

revoke all on public.admin_abonnements_resume from anon;
grant select on public.admin_abonnements_resume to authenticated;
