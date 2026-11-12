-- ============================================================================
-- Brique 3h — L'abonné termine lui-même une gestion (07/11/2026)
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique3g. Peut être
-- relancé sans danger.
--
-- Une gestion EN COURS passe en « terminée » à la date du dernier jour de
-- travail (aujourd'hui par défaut, jamais dans le futur ni avant le début du
-- contrat). Sa place est libérée dans l'abonnement ; ses documents restent
-- consultables. Seul l'administrateur peut la rouvrir.
-- ============================================================================

create or replace function public.gestion_terminer(p_id uuid, p_date_fin date default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_debut date;
  v_fin date := coalesce(p_date_fin, current_date);
begin
  select date_debut into v_debut
    from public.gestions
   where id = p_id and employeur_id = (select auth.uid()) and statut = 'en_cours'
   for update;
  if not found then
    raise exception 'Seule une gestion en cours peut être terminée.';
  end if;
  if v_fin > current_date then
    raise exception 'Le dernier jour de travail ne peut pas être dans le futur : terminez la gestion une fois le contrat fini.';
  end if;
  if v_debut is not null and v_fin < v_debut then
    raise exception 'Le dernier jour de travail ne peut pas précéder le début du contrat (%).', to_char(v_debut, 'DD/MM/YYYY');
  end if;
  update public.gestions
     set statut = 'terminee', date_fin = v_fin
   where id = p_id;
end;
$$;

revoke all on function public.gestion_terminer(uuid, date) from public, anon;
grant execute on function public.gestion_terminer(uuid, date) to authenticated;
