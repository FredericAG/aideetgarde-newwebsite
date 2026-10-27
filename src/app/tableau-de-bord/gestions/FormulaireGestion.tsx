"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { MOTIFS_REMPLACEMENT, type Gestion, type MotifRemplacement, type TypeGestion } from "@/lib/data";
import {
  CHAMPS,
  ETAPES,
  champObligatoire,
  champVisible,
  champsManquants,
  lireEnfants,
  optionsDe,
  aideDe,
  placeholderDe,
  type ChampContrat,
  type CleEtape,
  type ContexteChamps,
  type Valeurs,
} from "@/lib/contrat/champs";
import {
  CATEGORIES,
  categorie as trouverCategorie,
  categorieDeLaGestion,
  echelleEnRomain,
  emploisDeLaCategorie,
  type Categorie,
} from "@/lib/contrat/classification";
import { SaisieAdresse } from "@/components/SaisieAdresse";
import { enregistrerGestion, type EtatFormulaireGestion } from "./actions";

const champ =
  "w-full rounded-lg border border-brand-gray/40 bg-white px-3 py-2.5 text-base font-normal text-foreground outline-none focus:border-brand-teal sm:text-sm";
/**
 * Intitulé de chaque question : en gras et en couleur, pour se distinguer
 * nettement des boutons de choix (retour du 27/10).
 */
const etiquette = "flex flex-col gap-1.5 text-sm font-bold text-brand-teal";
/** Largeur de saisie ajustée à l'information attendue (retour du 27/10). */
const LARGEUR: Partial<Record<ChampContrat["type"], string>> = {
  date: "sm:w-48",
  heure: "w-36",
  nombre: "w-32",
  montant: "w-36",
  telephone: "sm:w-60",
  email: "sm:max-w-sm",
  texte: "sm:max-w-sm",
  choix: "sm:max-w-md",
  textarea: "sm:max-w-2xl",
};
/** Numéros et codes : la largeur de l'information elle-même. */
const LARGEUR_PAR_CLE: Record<string, string> = {
  numero_securite_sociale: "sm:w-60",
  numero_declarant: "sm:w-60",
  titre_sejour_numero: "sm:w-60",
  piece_identite_numero: "sm:w-60",
  repartition_salaire: "w-32",
};
const aide = "text-xs font-normal text-foreground/60";
const etoile = <span className="text-brand-violet" aria-label="nécessaire pour l'envoi"> *</span>;

/** Groupes adresse / code postal / ville saisis avec suggestions. */
const GROUPES_ADRESSE: [string, string, string][] = [
  ["adresse_salarie", "code_postal_salarie", "ville_salarie"],
  ["employeur_adresse", "employeur_code_postal", "employeur_ville"],
];

function BoutonsEnvoi({ dernier }: { dernier: boolean }) {
  const { pending, data } = useFormStatus();
  const intention = data?.get("intention");
  return (
    <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-end">
      {dernier && (
        <button type="submit" name="intention" value="envoyer" disabled={pending} className="btn btn-primaire btn-lg w-full sm:w-auto">
          {pending && intention === "envoyer" ? "Envoi en cours…" : "Envoyer à Aide & Garde"}
        </button>
      )}
      <button type="submit" name="intention" value="brouillon" disabled={pending} className="btn btn-secondaire btn-lg w-full sm:w-auto">
        {pending && intention === "brouillon" ? "Enregistrement…" : "Enregistrer le brouillon"}
      </button>
    </div>
  );
}

/** Boutons de choix (deux ou trois options), en grand. */
function Choix({
  options,
  valeur,
  onChange,
  libelle,
}: {
  options: { valeur: string; libelle: string }[];
  valeur: string;
  onChange: (v: string) => void;
  libelle: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={libelle}>
      {options.map((o) => (
        <button
          key={o.valeur}
          type="button"
          role="radio"
          aria-checked={valeur === o.valeur}
          onClick={() => onChange(valeur === o.valeur ? "" : o.valeur)}
          className={`btn btn-sm min-w-20 ${valeur === o.valeur ? "btn-primaire" : "btn-secondaire"}`}
        >
          {o.libelle}
        </button>
      ))}
    </div>
  );
}

