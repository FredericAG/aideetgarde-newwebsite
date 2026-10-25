-- ============================================================================
-- Brique 3f — Formulaire « Créer une gestion » enrichi (version 1, 25/10/2026)
--
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS brique3e. Peut être
-- relancé sans danger.
--
-- Les champs complémentaires du contrat (date de naissance, nationalité,
-- horaires, congés, avantages…) sont décrits dans src/lib/contrat/champs.ts
-- et enregistrés ensemble dans la colonne `config` (JSON) de la gestion,
-- qui existe depuis la brique 2 : en ajouter un ne demande aucun script.
-- Les coordonnées du salarié vont dans leurs colonnes (brique 3e), lues par
-- les courriers préremplis.
--
-- Cette fonction est le seul moyen pour l'abonné d'écrire ces informations,
-- et seulement tant que la gestion est un brouillon. Les champs obligatoires
-- à l'envoi sont contrôlés par le site (ils changent avec le fichier des
-- champs) ; les règles du noyau (contrat, heures, salaire, quota) restent
-- vérifiées par la base (gestion_envoyer).
-- ============================================================================

create or replace function public.gestion_enregistrer_details(
  p_id uuid,
  p_config jsonb,
  p_civilite_salarie text,
  p_adresse_salarie text,
  p_code_postal_salarie text,
  p_ville_salarie text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id  uuid;
begin
  if p_config is null or jsonb_typeof(p_config) <> 'object' then
    raise exception 'Informations du contrat invalides.';
  end if;
  if length(p_config::text) > 20000 then
    raise exception 'Informations du contrat trop longues.';
  end if;
  if coalesce(p_civilite_salarie, '') not in ('', 'Madame', 'Monsieur') then
    raise exception 'Civilité inconnue.';
  end if;

  update public.gestions set
    config = p_config,
    civilite_salarie = coalesce(p_civilite_salarie, ''),
    adresse_salarie = left(trim(coalesce(p_adresse_salarie, '')), 200),
    code_postal_salarie = left(trim(coalesce(p_code_postal_salarie, '')), 10),
    ville_salarie = left(trim(coalesce(p_ville_salarie, '')), 100)
  where id = p_id and employeur_id = v_uid and statut = 'brouillon'
  returning id into v_id;
  if v_id is null then
    raise exception 'Cette gestion n''est plus un brouillon : elle ne peut plus être modifiée ici.';
  end if;
end;
$$;

revoke all on function public.gestion_enregistrer_details(uuid, jsonb, text, text, text, text) from public, anon;
grant execute on function public.gestion_enregistrer_details(uuid, jsonb, text, text, text, text) to authenticated;
