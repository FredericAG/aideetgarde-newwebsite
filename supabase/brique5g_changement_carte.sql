-- ============================================================================
-- Brique 5g — Carte qui expire : alerte et changement de carte (13/11/2026)
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique5f. Peut être
-- relancé sans danger.
--
-- 1. L'abonné enregistre une nouvelle carte sans rien payer (commande de
--    type « carte », montant 0) ; l'alias Systempay de son abonnement est
--    remplacé quand la banque a vérifié la carte.
-- 2. Le traitement de chaque matin prévient par e-mail, une seule fois par
--    carte, l'abonné dont la carte expire avant la fin du mois prochain.
-- ============================================================================

-- 1. Commandes de type « carte » (montant 0)
alter table public.commandes drop constraint if exists commandes_type_check;
alter table public.commandes add constraint commandes_type_check
  check (type in ('souscription', 'regularisation', 'carte'));
alter table public.commandes drop constraint if exists commandes_montant_check;
alter table public.commandes add constraint commandes_montant_check
  check (montant > 0 or (type = 'carte' and montant = 0));

-- 2. Alerte envoyée pour quelle date d'expiration (une seule par carte)
alter table public.abonnements add column if not exists carte_alerte_pour date;

-- 3. Résultat d'une commande « carte » (notification, retour du navigateur
--    ou vérification quotidienne). Appelée par le serveur du site seulement.
create or replace function public.systempay_resultat_carte(
  p_order_id    text,
  p_transaction text,
  p_statut      text,
  p_token       text,
  p_carte       text,
  p_expiration  date
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cmd public.commandes%rowtype;
  v_abo uuid;
begin
  select * into v_cmd from public.commandes
   where order_id = p_order_id and type = 'carte'
   for update;
  if not found then
    return 'inconnue';
  end if;
  if v_cmd.statut <> 'en_attente' and v_cmd.statut <> 'refusee' then
    return 'deja_traitee';
  end if;

  if p_statut <> 'PAID' or p_token is null then
    update public.commandes
       set statut = case when p_statut in ('ABANDONED', 'CANCELLED') then 'abandonnee' else 'refusee' end,
           message = left('Carte non enregistrée (' || coalesce(p_statut, '?') || ')', 300),
           traitee_le = now()
     where id = v_cmd.id;
    return 'carte_refusee';
  end if;

  update public.abonnements
     set systempay_token   = p_token,
         carte_masquee     = coalesce(p_carte, carte_masquee),
         carte_expiration  = coalesce(p_expiration, carte_expiration),
         carte_alerte_pour = null
   where employeur_id = v_cmd.employeur_id
     and statut = 'actif'
     and mode_paiement = 'systempay'
  returning id into v_abo;

  if v_abo is null then
    update public.commandes
       set statut = 'a_verifier',
           message = 'Carte vérifiée mais aucun abonnement actif prélevé par le site.',
           traitee_le = now()
     where id = v_cmd.id;
    return 'a_verifier';
  end if;

  update public.commandes
     set statut = 'payee', abonnement_id = v_abo, message = null, traitee_le = now()
   where id = v_cmd.id;
  return 'carte_enregistree';
end;
$$;

revoke all on function public.systempay_resultat_carte(text, text, text, text, text, date) from public, anon, authenticated;
grant execute on function public.systempay_resultat_carte(text, text, text, text, text, date) to service_role;

-- Registre des scripts (brique13) : ce script s'inscrit s'il est déjà en place.
do $$
begin
  if to_regclass('public.scripts_sql') is not null then
    insert into public.scripts_sql (nom) values ('brique5g_changement_carte') on conflict (nom) do nothing;
  end if;
end;
$$;
