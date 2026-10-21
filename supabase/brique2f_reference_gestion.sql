-- ============================================================================
-- Brique 2f — référence unique et définitive de chaque gestion
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique2e.
-- Peut être relancé sans danger.
--
-- Chaque gestion reçoit une référence courte et lisible (AG00001, AG00002...)
-- attribuée automatiquement et qui ne change JAMAIS, même si le salarié ou
-- l'employeur change de nom. Elle sert :
--   - au rangement automatique des PDF déposés en masse : les noms de
--     fichiers commencent par cette référence (ex. AG00123_BPG_2605.pdf) ;
--   - aux échanges avec l'abonné (téléphone, email) : elle est affichée
--     dans son espace.
-- ============================================================================

create sequence if not exists public.gestions_reference_seq start 1;
-- Droit explicite d'utiliser la séquence (numéro AG00001 attribué quand
-- l'administrateur crée une gestion) : Supabase ne l'accorde plus d'office
-- aux nouveaux objets à partir du 30/10/2026.
grant usage, select on sequence public.gestions_reference_seq to authenticated, service_role;

alter table public.gestions add column if not exists reference text;

-- Références des gestions déjà créées, dans l'ordre de création.
do $$
declare
  g record;
begin
  for g in
    select id from public.gestions where reference is null order by created_at, id
  loop
    update public.gestions
      set reference = 'AG' || lpad(nextval('public.gestions_reference_seq')::text, 5, '0')
      where id = g.id;
  end loop;
end;
$$;

alter table public.gestions
  alter column reference set default
    ('AG' || lpad(nextval('public.gestions_reference_seq')::text, 5, '0'));
alter table public.gestions alter column reference set not null;

create unique index if not exists gestions_reference_unique
  on public.gestions (reference);

-- La référence ne peut pas être modifiée une fois attribuée.
create or replace function public.gestions_reference_immuable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.reference is distinct from old.reference then
    raise exception 'La référence d''une gestion ne peut pas être modifiée.';
  end if;
  return new;
end;
$$;

drop trigger if exists gestions_reference_immuable on public.gestions;
create trigger gestions_reference_immuable
  before update of reference on public.gestions
  for each row execute function public.gestions_reference_immuable();
