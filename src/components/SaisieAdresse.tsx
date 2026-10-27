"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Saisie d'adresse avec suggestions, comme sur TéléRC (demande du 25/10) :
 * les adresses proposées viennent de la Base Adresse Nationale, via le
 * service public de géocodage de l'IGN (Géoplateforme : gratuit, sans
 * compte, données en France). Choix plutôt que Google Maps : pas de clé
 * payante, pas de transfert de données hors d'Europe, pas de traceur.
 *
 * Seul le texte tapé dans le champ adresse (et le code postal) est envoyé à
 * ce service, à partir de 3 caractères ; rien n'est enregistré par lui pour
 * nous. Une adresse non reconnue peut toujours être saisie librement : les
 * suggestions sont une aide, jamais une obligation.
 */

const API_ADRESSE = "https://data.geopf.fr/geocodage/search";
const API_COMMUNES = "https://geo.api.gouv.fr/communes";

interface Suggestion {
  label: string;
  rue: string;
  codePostal: string;
  ville: string;
}

export interface ValeurAdresse {
  adresse: string;
  code_postal: string;
  ville: string;
}

async function chercherAdresses(q: string, signal: AbortSignal): Promise<Suggestion[]> {
  const url = `${API_ADRESSE}?q=${encodeURIComponent(q)}&autocomplete=1&limit=5&index=address`;
  const r = await fetch(url, { signal });
  if (!r.ok) return [];
  const json = (await r.json()) as {
    features?: { properties?: { label?: string; name?: string; postcode?: string; city?: string } }[];
  };
  return (json.features ?? [])
    .map((f) => f.properties ?? {})
    .filter((p) => p.label && p.postcode && p.city)
    .map((p) => ({ label: p.label!, rue: p.name ?? "", codePostal: p.postcode!, ville: p.city! }));
}