/** Saisie d'un champ du fichier src/lib/contrat/champs.ts. */
function ChampSaisie({
  champ: c,
  valeur,
  obligatoire,
  contexte,
  onChange,
}: {
  champ: ChampContrat;
  valeur: string;
  obligatoire: boolean;
  contexte: ContexteChamps;
  onChange: (v: string) => void;
}) {
  const largeur = "";
  const tailleSaisie =
    LARGEUR_PAR_CLE[c.cle] ?? (c.type === "texte" && c.largeur === "entier" ? "sm:max-w-2xl" : (LARGEUR[c.type] ?? ""));
  const titre = (
    <span>
      {c.libelle}
      {obligatoire && etoile}
    </span>
  );
  const texteAide = aideDe(c, contexte);
  const aideTexte = texteAide ? <span className={aide}>{texteAide}</span> : null;
  const options = optionsDe(c, contexte);

  if (c.type === "oui_non" || (c.type === "choix" && options.length <= 3 && options.every((o) => o.libelle.length < 60))) {
    return (
      <div className={`${etiquette} ${largeur}`}>
        {titre}
        <Choix
          libelle={c.libelle}
          options={c.type === "oui_non" ? [{ valeur: "oui", libelle: "Oui" }, { valeur: "non", libelle: "Non" }] : options}
          valeur={valeur}
          onChange={onChange}
        />
        {aideTexte}
      </div>
    );
  }
  if (c.type === "multi") {
    const choisis = new Set(valeur ? valeur.split("|") : []);
    return (
      <fieldset className={`${etiquette} ${largeur}`}>
        <legend className="mb-1">
          {c.libelle}
          {obligatoire && etoile}
        </legend>
        <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
          {options.map((o) => (
                        <label key={o.valeur} className="flex items-start gap-2 font-normal text-foreground">
              <input
                type="checkbox"
                checked={choisis.has(o.valeur)}
                onChange={(e) => {
                  const n = new Set(choisis);
                  if (e.target.checked) n.add(o.valeur);
                  else n.delete(o.valeur);
                  onChange(options.map((x) => x.valeur).filter((x) => n.has(x)).join("|"));
                }}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand-violet)]"
              />
              {o.libelle}
            </label>
          ))}
        </div>
        {aideTexte}
      </fieldset>
    );
  }
  if (c.type === "enfants") {
    const liste = lireEnfants(valeur);
    const lignes = liste.length ? liste : [{ prenom: "", nom: "", naissance: "" }];
    const majEnfant = (i: number, cle: "prenom" | "nom" | "naissance", v: string) =>
      onChange(JSON.stringify(lignes.map((e, j) => (j === i ? { ...e, [cle]: v } : e))));
    return (
      <fieldset className={`${etiquette} ${largeur}`}>
        <legend className="mb-1">
          {c.libelle}
          {obligatoire && etoile}
        </legend>
        {aideTexte}
        <div className="flex flex-col gap-2">
          {lignes.map((e, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_11rem_auto]">
              <input value={e.prenom} placeholder="Prénom" aria-label={`Prénom de l'enfant ${i + 1}`} onChange={(x) => majEnfant(i, "prenom", x.target.value)} className={champ} />
              <input value={e.nom} placeholder="Nom" aria-label={`Nom de l'enfant ${i + 1}`} onChange={(x) => majEnfant(i, "nom", x.target.value)} className={champ} />
              <input type="date" value={e.naissance} aria-label={`Date de naissance de l'enfant ${i + 1}`} onChange={(x) => majEnfant(i, "naissance", x.target.value)} className={champ} />
              {lignes.length > 1 && (
                <button
                  type="button"
                  onClick={() => onChange(JSON.stringify(lignes.filter((_, j) => j !== i)))}
                  className="text-xs font-medium text-brand-teal underline"
                >
                  Retirer
                </button>
              )}
            </div>
          ))}
        </div>
        {lignes.length < 4 && (
          <button
            type="button"
            onClick={() => onChange(JSON.stringify([...lignes, { prenom: "", nom: "", naissance: "" }]))}
            className="btn btn-secondaire btn-sm mt-1 self-start"
          >
            + Un autre enfant
          </button>
        )}
      </fieldset>
    );
  }
  let saisie: React.ReactNode;
  if (c.type === "choix") {
    saisie = (
      <select value={valeur} onChange={(e) => onChange(e.target.value)} className={`${champ} ${tailleSaisie}`}>
        <option value="">Choisir…</option>
        {options.map((o) => (
          <option key={o.valeur} value={o.valeur}>
            {o.libelle}
          </option>
        ))}
      </select>
    );
  } else if (c.type === "textarea") {
    saisie = (
      <textarea rows={2} maxLength={2000} value={valeur} placeholder={placeholderDe(c, contexte)} onChange={(e) => onChange(e.target.value)} className={`${champ} ${tailleSaisie}`} />
    );
  } else {
    saisie = (
      <input
        type={c.type === "date" ? "date" : c.type === "heure" ? "time" : c.type === "email" ? "email" : c.type === "telephone" ? "tel" : "text"}
        inputMode={c.type === "nombre" || c.type === "montant" ? "decimal" : undefined}
        value={valeur}
        placeholder={placeholderDe(c, contexte)}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        className={`${champ} ${tailleSaisie}`}
      />
    );
  }
  return (
    <label className={`${etiquette} ${largeur}`}>
      {titre}
      {saisie}
      {aideTexte}
    </label>
  );
}

