"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { MOTIFS_REMPLACEMENT, TYPES_GESTION, type Gestion, type MotifRemplacement, type TypeGestion } from "@/lib/data";
import {
  EMPLOIS_REPERES,
  RUBRIQUES,
  champObligatoire,
  champVisible,
  champsManquants,
  optionsDe,
  type ChampContrat,
  type ContexteChamps,
  type RubriqueContrat,
  type Valeurs,
} from "@/lib/contrat/champs";
import { enregistrerGestion, type EtatFormulaireGestion } from "./actions";

const champ =
  "w-full rounded-lg border border-brand-gray/40 bg-white px-3 py-2.5 text-base outline-none focus:border-brand-teal sm:text-sm";
const etiquette = "flex flex-col gap-1 text-sm font-medium";
const aide = "text-xs font-normal text-foreground/60";

const etoile = <span className="text-brand-violet" aria-label="obligatoire pour l'envoi"> *</span>;

/** Saisie d'un champ complémentaire (src/lib/contrat/champs.ts). */
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
  const largeur = c.largeur === "entier" || c.type === "textarea" ? "sm:col-span-2" : "";
  const libelle = (
    <>
      {c.libelle}
      {obligatoire && etoile}
    </>
  );
  const aideTexte = c.aide ? <span className={aide}>{c.aide}</span> : null;

  if (c.type === "oui_non" || (c.type === "choix" && optionsDe(c, contexte).length <= 2)) {
    const options = c.type === "oui_non" ? [{ valeur: "oui", libelle: "Oui" }, { valeur: "non", libelle: "Non" }] : optionsDe(c, contexte);
    return (
      <div className={`${etiquette} ${largeur}`} role="radiogroup" aria-label={c.libelle}>
        <span>{libelle}</span>
        <div className="flex flex-wrap gap-2">
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
        {aideTexte}
      </div>
    );
  }
  let saisie: React.ReactNode;
  if (c.type === "choix") {
    saisie = (
      <select value={valeur} onChange={(e) => onChange(e.target.value)} className={champ}>
        <option value="">Choisir…</option>
        {optionsDe(c, contexte).map((o) => (
          <option key={o.valeur} value={o.valeur}>
            {o.libelle}
          </option>
        ))}
      </select>
    );
  } else if (c.type === "textarea") {
    saisie = (
      <textarea rows={2} maxLength={2000} value={valeur} placeholder={c.placeholder} onChange={(e) => onChange(e.target.value)} className={champ} />
    );
  } else {
    saisie = (
      <input
        type={c.type === "date" ? "date" : c.type === "email" ? "email" : c.type === "telephone" ? "tel" : "text"}
        inputMode={c.type === "nombre" ? "decimal" : undefined}
        value={valeur}
        placeholder={c.placeholder}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        className={champ}
      />
    );
  }
  return (
    <label className={`${etiquette} ${largeur}`}>
      <span>{libelle}</span>
      {saisie}
      {aideTexte}
    </label>
  );
}

/** Champs complémentaires d'une rubrique, deux par ligne sur ordinateur. */
function ChampsRubrique({
  rubrique,
  valeurs,
  contexte,
  maj,
}: {
  rubrique: RubriqueContrat;
  valeurs: Valeurs;
  contexte: ContexteChamps;
  maj: (cle: string, v: string) => void;
}) {
  const visibles = rubrique.champs.filter((c) => champVisible(c, valeurs, contexte));
  if (!visibles.length) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {visibles.map((c) => (
        <ChampSaisie
          key={c.cle}
          champ={c}
          valeur={valeurs[c.cle] ?? ""}
          obligatoire={champObligatoire(c, valeurs, contexte)}
          contexte={contexte}
          onChange={(v) => maj(c.cle, v)}
        />
      ))}
    </div>
  );
}

