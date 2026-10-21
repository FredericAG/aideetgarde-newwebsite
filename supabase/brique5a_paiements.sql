-- ============================================================================
-- Brique 5a — paiement Systempay (souscription en ligne, échéances
-- mensuelles, refus et régularisation)
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique2g.
-- Peut être relancé sans danger.
--
-- Principe retenu (voir docs/specifications-fonctionnelles.md § 3) :
--
--  1. La souscription se fait sur le site : l'abonné choisit sa formule et
--     paie le premier mois par carte dans le formulaire Systempay intégré à
--     la page (authentification forte 3-D Secure). Systempay enregistre la
--     carte sous forme d'« alias » (un jeton, jamais le numéro de carte).
--  2. Chaque mois, c'est LE SITE qui déclenche l'échéance (paiement sans
--     interaction avec l'alias, réponse immédiate de Systempay). Il ne
--     dépend donc plus d'une notification de Systempay pour savoir si un
--     mois est payé : c'est la cause du décalage historique entre les
--     prélèvements et les comptes de l'ancien site.
--  3. Une échéance refusée est retentée automatiquement 3 et 7 jours plus
--     tard. Après 3 refus, elle est « impayée » : l'abonné peut la régler en
--     ligne avec une nouvelle carte, l'administrateur la voit dans l'onglet
--     Abonnements.
--
-- Toutes les écritures liées au paiement passent par les fonctions
-- ci-dessous, exécutables seulement par le serveur du site (rôle
-- service_role, clé secrète Supabase). Un abonné ne peut ni créer ni
-- modifier un paiement, même en trafiquant son navigateur ; il ne fait que
-- lire les siens.
-- ============================================================================

-- 1. Abonnements : informations de paiement -----------------------------------
alter table public.abonnements
  add column if not exists mode_paiement     text not null default 'manuel',
  add column if not exists systempay_token   text,
  add column if not exists carte_masquee     text,
  add column if not exists carte_expiration  date,
  add column if not exists jour_prelevement  smallint,
  add column if not exists prochaine_echeance date,
  add column if not exists statut_paiement   text not null default 'a_jour';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'abonnements_mode_paiement_check') then
    alter table public.abonnements add constraint abonnements_mode_paiement_check
      check (mode_paiement in ('manuel', 'systempay'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'abonnements_statut_paiement_check') then
    alter table public.abonnements add constraint abonnements_statut_paiement_check
      check (statut_paiement in ('a_jour', 'en_retard', 'impaye'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'abonnements_jour_prelevement_check') then
    alter table public.abonnements add constraint abonnements_jour_prelevement_check
      check (jour_prelevement between 1 and 28);
  end if;
end;
$$;

comment on column public.abonnements.mode_paiement is
  'manuel : abonnement saisi par l''administrateur, jamais prélevé par le site (données de test, anciens abonnés avant reprise). systempay : prélevé chaque mois par le site.';

create index if not exists abonnements_prochaine_echeance_idx
  on public.abonnements (prochaine_echeance)
  where statut = 'actif' and mode_paiement = 'systempay';

-- 2. Commandes : une tentative de souscription ou de régularisation ---------
-- Créée quand l'abonné ouvre le formulaire de paiement. Sa référence
-- (order_id) est transmise à Systempay et revient dans chaque réponse.
create table if not exists public.commandes (
  id            uuid primary key default gen_random_uuid(),
  order_id      text not null unique,
  employeur_id  uuid not null references public.profiles(id) on delete cascade,
  type          text not null check (type in ('souscription', 'regularisation')),
  quota         integer check (quota > 0),
  tarif_mensuel numeric(6, 2),
  montant       numeric(8, 2) not null check (montant > 0),
  echeance_id   uuid,
  statut        text not null default 'en_attente'
                  check (statut in ('en_attente', 'payee', 'refusee', 'abandonnee', 'a_verifier')),
  abonnement_id uuid references public.abonnements(id) on delete set null,
  message       text,
  mode          text not null check (mode in ('TEST', 'PRODUCTION')),
  created_at    timestamptz not null default now(),
  traitee_le    timestamptz
);

create index if not exists commandes_employeur_idx on public.commandes (employeur_id, created_at desc);
create index if not exists commandes_en_attente_idx on public.commandes (created_at) where statut = 'en_attente';

-- 3. Échéances : un mois d'abonnement à encaisser ----------------------------
create table if not exists public.echeances (
  id                  uuid primary key default gen_random_uuid(),
  abonnement_id       uuid not null references public.abonnements(id) on delete cascade,
  employeur_id        uuid not null references public.profiles(id) on delete cascade,
  date_echeance       date not null,
  montant             numeric(8, 2) not null check (montant > 0),
  statut              text not null default 'a_payer'
                        check (statut in ('a_payer', 'payee', 'impayee', 'annulee')),
  tentatives          integer not null default 0,
  prochaine_tentative date not null,
  -- Rempli pendant l'appel à Systempay : empêche deux traitements simultanés
  -- et signale un résultat inconnu (coupure réseau) à vérifier avant de
  -- retenter, pour ne jamais débiter deux fois.
  en_cours_depuis     timestamptz,
  order_id            text not null unique,
  derniere_erreur     text,
  payee_le            timestamptz,
  created_at          timestamptz not null default now(),
  unique (abonnement_id, date_echeance)
);

create index if not exists echeances_a_traiter_idx
  on public.echeances (prochaine_tentative) where statut = 'a_payer';
create index if not exists echeances_employeur_idx on public.echeances (employeur_id, date_echeance desc);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'commandes_echeance_fk') then
    alter table public.commandes add constraint commandes_echeance_fk
      foreign key (echeance_id) references public.echeances(id) on delete set null;
  end if;
end;
$$;

-- 4. Paiements : chaque transaction Systempay, telle que reçue ----------------
-- transaction_uuid est unique : une notification reçue deux fois (ou une
-- réponse reçue à la fois par la notification et par le retour du
-- navigateur) n'est enregistrée qu'une fois.
create table if not exists public.paiements (
  id               uuid primary key default gen_random_uuid(),
  transaction_uuid text not null unique,
  order_id         text not null,
  employeur_id     uuid references public.profiles(id) on delete set null,
  abonnement_id    uuid references public.abonnements(id) on delete set null,
  commande_id      uuid references public.commandes(id) on delete set null,
  echeance_id      uuid references public.echeances(id) on delete set null,
  montant          numeric(8, 2) not null,
  statut           text not null,           -- PAID, UNPAID, RUNNING…
  statut_detaille  text,                    -- AUTHORISED, REFUSED…
  code_erreur      text,
  carte_masquee    text,
  mode             text not null check (mode in ('TEST', 'PRODUCTION')),
  source           text not null check (source in ('ipn', 'retour', 'echeance', 'reconciliation')),
  created_at       timestamptz not null default now()
);

create index if not exists paiements_employeur_idx on public.paiements (employeur_id, created_at desc);
create index if not exists paiements_order_idx on public.paiements (order_id);

-- 5. Droits ------------------------------------------------------------------
alter table public.commandes enable row level security;
alter table public.echeances enable row level security;
alter table public.paiements enable row level security;

revoke all on public.commandes, public.echeances, public.paiements from anon, authenticated;
grant select on public.commandes, public.echeances, public.paiements to authenticated;
grant all on public.commandes, public.echeances, public.paiements to service_role;

drop policy if exists commandes_select on public.commandes;
create policy commandes_select on public.commandes for select to authenticated
  using (employeur_id = (select auth.uid()) or public.is_admin());

drop policy if exists echeances_select on public.echeances;
create policy echeances_select on public.echeances for select to authenticated
  using (employeur_id = (select auth.uid()) or public.is_admin());

drop policy if exists paiements_select on public.paiements;
create policy paiements_select on public.paiements for select to authenticated
  using (employeur_id = (select auth.uid()) or public.is_admin());

-- 6. Calendrier ----------------------------------------------------------------
-- Première date strictement après `d` qui tombe le jour `jour` du mois
-- (jour limité à 28 pour exister tous les mois).
create or replace function public.date_echeance_suivante(d date, jour integer)
returns date
language sql
immutable
set search_path = ''
as $$
  select case
    when make_date(extract(year from d)::int, extract(month from d)::int, jour) > d
      then make_date(extract(year from d)::int, extract(month from d)::int, jour)
    else (make_date(extract(year from d)::int, extract(month from d)::int, jour)
          + interval '1 month')::date
  end;
$$;

-- Statut de paiement de l'abonnement, recalculé à partir de ses échéances.
create or replace function public.recalculer_statut_paiement(p_abonnement uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.abonnements a
     set statut_paiement = case
       when exists (select 1 from public.echeances e
                     where e.abonnement_id = a.id and e.statut = 'impayee') then 'impaye'
       when exists (select 1 from public.echeances e
                     where e.abonnement_id = a.id and e.statut = 'a_payer' and e.tentatives > 0) then 'en_retard'
       else 'a_jour'
     end
   where a.id = p_abonnement;
end;
$$;

-- 7. Résultat d'une commande (premier paiement ou régularisation) ----------------
-- Appelée par la notification Systempay, par le retour du navigateur et par
-- la vérification quotidienne : le verrou « for update » garantit qu'une
-- commande n'est traitée qu'une fois, même si les trois arrivent ensemble.
create or replace function public.systempay_resultat_commande(
  p_order_id        text,
  p_transaction     text,
  p_statut          text,      -- statut de la commande Systempay : PAID, UNPAID, ABANDONED…
  p_statut_detaille text,
  p_code_erreur     text,
  p_montant         numeric,
  p_token           text,
  p_carte           text,
  p_expiration      date,
  p_mode            text,
  p_source          text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cmd   public.commandes%rowtype;
  v_abo   uuid;
  v_jour  integer := least(extract(day from current_date)::int, 28);
  v_actif public.abonnements%rowtype;
begin
  select * into v_cmd from public.commandes where order_id = p_order_id for update;
  if not found then
    return 'commande_inconnue';
  end if;

  if p_transaction is not null then
    insert into public.paiements (transaction_uuid, order_id, employeur_id, commande_id,
                                  echeance_id, montant, statut, statut_detaille, code_erreur,
                                  carte_masquee, mode, source)
    values (p_transaction, p_order_id, v_cmd.employeur_id, v_cmd.id, v_cmd.echeance_id,
            p_montant, p_statut, p_statut_detaille, p_code_erreur, p_carte, p_mode, p_source)
    on conflict (transaction_uuid) do update
      set statut = excluded.statut,
          statut_detaille = excluded.statut_detaille,
          code_erreur = excluded.code_erreur;
  end if;

  if v_cmd.statut in ('payee', 'a_verifier') then
    return 'deja_traitee';
  end if;

  if p_statut <> 'PAID' then
    -- Refus ou abandon : l'abonné peut réessayer avec le même formulaire
    -- (tant que Systempay garde la commande ouverte) ou en rouvrir un.
    update public.commandes
       set statut = case when p_statut = 'ABANDONED' then 'abandonnee' else 'refusee' end,
           message = coalesce(p_code_erreur, p_statut_detaille, p_statut),
           traitee_le = now()
     where id = v_cmd.id;
    return 'refusee';
  end if;

  -- Montant payé différent du montant attendu : on n'active rien, on
  -- signale à l'administrateur.
  if p_montant is distinct from v_cmd.montant then
    update public.commandes
       set statut = 'a_verifier',
           message = format('Montant payé %s € différent du montant attendu %s €.', p_montant, v_cmd.montant),
           traitee_le = now()
     where id = v_cmd.id;
    return 'a_verifier';
  end if;

  if v_cmd.type = 'souscription' then
    select * into v_actif from public.abonnements
     where employeur_id = v_cmd.employeur_id and statut = 'actif';
    if found then
      -- Deux paiements de souscription (deux onglets ouverts…) : le second
      -- est à rembourser par l'administrateur.
      update public.commandes
         set statut = 'a_verifier',
             message = 'Paiement reçu alors qu''un abonnement est déjà actif : à rembourser.',
             abonnement_id = v_actif.id,
             traitee_le = now()
       where id = v_cmd.id;
      return 'a_verifier';
    end if;

    begin
      insert into public.abonnements (employeur_id, statut, quota_gestions, tarif_mensuel,
                                      date_debut, mode_paiement, systempay_token,
                                      carte_masquee, carte_expiration, jour_prelevement,
                                      prochaine_echeance, statut_paiement)
      values (v_cmd.employeur_id, 'actif', v_cmd.quota, v_cmd.tarif_mensuel,
              current_date, 'systempay', p_token, p_carte, p_expiration, v_jour,
              public.date_echeance_suivante(current_date, v_jour), 'a_jour')
      returning id into v_abo;
    exception when others then
      update public.commandes
         set statut = 'a_verifier',
             message = 'Paiement reçu mais abonnement non créé : ' || sqlerrm,
             traitee_le = now()
       where id = v_cmd.id;
      return 'a_verifier';
    end;

    update public.commandes
       set statut = 'payee', abonnement_id = v_abo, message = null, traitee_le = now()
     where id = v_cmd.id;
    update public.paiements set abonnement_id = v_abo where order_id = p_order_id;
    return 'abonnement_cree';
  end if;

  -- Régularisation d'une échéance impayée, avec une nouvelle carte.
  update public.echeances
     set statut = 'payee', payee_le = now(), derniere_erreur = null, en_cours_depuis = null
   where id = v_cmd.echeance_id
     and statut in ('a_payer', 'impayee')
  returning abonnement_id into v_abo;

  if v_abo is null then
    update public.commandes
       set statut = 'a_verifier',
           message = 'Échéance déjà réglée ou introuvable : paiement à rembourser.',
           traitee_le = now()
     where id = v_cmd.id;
    return 'a_verifier';
  end if;

  update public.abonnements
     set systempay_token  = coalesce(p_token, systempay_token),
         carte_masquee    = coalesce(p_carte, carte_masquee),
         carte_expiration = coalesce(p_expiration, carte_expiration)
   where id = v_abo;
  perform public.recalculer_statut_paiement(v_abo);

  update public.commandes
     set statut = 'payee', abonnement_id = v_abo, message = null, traitee_le = now()
   where id = v_cmd.id;
  update public.paiements set abonnement_id = v_abo where order_id = p_order_id;
  return 'echeance_reglee';
end;
$$;

-- 8. Échéances mensuelles -----------------------------------------------------------
-- (a) Crée les échéances arrivées à terme des abonnements prélevés par le
--     site (une ligne par mois, jamais deux pour le même mois), sauf pour un
--     abonnement déjà impayé : on n'empile pas les refus, l'administrateur
--     décide.
-- (b) Renvoie les échéances à encaisser aujourd'hui et les réserve (champ
--     en_cours_depuis) pour qu'un second passage simultané ne les reprenne
--     pas. Une échéance restée réservée plus de 30 minutes (coupure pendant
--     l'appel) est renvoyée avec incertaine = true : le serveur interroge
--     alors Systempay avant de retenter.
create or replace function public.systempay_echeances_a_traiter(p_limite integer default 500)
returns table (
  echeance_id   uuid,
  order_id      text,
  montant       numeric,
  token         text,
  employeur_id  uuid,
  email         text,
  reference     text,
  incertaine    boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  a record;
begin
  for a in
    select * from public.abonnements
     where statut = 'actif'
       and mode_paiement = 'systempay'
       and statut_paiement <> 'impaye'
       and prochaine_echeance <= current_date
     for update skip locked
  loop
    -- Rattrape aussi plusieurs mois si le traitement a été interrompu.
    while a.prochaine_echeance <= current_date loop
      insert into public.echeances (abonnement_id, employeur_id, date_echeance, montant,
                                    prochaine_tentative, order_id)
      values (a.id, a.employeur_id, a.prochaine_echeance, a.tarif_mensuel, a.prochaine_echeance,
              'E' || to_char(a.prochaine_echeance, 'YYYYMMDD') || '-' || replace(a.id::text, '-', ''))
      on conflict (abonnement_id, date_echeance) do nothing;
      a.prochaine_echeance := public.date_echeance_suivante(a.prochaine_echeance, a.jour_prelevement);
    end loop;
    update public.abonnements set prochaine_echeance = a.prochaine_echeance where id = a.id;
  end loop;

  return query
  with choisies as (
    select e.id, (e.en_cours_depuis is not null) as incertaine
      from public.echeances e
      join public.abonnements ab on ab.id = e.abonnement_id
     where e.statut = 'a_payer'
       and e.prochaine_tentative <= current_date
       and ab.statut = 'actif'            -- abonnement résilié : plus aucun débit
       and ab.mode_paiement = 'systempay'
       and ab.systempay_token is not null
       and (e.en_cours_depuis is null or e.en_cours_depuis < now() - interval '30 minutes')
     order by e.prochaine_tentative, e.date_echeance
     limit p_limite
     for update of e skip locked
  ), reservees as (
    update public.echeances e
       set en_cours_depuis = now()
      from choisies c
     where e.id = c.id
    returning e.id, e.order_id, e.montant, e.abonnement_id, e.employeur_id, c.incertaine
  )
  select r.id, r.order_id, r.montant, ab.systempay_token, r.employeur_id, p.email,
         coalesce(p.reference_client, r.employeur_id::text), r.incertaine
    from reservees r
    join public.abonnements ab on ab.id = r.abonnement_id
    join public.profiles p on p.id = r.employeur_id;
end;
$$;

-- Résultat de l'encaissement d'une échéance.
--  p_statut : PAID (payée), UNPAID (refusée), INCONNU (pas de réponse :
--  l'échéance reste réservée et sera vérifiée au prochain passage).
-- Renvoie : payee, refusee_retentee (avec la date de la prochaine
-- tentative), impayee, inconnu ou deja_traitee.
create or replace function public.systempay_resultat_echeance(
  p_echeance        uuid,
  p_transaction     text,
  p_statut          text,
  p_statut_detaille text,
  p_code_erreur     text,
  p_montant         numeric,
  p_carte           text,
  p_mode            text,
  p_source          text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_e    public.echeances%rowtype;
  v_suite date;
begin
  select * into v_e from public.echeances where id = p_echeance for update;
  if not found then
    return 'echeance_inconnue';
  end if;

  if p_transaction is not null then
    insert into public.paiements (transaction_uuid, order_id, employeur_id, abonnement_id,
                                  echeance_id, montant, statut, statut_detaille, code_erreur,
                                  carte_masquee, mode, source)
    values (p_transaction, v_e.order_id, v_e.employeur_id, v_e.abonnement_id, v_e.id,
            p_montant, p_statut, p_statut_detaille, p_code_erreur, p_carte, p_mode, p_source)
    on conflict (transaction_uuid) do nothing;
  end if;

  if v_e.statut <> 'a_payer' then
    return 'deja_traitee';
  end if;

  if p_statut = 'INCONNU' then
    update public.echeances set derniere_erreur = p_code_erreur where id = v_e.id;
    return 'inconnu';
  end if;

  if p_statut = 'PAID' then
    update public.echeances
       set statut = 'payee', payee_le = now(), en_cours_depuis = null,
           tentatives = tentatives + 1, derniere_erreur = null
     where id = v_e.id;
    perform public.recalculer_statut_paiement(v_e.abonnement_id);
    return 'payee';
  end if;

  -- Refus : nouvelle tentative 3 jours puis 7 jours après l'échéance.
  if v_e.tentatives + 1 >= 3 then
    update public.echeances
       set statut = 'impayee', en_cours_depuis = null, tentatives = tentatives + 1,
           derniere_erreur = coalesce(p_code_erreur, p_statut_detaille, p_statut)
     where id = v_e.id;
    perform public.recalculer_statut_paiement(v_e.abonnement_id);
    return 'impayee';
  end if;

  v_suite := greatest(current_date + 1,
                      v_e.date_echeance + case when v_e.tentatives = 0 then 3 else 7 end);
  update public.echeances
     set en_cours_depuis = null, tentatives = tentatives + 1, prochaine_tentative = v_suite,
         derniere_erreur = coalesce(p_code_erreur, p_statut_detaille, p_statut)
   where id = v_e.id;
  perform public.recalculer_statut_paiement(v_e.abonnement_id);
  return 'refusee_retentee:' || to_char(v_suite, 'YYYY-MM-DD');
end;
$$;

-- Seul le serveur du site (clé secrète) peut appeler ces fonctions.
revoke all on function public.systempay_resultat_commande(text, text, text, text, text, numeric, text, text, date, text, text) from public, anon, authenticated;
revoke all on function public.systempay_echeances_a_traiter(integer) from public, anon, authenticated;
revoke all on function public.systempay_resultat_echeance(uuid, text, text, text, text, numeric, text, text, text) from public, anon, authenticated;
revoke all on function public.recalculer_statut_paiement(uuid) from public, anon, authenticated;
grant execute on function public.systempay_resultat_commande(text, text, text, text, text, numeric, text, text, date, text, text) to service_role;
grant execute on function public.systempay_echeances_a_traiter(integer) to service_role;
grant execute on function public.systempay_resultat_echeance(uuid, text, text, text, text, numeric, text, text, text) to service_role;
grant execute on function public.recalculer_statut_paiement(uuid) to service_role;

-- 9. Encaissements par mois (onglet Abonnements de l'administration) ------------
create or replace view public.admin_encaissements_mois
with (security_invoker = true)
as
select
  date_trunc('month', created_at)::date                   as mois,
  mode,
  coalesce(sum(montant) filter (where statut = 'PAID'), 0) as encaisse,
  count(*) filter (where statut = 'PAID')                   as nb_payes,
  count(*) filter (where statut <> 'PAID')                  as nb_refus
from public.paiements
group by 1, 2;

revoke all on public.admin_encaissements_mois from anon;
grant select on public.admin_encaissements_mois to authenticated;
