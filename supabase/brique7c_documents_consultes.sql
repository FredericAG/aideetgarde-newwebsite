-- ============================================================================
-- Brique 7c — documents « nouveaux » (pas encore téléchargés par l'abonné)
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique7b.
-- Peut être relancé sans danger.
--
-- Un document est « nouveau » tant que l'abonné ne l'a pas téléchargé : il
-- est alors mis en avant (gros bouton de téléchargement en haut des pages).
-- La date du premier téléchargement est aussi visible par l'administrateur.
-- ============================================================================

alter table public.documents add column if not exists consulte_le timestamptz;

-- Seul moyen pour l'abonné de modifier un document : noter qu'il l'a
-- consulté (il n'a aucun autre droit d'écriture sur les documents).
create or replace function public.marquer_document_consulte(p_document_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.documents
     set consulte_le = now()
   where id = p_document_id
     and employeur_id = (select auth.uid())
     and consulte_le is null;
$$;

revoke all on function public.marquer_document_consulte(uuid) from public;
grant execute on function public.marquer_document_consulte(uuid) to authenticated;

-- Les documents existants sont considérés comme déjà vus (pas de fausse
-- alerte « nouveau » sur l'historique).
update public.documents set consulte_le = created_at where consulte_le is null;