function Boutons() {
  const { pending, data } = useFormStatus();
  const intention = data?.get("intention");
  return (
    <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-end">
      <button
        type="submit"
        name="intention"
        value="envoyer"
        disabled={pending}
        className="btn btn-primaire btn-lg w-full sm:w-auto"
      >
        {pending && intention === "envoyer" ? "Envoi en cours…" : "Envoyer à Aide & Garde"}
      </button>
      <button
        type="submit"
        name="intention"
        value="brouillon"
        disabled={pending}
        className="btn btn-secondaire btn-lg w-full sm:w-auto"
      >
        {pending && intention === "brouillon" ? "Enregistrement…" : "Enregistrer le brouillon"}
      </button>
    </div>
  );
}

/**
 * Formulaire de création / modification d'une gestion par l'abonné
 * (brique 3). Champs contrôlés : en cas d'erreur, rien de ce qui a été
 * saisi n'est perdu.
 *
 * Deux boutons : « Enregistrer le brouillon » (rien n'est transmis, tout
 * reste modifiable) et « Envoyer à Aide & Garde » (contrôle des champs
 * obligatoires, puis validation par Aide & Garde).
 */
export function FormulaireGestion({
  gestion,
  dateParDefaut = "",
  quota,
  salariesEnCours = [],
  remplacementInitial,
}: {
  gestion?: Gestion;
  /** Date de début proposée pour une nouvelle gestion (AAAA-MM-JJ). */
  dateParDefaut?: string;
  /** Places de l'abonnement : prévient l'abonné avant l'envoi si c'est complet. */
  quota?: { utilisees: number; total: number };
  /** Gestions en cours (hors remplacements) : salariés qu'un CDD peut remplacer. */
  salariesEnCours?: { id: string; nom: string; type_gestion?: string }[];
  /** Arrivée depuis « Ajouter un salarié remplaçant » d'une gestion : préremplissage. */
  remplacementInitial?: { id: string; nom: string; type_gestion?: string };
}) {
  const [etat, action] = useActionState<EtatFormulaireGestion, FormData>(enregistrerGestion, {});
  const [v, setV] = useState({
    type_gestion: (gestion?.type_gestion ?? remplacementInitial?.type_gestion ?? "garde_enfants") as TypeGestion,
    prenom_salarie: gestion?.prenom_salarie ?? "",
    nom_salarie: gestion?.nom_salarie ?? "",
    date_debut: gestion?.date_debut ?? dateParDefaut,
    type_contrat: gestion?.type_contrat ?? (remplacementInitial ? "CDD" : ""),
    date_fin_prevue: gestion?.date_fin_prevue ?? "",
    heures: gestion?.heures != null ? String(gestion.heures).replace(".", ",") : "",
    unite_heures: gestion?.unite_heures ?? "semaine",
    salaire_horaire_net:
      gestion?.salaire_horaire_net != null ? String(gestion.salaire_horaire_net).replace(".", ",") : "",
    precisions: gestion?.precisions ?? "",
    remplace_gestion_id: gestion?.remplace_gestion_id ?? remplacementInitial?.id ?? "",
    motif_remplacement: (gestion?.motif_remplacement ?? "") as MotifRemplacement | "",
  });
  const [remplacement, setRemplacement] = useState(Boolean(gestion?.remplace_gestion_id ?? remplacementInitial));
  // Champs complémentaires (brique 3f) : config de la gestion, coordonnées
  // du salarié, et valeurs proposées pour une nouvelle gestion.
  const [details, setDetails] = useState<Valeurs>(() => {
    const ctx: ContexteChamps = { type_gestion: v.type_gestion, type_contrat: v.type_contrat, remplacement };
    const base: Valeurs = {};
    if (!gestion) {
      for (const r of RUBRIQUES) for (const c of r.champs) if (c.defaut) base[c.cle] = c.defaut(ctx);
    }
    return {
      ...base,
      ...(gestion?.config ?? {}),
      civilite_salarie: gestion?.civilite_salarie ?? "",
      adresse_salarie: gestion?.adresse_salarie ?? "",
      code_postal_salarie: gestion?.code_postal_salarie ?? "",
      ville_salarie: gestion?.ville_salarie ?? "",
    };
  });
  const contexte: ContexteChamps = { type_gestion: v.type_gestion, type_contrat: v.type_contrat, remplacement };
  const majDetail = (cle: string, valeur: string) => setDetails((d) => ({ ...d, [cle]: valeur }));
  const rubrique = (cle: RubriqueContrat["cle"]) => RUBRIQUES.find((r) => r.cle === cle)!;
  // Ce qu'il reste à remplir pour pouvoir envoyer (indication, la vérification
  // définitive est faite à l'envoi).
  const manquants = [
    ...(!v.prenom_salarie.trim() ? ["le prénom"] : []),
    ...(!v.nom_salarie.trim() ? ["le nom"] : []),
    ...(!v.type_contrat ? ["le type de contrat"] : []),
    ...(v.type_contrat === "CDD" && !remplacement && !v.date_fin_prevue ? ["la date de fin du CDD"] : []),
    ...(!v.heures.trim() ? ["la durée de travail"] : []),
    ...(!v.salaire_horaire_net.trim() ? ["le salaire horaire"] : []),
    ...champsManquants(details, contexte),
  ];
  const complet = quota && quota.utilisees >= quota.total;
  const maj =
    (cle: keyof typeof v) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setV((x) => ({ ...x, [cle]: e.target.value }));

  return (
    <form action={action} className="mt-6 flex flex-col gap-6">
      {gestion && <input type="hidden" name="gestion_id" value={gestion.id} />}
      <input type="hidden" name="details" value={JSON.stringify(details)} />

      <p
        aria-live="polite"
        className={`rounded-lg p-3 text-sm ${manquants.length ? "bg-brand-sky-tint/30" : "bg-brand-teal/10 font-medium text-brand-teal"}`}
      >
        {manquants.length ? (
          <>
            Les champs marqués {etoile} sont nécessaires pour envoyer :{" "}
            <strong>
              encore {manquants.length} information{manquants.length > 1 ? "s" : ""}
            </strong>
            . Vous pouvez enregistrer un brouillon à tout moment.
          </>
        ) : (
          "✓ Tout ce qui est nécessaire est rempli : vous pouvez envoyer la gestion."
        )}
      </p>

      {complet && !remplacement && (
        <p className="rounded-lg border-2 border-brand-jaune bg-brand-jaune/25 p-3 text-sm">
          <strong>Votre abonnement est complet</strong> ({quota.utilisees} / {quota.total} gestions
          en cours ou en attente de validation). Vous pouvez préparer et enregistrer ce brouillon ;
          pour l&apos;envoyer, terminez d&apos;abord une gestion ou contactez Aide &amp; Garde pour
          faire évoluer votre abonnement.
          {salariesEnCours.length > 0 && (
            <>
              {" "}
              Exception : le <strong>CDD de remplacement</strong> d&apos;un salarié en congé maternité ou en arrêt
              maladie ne prend pas de place (case ci-dessous).
            </>
          )}
        </p>
      )}

      {etat.message && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {etat.message}
        </p>
      )}

      <fieldset className="carte flex flex-col gap-4 p-4 sm:p-5">
        <legend className="sr-only">Le salarié</legend>
        <h2 className="font-bold text-brand-teal">Le salarié</h2>
        <label className={etiquette}>
          Emploi
          <select
            name="type_gestion"
            value={v.type_gestion}
            onChange={(e) => {
              const nouveau = e.target.value as TypeGestion;
              setV((x) => ({ ...x, type_gestion: nouveau }));
              // Intitulé de l'emploi encore celui proposé d'office : on suit.
              setDetails((d) =>
                !d.emploi_repere || Object.values(EMPLOIS_REPERES).some((r) => r.emploi === d.emploi_repere)
                  ? { ...d, emploi_repere: EMPLOIS_REPERES[nouveau].emploi }
                  : d,
              );
            }}
            className={champ}
          >
            {Object.entries(TYPES_GESTION).map(([cle, libelle]) => (
              <option key={cle} value={cle}>
                {libelle}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={etiquette}>
            <span>Prénom{etoile}</span>
            <input name="prenom_salarie" value={v.prenom_salarie} onChange={maj("prenom_salarie")} autoComplete="off" className={champ} />
          </label>
          <label className={etiquette}>
            <span>Nom{etoile}</span>
            <input name="nom_salarie" value={v.nom_salarie} onChange={maj("nom_salarie")} autoComplete="off" className={champ} />
          </label>
        </div>
        <ChampsRubrique rubrique={rubrique("salarie")} valeurs={details} contexte={contexte} maj={majDetail} />
      </fieldset>

      {salariesEnCours.length > 0 && (
        <fieldset className="carte flex flex-col gap-3 p-4 sm:p-5">
          <legend className="sr-only">Remplacement</legend>
          <label className="flex items-start gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={remplacement}
              onChange={(e) => {
                setRemplacement(e.target.checked);
                if (e.target.checked) setV((x) => ({ ...x, type_contrat: "CDD" }));
              }}
              className="mt-1"
            />
            <span>
              Ce salarié remplace un salarié absent (congé maternité ou arrêt maladie)
              <span className={`block ${aide}`}>
                CDD de remplacement : il ne prend pas de place dans votre abonnement, sans surcoût.
              </span>
            </span>
          </label>
          {remplacement && (
            <>
              <input type="hidden" name="remplacement" value="oui" />
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={etiquette}>
                  Salarié remplacé
                  <select
                    name="remplace_gestion_id"
                    required
                    value={v.remplace_gestion_id}
                    onChange={maj("remplace_gestion_id")}
                    className={champ}
                  >
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
                  <select
                    name="motif_remplacement"
                    required
                    value={v.motif_remplacement}
                    onChange={maj("motif_remplacement")}
                    className={champ}
                  >
                    <option value="">Choisir…</option>
                    {Object.entries(MOTIFS_REMPLACEMENT).map(([cle, libelle]) => (
                      <option key={cle} value={cle}>
                        {libelle.charAt(0).toUpperCase() + libelle.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </>
          )}
        </fieldset>
      )}

      {(!gestion || gestion.statut === "brouillon") && (
        <aside className="rounded-lg border-l-4 border-brand-teal bg-brand-sky-tint/30 p-3 text-sm">
          <strong className="text-brand-teal">Nouveau salarié : pensez à son suivi médical.</strong> Depuis 2025, il
          est assuré par le SPSTN, le service de santé au travail des salariés des particuliers employeurs. À
          l&apos;embauche, contactez-le (0 986 865 865 ou{" "}
          <a href="/avantages/spstn?depuis=creation-gestion" target="_blank" rel="noopener" className="underline">
            spstn.org
          </a>
          ) pour transmettre les coordonnées de votre
          salarié : il organise sa visite d&apos;information et de prévention, sauf s&apos;il l&apos;a déjà passée
          pour ce même emploi.{" "}
          <Link href="/aide/sante-du-salarie#visite-information-prevention" className="font-medium text-brand-teal underline">
            En savoir plus
          </Link>
        </aside>
      )}

      <fieldset className="carte flex flex-col gap-4 p-4 sm:p-5">
        <legend className="sr-only">L&apos;emploi</legend>
        <h2 className="font-bold text-brand-teal">L&apos;emploi</h2>
        <ChampsRubrique rubrique={rubrique("emploi")} valeurs={details} contexte={contexte} maj={majDetail} />
      </fieldset>

      <fieldset className="carte flex flex-col gap-4 p-4 sm:p-5">
        <legend className="sr-only">Le contrat</legend>
        <h2 className="font-bold text-brand-teal">Le contrat</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={etiquette}>
            Date de début
            <input type="date" name="date_debut" value={v.date_debut} onChange={maj("date_debut")} className={champ} />
          </label>
          <div className={etiquette} role="radiogroup" aria-label="Type de contrat">
            <span>Type de contrat{etoile}</span>
            <div className="flex gap-3">
              {(["CDI", "CDD"] as const).map((t) => (
                <label
                  key={t}
                  className={`btn flex-1 ${v.type_contrat === t ? "btn-primaire" : "btn-secondaire"}`}
                >
                  <input
                    type="radio"
                    name="type_contrat"
                    value={t}
                    checked={v.type_contrat === t}
                    onChange={maj("type_contrat")}
                    disabled={remplacement && t === "CDI"}
                    className="sr-only"
                  />
                  {t}
                </label>
              ))}
            </div>
          </div>
        </div>
        {v.type_contrat === "CDD" && (
          <label className={etiquette}>
            <span>
              {remplacement ? "Date de fin prévue (facultative)" : "Date de fin prévue du CDD"}
              {!remplacement && etoile}
            </span>
            <input type="date" name="date_fin_prevue" value={v.date_fin_prevue} onChange={maj("date_fin_prevue")} className={champ} />
            {remplacement && (
              <span className={aide}>Laissez vide si le contrat prend fin au retour du salarié absent.</span>
            )}
          </label>
        )}
        <ChampsRubrique rubrique={rubrique("contrat")} valeurs={details} contexte={contexte} maj={majDetail} />
      </fieldset>

      <fieldset className="carte flex flex-col gap-4 p-4 sm:p-5">
        <legend className="sr-only">Les horaires</legend>
        <h2 className="font-bold text-brand-teal">Les horaires</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={etiquette}>
            <span>Durée de travail (heures){etoile}</span>
            <div className="flex gap-2">
              <input
                name="heures"
                inputMode="decimal"
                value={v.heures}
                onChange={maj("heures")}
                placeholder="ex. 20"
                aria-label="Nombre d'heures"
                className={`${champ} w-28`}
              />
              <select name="unite_heures" value={v.unite_heures} onChange={maj("unite_heures")} aria-label="Unité" className={champ}>
                <option value="semaine">par semaine</option>
                <option value="mois">par mois</option>
              </select>
            </div>
          </div>
        </div>
        <ChampsRubrique rubrique={rubrique("horaires")} valeurs={details} contexte={contexte} maj={majDetail} />
      </fieldset>

      <fieldset className="carte flex flex-col gap-4 p-4 sm:p-5">
        <legend className="sr-only">La rémunération</legend>
        <h2 className="font-bold text-brand-teal">La rémunération</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={etiquette}>
            <span>Salaire horaire net (€){etoile}</span>
            <input
              name="salaire_horaire_net"
              inputMode="decimal"
              value={v.salaire_horaire_net}
              onChange={maj("salaire_horaire_net")}
              placeholder="ex. 12,50"
              className={champ}
            />
            <span className={aide}>Montant net par heure, avant prélèvement à la source.</span>
          </label>
        </div>
        <ChampsRubrique rubrique={rubrique("remuneration")} valeurs={details} contexte={contexte} maj={majDetail} />
      </fieldset>

      <fieldset className="carte flex flex-col gap-4 p-4 sm:p-5">
        <legend className="sr-only">{rubrique("employeur").titre}</legend>
        <h2 className="font-bold text-brand-teal">{rubrique("employeur").titre}</h2>
        {rubrique("employeur").intro && <p className="-mt-2 text-sm text-foreground/70">{rubrique("employeur").intro}</p>}
        <ChampsRubrique rubrique={rubrique("employeur")} valeurs={details} contexte={contexte} maj={majDetail} />
        <label className={etiquette}>
          Précisions (facultatif)
          <textarea
            name="precisions"
            rows={3}
            maxLength={2000}
            value={v.precisions}
            onChange={maj("precisions")}
            placeholder="Tout ce qui peut nous aider à établir le contrat"
            className={champ}
          />
        </label>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Boutons />
        <p className="text-xs text-foreground/60">
          <strong>Brouillon</strong> : rien n&apos;est transmis, vous pouvez y revenir quand vous
          voulez. <strong>Envoyer</strong> : Aide &amp; Garde vérifie les informations et démarre
          la gestion ; vous êtes prévenu dès qu&apos;elle est validée. Une gestion envoyée occupe
          une place de votre abonnement, sauf un CDD de remplacement.
        </p>
      </div>
    </form>
  );
}
