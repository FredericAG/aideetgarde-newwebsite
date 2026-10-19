-- ============================================================================
-- Brique 9a — notifications sur le téléphone (Web Push)
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique7a.
-- Peut être relancé sans danger.
--
-- Chaque appareil sur lequel un abonné a activé les notifications est
-- enregistré ici (adresse d'envoi fournie par le navigateur + clés de
-- chiffrement). Le contenu des notifications est chiffré de bout en bout :
-- les services d'acheminement (Google, Apple, Mozilla) ne peuvent pas le lire.
-- Un appareil n'est rattaché qu'à UN compte à la fois : le dernier qui a
-- activé les notifications dessus.
-- ============================================================================

create table if not exists public.notifications_push (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  appareil    text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists notifications_push_user_idx on public.notifications_push (user_id);

alter table public.notifications_push enable row level security;
revoke all on public.notifications_push from anon, authenticated;
grant select, delete on public.notifications_push to authenticated;

drop policy if exists notifications_push_select_own on public.notifications_push;
create policy notifications_push_select_own on public.notifications_push
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists notifications_push_delete_own on public.notifications_push;
create policy notifications_push_delete_own on public.notifications_push
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- L'administrateur lit les appareils d'un abonné pour lui envoyer une
-- notification, et supprime ceux qui ne sont plus valides.
drop policy if exists notifications_push_admin_select on public.notifications_push;
create policy notifications_push_admin_select on public.notifications_push
  for select to authenticated
  using (public.is_admin());

drop policy if exists notifications_push_admin_delete on public.notifications_push;
create policy notifications_push_admin_delete on public.notifications_push
  for delete to authenticated
  using (public.is_admin());

-- Enregistrement d'un appareil pour l'utilisateur connecté. Fonction
-- dédiée (plutôt qu'un droit d'écriture direct) : si l'appareil était
-- rattaché à un autre compte (téléphone partagé), il est réattribué au
-- compte connecté, et à lui seul.
create or replace function public.enregistrer_appareil_push(
  p_endpoint text, p_p256dh text, p_auth text, p_appareil text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Connexion requise.';
  end if;
  if p_endpoint !~ '^https://' or length(p_endpoint) > 1000 then
    raise exception 'Adresse de notification invalide.';
  end if;
  delete from public.notifications_push where endpoint = p_endpoint;
  insert into public.notifications_push (user_id, endpoint, p256dh, auth, appareil)
  values ((select auth.uid()), p_endpoint, p_p256dh, p_auth, left(coalesce(p_appareil, ''), 200));
end;
$$;

revoke all on function public.enregistrer_appareil_push(text, text, text, text) from public;
grant execute on function public.enregistrer_appareil_push(text, text, text, text) to authenticated;
