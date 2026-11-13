#!/usr/bin/env bash
# Tests de la base : tous les scripts de supabase/ORDRE.txt sur une base
# vide (deux fois : chacun doit pouvoir être relancé), puis les tests
# tests/sql/test_*.sql. Variables : PGHOST, PGUSER, PGPASSWORD, PGDATABASE.
set -euo pipefail
cd "$(dirname "$0")/../.."
psql() { command psql -X -q -v ON_ERROR_STOP=1 "$@"; }

psql -f tests/sql/supabase-stub.sql
for passage in 1 2; do
  grep -v '^\s*#' supabase/ORDRE.txt | grep -v '^\s*$' | while read -r nom; do
    # schema.sql crée des objets sans « if not exists » : une seule fois.
    if [ "$nom" = "schema" ] && [ "$passage" = 2 ]; then continue; fi
    echo "[$passage] $nom"
    psql -f "supabase/$nom.sql" > /dev/null
  done
done

manquants=$(comm -23 <(grep -v '^\s*#' supabase/ORDRE.txt | grep -v '^\s*$' | sort) \
                     <(command psql -X -At -c 'select nom from public.scripts_sql' | sort))
if [ -n "$manquants" ]; then echo "Registre incomplet : $manquants"; exit 1; fi

for t in tests/sql/test_*.sql; do
  echo "== $t"
  psql -f "$t" > /dev/null
done
echo "Tests de la base : OK"