/** Champs d'une étape, l'un sous l'autre (retour du 27/10). */
function ChampsEtape({
  etape,
  valeurs,
  contexte,
  maj,
}: {
  etape: CleEtape;
  valeurs: Valeurs;
  contexte: ContexteChamps;
  maj: (modif: Valeurs) => void;
}) {
  const visibles = CHAMPS.filter((c) => c.etape === etape && champVisible(c, valeurs, contexte));
  if (!visibles.length) return null;
  return (
    <div className="flex flex-col gap-5">
      {visibles.map((c) => {
        if (c.adresse === "code_postal" || c.adresse === "ville") return null;
        if (c.adresse === "rue") {
          const [a, cp, vi] = GROUPES_ADRESSE.find((g) => g[0] === c.cle) ?? [c.cle, "", ""];
          return (
            <SaisieAdresse
              key={c.cle}
              valeur={{ adresse: valeurs[a] ?? "", code_postal: valeurs[cp] ?? "", ville: valeurs[vi] ?? "" }}
              onChange={(x) => maj({ [a]: x.adresse, [cp]: x.code_postal, [vi]: x.ville })}
              obligatoire={champObligatoire(c, valeurs, contexte)}
              etoile={etoile}
              classeChamp={champ}
              classeEtiquette={etiquette}
              classeGrille="grid gap-4 sm:max-w-2xl sm:grid-cols-[2fr_7rem_1.4fr]"
              libelles={{ adresse: c.libelle, code_postal: "Code postal", ville: "Ville" }}
            />
          );
        }
        return (
          <ChampSaisie
            key={c.cle}
            champ={c}
            valeur={valeurs[c.cle] ?? ""}
            obligatoire={champObligatoire(c, valeurs, contexte)}
            contexte={contexte}
            onChange={(val) => maj({ [c.cle]: val })}
          />
        );
      })}
    </div>
  );
}

/**
 * Nouvelle gestion, en étapes (retour du 25/10) : d'abord le type d'emploi
 * et le type de contrat, qui adaptent les questions ; puis le salarié, le
 * poste (emploi de la convention collective et tâches), le contrat, les
 * horaires, le salaire, et une dernière étape de vérification. On passe
 * d'une étape à l'autre librement, on enregistre un brouillon à tout moment,
 * et Aide & Garde relit tout avant de revenir vers l'abonné.
 *
 * Toutes les étapes restent dans la page (seule celle en cours est
 * affichée) : rien de ce qui a été saisi n'est perdu en changeant d'étape.
 */
