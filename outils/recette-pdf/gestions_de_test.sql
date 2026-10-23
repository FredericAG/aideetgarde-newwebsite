-- Références des 4 gestions fictives utilisées par les PDF de test de la
-- brique 4 (dépôt en masse). À exécuter dans Supabase > SQL Editor, après
-- le chargement de donnees_recette_fictives.sql ; copier la ligne obtenue.
select string_agg(g.reference, ',' order by o.n) as references_pour_les_pdf
from (values
  (1, '44df8a13-d4f3-48ee-8b5c-1a9533d91808'::uuid),  -- Thomas PETIT / Mariama FERNANDES (en cours)
  (2, 'ebe80fa9-5c24-41ae-bd51-0557ed4d19b8'::uuid),  -- Thomas PETIT / Bintou SILVA (en cours)
  (3, 'dc56dc87-f32e-4a03-ad1b-a5c8c4ffc64e'::uuid),  -- Sophie DURAND / Sabrina MOREAU (en cours)
  (4, '000e05d0-1798-4d06-8397-a31dea9e7ab5'::uuid)   -- Thomas PETIT / Astrid BENALI (terminée)
) as o(n, id)
join public.gestions g on g.id = o.id;