/** Communes d'un code postal (une ou plusieurs). */
export async function communesDuCodePostal(cp: string, signal?: AbortSignal): Promise<string[]> {
  if (!/^\d{5}$/.test(cp)) return [];
  try {
    const r = await fetch(`${API_COMMUNES}?codePostal=${cp}&fields=nom&format=json`, { signal });
    if (!r.ok) return [];
    const l = (await r.json()) as { nom?: string }[];
    return [...new Set(l.map((c) => c.nom ?? "").filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
  } catch {
    return [];
  }
}

const classeDefaut =
  "w-full rounded-lg border border-brand-gray/40 bg-white px-3 py-2.5 text-base outline-none focus:border-brand-teal sm:text-sm";

/**
 * Trois champs (adresse, code postal, ville) qui se complètent : choisir une
 * suggestion remplit les trois ; un code postal saisi propose sa ou ses
 * communes. Avec `noms`, les champs sont envoyés tels quels par le
 * formulaire qui les contient.
 */
export function SaisieAdresse({
  valeur,
  onChange,
  noms,
  libelles = { adresse: "Adresse", code_postal: "Code postal", ville: "Ville" },
  obligatoire = false,
  classeChamp = classeDefaut,
  etoile,
    classeGrille = "grid gap-4 sm:col-span-2 sm:grid-cols-[2fr_1fr_1.5fr]",
  classeEtiquette = "flex flex-col gap-1 text-sm font-medium",
}: {
  /** Style des intitulés (adresse, code postal, ville). */
  classeEtiquette?: string;
  /** Disposition des trois champs (par défaut : sur une ligne sur ordinateur). */
  classeGrille?: string;
  valeur: ValeurAdresse;
  onChange: (v: ValeurAdresse) => void;
  noms?: { adresse: string; code_postal: string; ville: string };
  libelles?: { adresse: string; code_postal: string; ville: string };
  obligatoire?: boolean;
  classeChamp?: string;
  /** Marque « obligatoire » à afficher après les libellés. */
  etoile?: React.ReactNode;
}) {
  const id = useId();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(-1);
  const [communes, setCommunes] = useState<string[]>([]);
  const [recherche, setRecherche] = useState("");
  const dernierCp = useRef(valeur.code_postal);

  // Suggestions d'adresses, 250 ms après la dernière frappe.
  useEffect(() => {
    const q = recherche.trim();
    if (q.length < 3) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      chercherAdresses(q, ctrl.signal)
        .then((l) => {
          setSuggestions(l);
          setOuvert(l.length > 0);
          setActif(-1);
        })
        .catch(() => {
          /* service indisponible : saisie libre */
        });
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [recherche]);

  // Communes du code postal saisi à la main.
  useEffect(() => {
    const cp = valeur.code_postal.trim();
    if (cp === dernierCp.current) return;
    dernierCp.current = cp;
    if (!/^\d{5}$/.test(cp)) return;
    const ctrl = new AbortController();
    communesDuCodePostal(cp, ctrl.signal).then((l) => {
      setCommunes(l);
      if (l.length === 1 && !valeur.ville.trim()) onChange({ ...valeur, ville: l[0] });
    });
    return () => ctrl.abort();
  }, [valeur, onChange]);

  const choisir = (s: Suggestion) => {
    dernierCp.current = s.codePostal;
    onChange({ adresse: s.rue, code_postal: s.codePostal, ville: s.ville });
    setOuvert(false);
    setSuggestions([]);
    setCommunes([]);
  };

  return (
    <div className={classeGrille}>
            <div className={`relative ${classeEtiquette}`}>
        <label htmlFor={`${id}-a`}>
          {libelles.adresse}
          {obligatoire && etoile}
        </label>
        <input
          id={`${id}-a`}
          name={noms?.adresse}
          value={valeur.adresse}
          autoComplete="off"
          role="combobox"
          aria-expanded={ouvert}
          aria-controls={`${id}-l`}
          aria-autocomplete="list"
          onChange={(e) => {
            onChange({ ...valeur, adresse: e.target.value });
            setRecherche(e.target.value);
          }}
          onBlur={() => setTimeout(() => setOuvert(false), 150)}
          onKeyDown={(e) => {
            if (!ouvert) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActif((a) => Math.min(a + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActif((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && actif >= 0) {
              e.preventDefault();
              choisir(suggestions[actif]);
            } else if (e.key === "Escape") {
              setOuvert(false);
            }
          }}
          placeholder="Commencez à taper : numéro et rue"
          className={classeChamp}
        />
        {ouvert && (
          <ul
            id={`${id}-l`}
            role="listbox"
            className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-brand-gray/30 bg-white shadow-lg"
          >
            {suggestions.map((s, i) => (
              <li
                key={s.label}
                role="option"
                aria-selected={i === actif}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choisir(s);
                }}
                className={`cursor-pointer px-3 py-2 text-sm font-normal text-foreground ${i === actif ? "bg-brand-sky-tint/50" : "hover:bg-brand-sky-tint/30"}`}
              >
                {s.label}
              </li>
            ))}
            <li className="border-t border-brand-gray/15 px-3 py-1.5 text-xs font-normal text-foreground/60">
              Adresse absente de la liste ? Continuez à la taper : elle sera gardée telle quelle.
            </li>
          </ul>
        )}
      </div>
      <label className={classeEtiquette}>
        <span>
          {libelles.code_postal}
          {obligatoire && etoile}
        </span>
        <input
          name={noms?.code_postal}
          value={valeur.code_postal}
          inputMode="numeric"
          autoComplete="off"
          maxLength={5}
          onChange={(e) => onChange({ ...valeur, code_postal: e.target.value.replace(/[^\d]/g, "") })}
          className={classeChamp}
        />
      </label>
      <label className={classeEtiquette}>
        <span>
          {libelles.ville}
          {obligatoire && etoile}
        </span>
        {communes.length > 1 ? (
          <select
            name={noms?.ville}
            value={communes.includes(valeur.ville) ? valeur.ville : ""}
            onChange={(e) => onChange({ ...valeur, ville: e.target.value })}
            className={classeChamp}
          >
            <option value="">Choisir…</option>
            {communes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        ) : (
          <input
            name={noms?.ville}
            value={valeur.ville}
            autoComplete="off"
            onChange={(e) => onChange({ ...valeur, ville: e.target.value })}
            className={classeChamp}
          />
        )}
      </label>
    </div>
  );
}

/**
 * Commune à partir d'un code postal (« Fait à » des courriers) : taper le
 * code postal affiche la ville, ou la liste des communes s'il y en a
 * plusieurs.
 */
export function SaisieVille({
  valeur,
  onChange,
  classeChamp = classeDefaut,
}: {
  valeur: string;
  onChange: (ville: string) => void;
  classeChamp?: string;
}) {
  const [cp, setCp] = useState("");
  const [communes, setCommunes] = useState<string[]>([]);
  return (
    <div className="flex items-center gap-2">
      <div className="w-28 shrink-0">
        <input
          value={cp}
          inputMode="numeric"
          maxLength={5}
          placeholder="Code postal"
          aria-label="Code postal du lieu de signature"
          onChange={async (e) => {
            const v = e.target.value.replace(/[^\d]/g, "");
            setCp(v);
            if (v.length === 5) {
              const l = await communesDuCodePostal(v);
              setCommunes(l);
              if (l.length === 1) onChange(l[0]);
            }
          }}
          className={classeChamp}
        />
      </div>
      <div className="min-w-0 flex-1">
        {communes.length > 1 ? (
          <select value={communes.includes(valeur) ? valeur : ""} onChange={(e) => onChange(e.target.value)} className={classeChamp}>
            <option value="">Choisir la commune…</option>
            {communes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        ) : (
          <input value={valeur} onChange={(e) => onChange(e.target.value)} aria-label="Ville" className={classeChamp} />
        )}
      </div>
    </div>
  );
}