export function FormulaireGestion({
  gestion,
  dateParDefaut = "",
  quota,
  salariesEnCours = [],
  remplacementInitial,
  etapeInitiale = 0,
}: {
  /** Étape affichée en arrivant (après « Enregistrer le brouillon »). */
  etapeInitiale?: number;
  gestion?: Gestion;
  dateParDefaut?: string;
  quota?: { utilisees: number; total: number };
  salariesEnCours?: { id: string; nom: string; type_gestion?: string }[];
  remplacementInitial?: { id: string; nom: string; type_gestion?: string };
}) {
  const [etat, action] = useActionState<EtatFormulaireGestion, FormData>(enregistrerGestion, {});
  const typeInitial = (gestion?.type_gestion ?? remplacementInitial?.type_gestion ?? "garde_enfants") as TypeGestion;
  const [v, setV] = useState({
    type_gestion: typeInitial,
    prenom_salarie: gestion?.prenom_salarie ?? "",
    nom_salarie: gestion?.nom_salarie ?? "",
    date_debut: gestion?.date_debut ?? dateParDefaut,
    type_contrat: gestion?.type_contrat ?? (remplacementInitial ? "CDD" : "CDI"),
    date_fin_prevue: gestion?.date_fin_prevue ?? "",
    heures: gestion?.heures != null ? String(gestion.heures).replace(".", ",") : "",
    unite_heures: gestion?.unite_heures ?? "semaine",
    salaire_horaire_net: gestion?.salaire_horaire_net != null ? String(gestion.salaire_horaire_net).replace(".", ",") : "",
    precisions: gestion?.precisions ?? "",
    remplace_gestion_id: gestion?.remplace_gestion_id ?? remplacementInitial?.id ?? "",
    motif_remplacement: (gestion?.motif_remplacement ?? "") as MotifRemplacement | "",
  });
  const [remplacement, setRemplacement] = useState(Boolean(gestion?.remplace_gestion_id ?? remplacementInitial));
  const [details, setDetails] = useState<Valeurs>(() => {
    const cfg: Valeurs = { ...(gestion?.config ?? {}) };
    // Gestion d'avant les catégories, ou remplaçant : catégorie déduite.
    if (!cfg.categorie && (gestion || remplacementInitial)) {
      cfg.categorie = categorieDeLaGestion(typeInitial, cfg.garde_partagee).cle;
    }
    const catInit = trouverCategorie(cfg.categorie);
    const ctx: ContexteChamps = {
      type_gestion: typeInitial,
      categorie: catInit?.cle ?? "",
      type_contrat: gestion?.type_contrat ?? "CDI",
      remplacement: Boolean(gestion?.remplace_gestion_id ?? remplacementInitial),
    };
    const base: Valeurs = {};
    if (!gestion) for (const c of CHAMPS) if (c.defaut) base[c.cle] = c.defaut(ctx);
    if (catInit && !cfg.emploi_repere) base.emploi_repere = catInit.emploiParDefaut;
    return {
      ...base,
      ...cfg,
      civilite_salarie: gestion?.civilite_salarie ?? "",
      adresse_salarie: gestion?.adresse_salarie ?? "",
      code_postal_salarie: gestion?.code_postal_salarie ?? "",
      ville_salarie: gestion?.ville_salarie ?? "",
    };
  });
  const cat = trouverCategorie(details.categorie);
  const contexte: ContexteChamps = { type_gestion: v.type_gestion, categorie: cat?.cle ?? "", type_contrat: v.type_contrat, remplacement };
    const [etape, setEtape] = useState(Math.min(Math.max(0, Math.trunc(etapeInitiale) || 0), ETAPES.length - 1));
  const cleEtape = ETAPES[etape].cle;

  const maj =
    (cle: keyof typeof v) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setV((x) => ({ ...x, [cle]: e.target.value }));
  const majDetails = (modif: Valeurs) => setDetails((d) => ({ ...d, ...modif }));
  const choisirCategorie = (c: Categorie) => {
    setV((x) => ({ ...x, type_gestion: c.type_gestion }));
    setDetails((d) => ({
      ...d,
      categorie: c.cle,
      garde_partagee: c.garde_partagee ? "oui" : "",
      // Emploi d'une autre catégorie : on reprend celui proposé d'office.
      emploi_repere: emploisDeLaCategorie(c).some((e) => e.cle === d.emploi_repere) ? d.emploi_repere : c.emploiParDefaut,
    }));
  };
  const allerA = (i: number) => {
    setEtape(i);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Ce qu'il reste à remplir pour envoyer, par étape.
  const manquants: { libelle: string; etape: CleEtape }[] = [
    ...(!cat ? [{ libelle: "le type d'emploi", etape: "categorie" as CleEtape }] : []),
    ...(!v.prenom_salarie.trim() ? [{ libelle: "le prénom du salarié", etape: "salarie" as CleEtape }] : []),
    ...(!v.nom_salarie.trim() ? [{ libelle: "le nom du salarié", etape: "salarie" as CleEtape }] : []),
    ...(v.type_contrat === "CDD" && !remplacement && !v.date_fin_prevue
      ? [{ libelle: "la date de fin du CDD", etape: "contrat" as CleEtape }]
      : []),
    ...(!v.heures.trim() ? [{ libelle: "le nombre d'heures", etape: "horaires" as CleEtape }] : []),
    ...(!v.salaire_horaire_net.trim() ? [{ libelle: "le salaire horaire", etape: "remuneration" as CleEtape }] : []),
    ...champsManquants(details, contexte),
  ].sort((a, b) => ETAPES.findIndex((e) => e.cle === a.etape) - ETAPES.findIndex((e) => e.cle === b.etape));
  const manquePour = (e: CleEtape) => manquants.filter((m) => m.etape === e).length;
  const complet = quota && quota.utilisees >= quota.total;

  return (
    <form
      action={action}
      // Entrée dans un champ : ne pas enregistrer le brouillon (ce qui
      // ramenait à la première étape, retour du 27/10).
      onKeyDown={(e) => {
        const cible = e.target as HTMLElement;
        if (e.key === "Enter" && cible instanceof HTMLInputElement && cible.type !== "submit") e.preventDefault();
      }}
      className="mt-6 flex flex-col gap-5"
    >
      {gestion && <input type="hidden" name="gestion_id" value={gestion.id} />}
      <input type="hidden" name="etape" value={etape} />
      <input type="hidden" name="details" value={JSON.stringify(details)} />
      <input type="hidden" name="type_gestion" value={v.type_gestion} />
      <input type="hidden" name="type_contrat" value={v.type_contrat} />
      {remplacement && (
        <>
          <input type="hidden" name="remplacement" value="oui" />
          <input type="hidden" name="remplace_gestion_id" value={v.remplace_gestion_id} />
          <input type="hidden" name="motif_remplacement" value={v.motif_remplacement} />
        </>
      )}

      {/* Étapes : pastilles cliquables, ✓ quand rien n'y manque. */}
      <nav aria-label="Étapes" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ol className="flex w-max gap-1.5 sm:w-auto sm:flex-wrap">
          {ETAPES.map((e, i) => {
            const fait = Boolean(cat) && manquePour(e.cle) === 0 && i < ETAPES.length - 1;
            return (
              <li key={e.cle}>
                <button
                  type="button"
                  onClick={() => allerA(i)}
                  aria-current={i === etape ? "step" : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-sm font-bold ${
                    i === etape
                      ? "border-brand-violet bg-brand-violet text-white"
                      : "border-brand-violet/25 bg-white text-brand-violet hover:border-brand-violet"
                  }`}
                >
                  <span aria-hidden="true">{fait ? "✓" : i + 1}</span>
                  {e.court}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {etat.message && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {etat.message}
        </p>
      )}

      {/* ---------- 1. Type d'emploi et de contrat ---------- */}
      <section hidden={cleEtape !== "categorie"} className="carte flex flex-col gap-5 p-4 sm:p-5">
        <h2 className="font-bold text-brand-teal">{ETAPES[0].titre}</h2>
        <p className="-mt-3 rounded-lg bg-brand-sky-tint/30 p-3 text-sm">
          Remplissez ce que vous savez, sans vous inquiéter des blancs : <strong>Aide &amp; Garde relit tout</strong>,
          adapte et corrige si besoin, et vous contacte pour finaliser le contrat avec vous.
        </p>
        <p className="-mb-2 text-sm font-bold text-brand-teal">
          Quelle est l&apos;activité principale de votre salarié ?
          <span className={`block ${aide}`}>Celle qui lui prend le plus de temps.</span>
        </p>
        <div role="radiogroup" aria-label="Type d'emploi" className="grid gap-2 sm:grid-cols-2">
          {CATEGORIES.map((c) => {
            const actif = cat?.cle === c.cle;
            return (
              <button
                key={c.cle}
                type="button"
                role="radio"
                aria-checked={actif}
                onClick={() => choisirCategorie(c)}
                className={`rounded-xl border-2 p-3 text-left transition-colors ${
                  actif ? "border-brand-violet bg-brand-violet/5" : "border-brand-gray/25 bg-white hover:border-brand-violet/50"
                }`}
              >
                <span className="block font-bold text-brand-teal">
                  {actif && <span aria-hidden="true">✓ </span>}
                  {c.titre}
                </span>
                <span className="block text-sm text-foreground/70">{c.description}</span>
              </button>
            );
          })}
        </div>

        <div className={etiquette}>
          <span>Type de contrat{etoile}</span>
          <Choix
            libelle="Type de contrat"
            options={[
              { valeur: "CDI", libelle: "CDI (conseillé)" },
              { valeur: "CDD", libelle: "CDD" },
            ]}
            valeur={v.type_contrat}
            onChange={(t) => setV((x) => ({ ...x, type_contrat: t === "CDD" ? "CDD" : "CDI" }))}
          />
          {v.type_contrat === "CDD" && !remplacement && (
            <div className="mt-1 rounded-lg border-l-4 border-brand-jaune bg-brand-jaune/15 p-3 text-sm font-normal">
              <strong>Pourquoi nous conseillons le CDI.</strong> Un CDD n&apos;est possible que pour remplacer un salarié
              absent ou pour un besoin temporaire plus important ; sa période d&apos;essai est très courte ; une fois
              celle-ci passée, il ne peut plus être interrompu avant son terme, sauf faute grave ou accord commun ; et une
              prime de précarité de 10 % des salaires versés est due à la fin.{" "}
              <Link href="/aide/contrat#cdd" target="_blank" className="font-medium text-brand-teal underline">
                En savoir plus
              </Link>
            </div>
          )}
        </div>

        {salariesEnCours.length > 0 && (
          <label className="flex items-start gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={remplacement}
              onChange={(e) => {
                setRemplacement(e.target.checked);
                if (e.target.checked) setV((x) => ({ ...x, type_contrat: "CDD" }));
              }}
              className="mt-1 h-5 w-5 accent-[var(--brand-violet)]"
            />
            <span>
              Ce salarié remplace un de vos salariés absent (congé maternité ou arrêt maladie)
              <span className={`block ${aide}`}>CDD de remplacement : il ne prend pas de place dans votre abonnement.</span>
            </span>
          </label>
        )}
        {remplacement && (
          <div className="flex flex-col gap-5">
            <label className={etiquette}>
              Salarié remplacé
              <select value={v.remplace_gestion_id} onChange={maj("remplace_gestion_id")} className={`${champ} sm:max-w-md`}>
                <option value="">Choisir…</option>
                {salariesEnCours.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nom}
                  </option>
                ))}
              </select>
            </label>
            <label className={etiquette}>
              Motif de son absence
                            <select value={v.motif_remplacement} onChange={maj("motif_remplacement")} className={`${champ} sm:max-w-md`}>
                <option value="">Choisir…</option>
                {Object.entries(MOTIFS_REMPLACEMENT).map(([cle, libelle]) => (
                  <option key={cle} value={cle}>
                    {libelle.charAt(0).toUpperCase() + libelle.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        {complet && !remplacement && (
          <p className="rounded-lg border border-brand-jaune bg-brand-jaune/15 p-3 text-sm">
            <strong>Votre abonnement est complet</strong> ({quota?.utilisees} / {quota?.total}) : vous pouvez préparer ce
            brouillon ; pour l&apos;envoyer, terminez une gestion ou changez de formule.
          </p>
        )}
        <ChampsEtape etape="categorie" valeurs={details} contexte={contexte} maj={majDetails} />
      </section>

      {/* ---------- 2. Le salarié ---------- */}
      <section hidden={cleEtape !== "salarie"} className="carte flex flex-col gap-4 p-4 sm:p-5">
        <h2 className="font-bold text-brand-teal">{ETAPES[1].titre}</h2>
        <label className={etiquette}>
          <span>Prénom{etoile}</span>
          <input name="prenom_salarie" value={v.prenom_salarie} onChange={maj("prenom_salarie")} autoComplete="off" className={`${champ} sm:max-w-sm`} />
        </label>
        <label className={etiquette}>
          <span>Nom{etoile}</span>
          <input name="nom_salarie" value={v.nom_salarie} onChange={maj("nom_salarie")} autoComplete="off" className={`${champ} sm:max-w-sm`} />
        </label>
        <ChampsEtape etape="salarie" valeurs={details} contexte={contexte} maj={majDetails} />
        <aside className="rounded-lg border-l-4 border-brand-teal bg-brand-sky-tint/30 p-3 text-sm">
          <strong className="text-brand-teal">Nouveau salarié : pensez à son suivi médical.</strong> À l&apos;embauche,
          contactez le SPSTN (0 986 865 865 ou{" "}
          <a href="/avantages/spstn?depuis=creation-gestion" target="_blank" rel="noopener" className="underline">
            spstn.org
          </a>
          ) : il organise sa visite d&apos;information et de prévention.{" "}
          <Link href="/aide/sante-du-salarie#visite-information-prevention" target="_blank" className="font-medium text-brand-teal underline">
            En savoir plus
          </Link>
        </aside>
      </section>

      {/* ---------- 3. Le poste ---------- */}
      <section hidden={cleEtape !== "poste"} className="carte flex flex-col gap-4 p-4 sm:p-5">
        <h2 className="font-bold text-brand-teal">{ETAPES[2].titre}</h2>
        {cat ? (
          <>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-bold text-brand-teal">
                Quel emploi de la convention collective correspond le mieux ?
                <span className={`block ${aide}`}>
                  Il fixe le niveau (échelle) et le salaire minimum. Plusieurs activités ? Retenez celle qui prend le plus de
                  temps. Dans le doute, gardez l&apos;emploi proposé : nous le vérifions avec vous.
                </span>
              </legend>
              {emploisDeLaCategorie(cat).map((e) => {
                const actif = details.emploi_repere === e.cle;
                return (
                  <label
                    key={e.cle}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 text-sm ${
                      actif ? "border-brand-violet bg-brand-violet/5" : "border-brand-gray/20 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="choix_emploi_repere"
                      checked={actif}
                      onChange={() => majDetails({ emploi_repere: e.cle })}
                      className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand-violet)]"
                    />
                    <span>
                      <strong className="text-brand-teal">{e.libelle}</strong>{" "}
                      <span className="text-xs text-foreground/50">échelle {echelleEnRomain(e.echelle)}</span>
                      <span className="block text-foreground/70">{e.resume}</span>
                    </span>
                  </label>
                );
              })}
            </fieldset>
            <ChampsEtape etape="poste" valeurs={details} contexte={contexte} maj={majDetails} />
          </>
        ) : (
          <p className="text-sm text-foreground/70">
            Choisissez d&apos;abord le type d&apos;emploi (étape 1) : les questions s&apos;y adaptent.
          </p>
        )}
      </section>

      {/* ---------- 4. Le contrat ---------- */}
      <section hidden={cleEtape !== "contrat"} className="carte flex flex-col gap-4 p-4 sm:p-5">
        <h2 className="font-bold text-brand-teal">{ETAPES[3].titre}</h2>
        <p className="-mt-2 text-sm text-foreground/70">
          {v.type_contrat === "CDD" ? "Contrat à durée déterminée" : "Contrat à durée indéterminée"} (modifiable à
          l&apos;étape 1).
        </p>
        <div className="flex flex-col gap-5">
          <label className={etiquette}>
            Date de début
            <input type="date" name="date_debut" value={v.date_debut} onChange={maj("date_debut")} className={`${champ} sm:w-48`} />
          </label>
          {v.type_contrat === "CDD" && (
            <label className={etiquette}>
              <span>
                {remplacement ? "Date de fin (facultative)" : "Date de fin du CDD"}
                {!remplacement && etoile}
              </span>
                            <input type="date" name="date_fin_prevue" value={v.date_fin_prevue} onChange={maj("date_fin_prevue")} className={`${champ} sm:w-48`} />
              {remplacement && <span className={aide}>Laissez vide si le contrat prend fin au retour du salarié absent.</span>}
            </label>
          )}
        </div>
        <ChampsEtape etape="contrat" valeurs={details} contexte={contexte} maj={majDetails} />
      </section>

      {/* ---------- 5. Les horaires ---------- */}
      <section hidden={cleEtape !== "horaires"} className="carte flex flex-col gap-4 p-4 sm:p-5">
        <h2 className="font-bold text-brand-teal">{ETAPES[4].titre}</h2>
        <div className={etiquette}>
          <span>Nombre d&apos;heures de travail{etoile}</span>
          <div className="flex gap-2">
            <input name="heures" inputMode="decimal" value={v.heures} onChange={maj("heures")} placeholder="ex. 20" aria-label="Nombre d'heures" className={`${champ} !w-28`} />
            <select name="unite_heures" value={v.unite_heures} onChange={maj("unite_heures")} aria-label="Unité" className={`${champ} !w-auto`}>
              <option value="semaine">par semaine</option>
              <option value="mois">par mois</option>
            </select>
          </div>
          <span className={aide}>Par mois si les horaires varient d&apos;une semaine à l&apos;autre. En général, 50 heures par semaine au plus.</span>
        </div>
        <ChampsEtape etape="horaires" valeurs={details} contexte={contexte} maj={majDetails} />
      </section>

      {/* ---------- 6. Salaire et congés ---------- */}
      <section hidden={cleEtape !== "remuneration"} className="carte flex flex-col gap-4 p-4 sm:p-5">
        <h2 className="font-bold text-brand-teal">{ETAPES[5].titre}</h2>
        <label className={etiquette}>
          <span>Salaire horaire net (€){etoile}</span>
          <input name="salaire_horaire_net" inputMode="decimal" value={v.salaire_horaire_net} onChange={maj("salaire_horaire_net")} placeholder="ex. 12,50" className={`${champ} !w-36`} />
          <span className={aide}>Avant prélèvement à la source. Au moins le minimum de l&apos;emploi choisi : nous le vérifions.</span>
        </label>
        <ChampsEtape etape="remuneration" valeurs={details} contexte={contexte} maj={majDetails} />
      </section>

      {/* ---------- 7. Vérifier et envoyer ---------- */}
      <section hidden={cleEtape !== "envoi"} className="carte flex flex-col gap-4 p-4 sm:p-5">
        <h2 className="font-bold text-brand-teal">{ETAPES[6].titre}</h2>
        <ChampsEtape etape="envoi" valeurs={details} contexte={contexte} maj={majDetails} />
        <label className={etiquette}>
          Autres précisions pour Aide &amp; Garde (facultatif)
          <textarea name="precisions" rows={3} maxLength={2000} value={v.precisions} onChange={maj("precisions")} placeholder="Tout ce qui peut nous aider à établir le contrat" className={champ} />
        </label>
        {manquants.length > 0 ? (
          <div className="rounded-lg bg-brand-sky-tint/30 p-3 text-sm">
            <p>
              <strong>Pour envoyer, il manque encore :</strong>
            </p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {manquants.map((m) => (
                <li key={`${m.etape}-${m.libelle}`}>
                  <button type="button" onClick={() => allerA(ETAPES.findIndex((e) => e.cle === m.etape))} className="text-left text-brand-teal underline">
                    {m.libelle}
                  </button>{" "}
                  <span className="text-foreground/50">({ETAPES.find((e) => e.cle === m.etape)?.court})</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="rounded-lg bg-brand-teal/10 p-3 text-sm font-medium text-brand-teal">
            ✓ Tout ce qui est nécessaire est rempli : vous pouvez envoyer.
          </p>
        )}
        <p className="text-sm text-foreground/80">
          Après l&apos;envoi, <strong>Aide &amp; Garde relit votre demande</strong>, l&apos;adapte et la corrige si besoin,
          et vous contacte pour les points à préciser. Vous validez le contrat avant qu&apos;il soit signé.
        </p>
      </section>

      {/* Navigation entre étapes et enregistrement */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          {etape > 0 && (
            <button type="button" onClick={() => allerA(etape - 1)} className="btn btn-secondaire">
              ← Précédent
            </button>
          )}
          {etape < ETAPES.length - 1 && (
            <button type="button" onClick={() => allerA(etape + 1)} className="btn btn-primaire ml-auto">
              Suivant →
            </button>
          )}
        </div>
        <BoutonsEnvoi dernier={etape === ETAPES.length - 1} />
        <p className="text-xs text-foreground/60">
          <strong>Brouillon</strong> : rien n&apos;est transmis, vous y revenez quand vous voulez. Une gestion envoyée
          occupe une place de votre abonnement, sauf un CDD de remplacement.
        </p>
      </div>
    </form>
  );
}
