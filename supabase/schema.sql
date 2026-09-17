-- Aide & Garde — schéma initial Supabase (brique 1 : authentification + profil).
-- À exécuter dans Supabase Console > SQL Editor, une fois le projet créé
-- (région UE recommandée pour la RGPD, voir README.md).

-- Un profil par compte auth.users. `role` est un champ générique
-- (employeur / salarie / admin) plutôt qu'un booléen codé en dur : voir la
-- feuille de route, décision actée n°2 (modèle de données extensible).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'employeur' check (role in ('employeur', 'salarie', 'admin')),
  prenom text not null default '',
  nom text not null default '',
  telephone text not null default '',
  adresse text not null default '',
  code_postal text not null default '',
  ville text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Un utilisateur ne voit que sa propre ligne.
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- Un utilisateur peut mettre à jour sa propre ligne (la restriction aux
-- colonnes de contact, ci-dessous, est ce qui empêche réellement de changer
-- `role` ou `email` — cette policy autorise seulement la ligne).
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Protection au niveau colonne (pas seulement au niveau ligne) : c'est la
-- raison d'être du passage à une base relationnelle plutôt que Firestore
-- (voir la feuille de route, décision actée n°8) — même un bug dans le code
-- applicatif ne pourrait pas faire passer un utilisateur en "admin" via
-- cette table, la base de données refuse l'écriture avant même d'exécuter
-- la requête.
revoke update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (prenom, nom, telephone, adresse, code_postal, ville)
  on public.profiles to authenticated;

-- Création automatique du profil à l'inscription. `security definer` fait
-- tourner cette fonction avec les droits du propriétaire de la table
-- (contourne volontairement les policies ci-dessus, uniquement pour cette
-- insertion précise) ; `set search_path = ''` est une pratique de sécurité
-- recommandée par Supabase pour ce type de fonction (empêche une table de
-- même nom ailleurs sur le search_path d'être utilisée par erreur).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, prenom, nom)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'prenom', ''),
    coalesce(new.raw_user_meta_data ->> 'nom', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
