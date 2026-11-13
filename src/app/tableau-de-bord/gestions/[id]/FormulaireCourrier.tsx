"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { SaisieAdresse, SaisieVille, type ValeurAdresse } from "@/components/SaisieAdresse";
import {
  CHAMPS_SIGNATURE,
  MODELES_COURRIER,
  champsDuModele,
  estFormulaireOfficiel,
  type ChampCourrier,
  type CleCourrier,
  type ContexteCourrier,
} from "@/lib/courriers/modeles";
import { calendrierEntretien, dateEnClair, fenetreNotification, type ModeRemise } from "@/lib/delais";
import { champ as classeChamp } from "./DeclarationMois";

const CIVILITES = ["", "Madame", "Monsieur"] as const;

function nom(p: { civilite: string; prenom: string; nom: string }) {
  return [p.civilite, p.prenom, p.nom.toUpperCase()].filter(Boolean).join(" ");
}

/**
 * Petit formulaire d'un courrier prérempli (choix du 24/10 : mini-formulaire
 * plutôt que PDF direct). Ce que le site connaît est déjà rempli ; les
 * coordonnées du salarié saisies ici sont mémorisées pour les fois
 * suivantes. Le PDF est téléchargé sans quitter la page.
 *
 * `documents` (demande du 12/11/2026) : un seul formulaire pour plusieurs
 * documents (accident : déclaration, feuille d'accident, attestation sur
 * l'honneur). Les informations communes ne sont saisies qu'une fois ; un
 * bouton par document.
 */
export function FormulaireCourrier({
  gestionId,
  cle,
  contexte,
  replie = false,
  documents,
  titre,
  description,
  initiales,
}: {
  gestionId: string;
  cle: CleCourrier;
  contexte: ContexteCourrier;
  /** Affiché d'abord comme une ligne « Préparer », dépliée au clic. */
  replie?: boolean;
  documents?: { cle: CleCourrier; bouton: string; pour: string }[];
  titre?: string;
  description?: string;
  /** Valeurs déjà connues (date indiquée en prévenant Aide & Garde…). */
  initiales?: Record<string, string>;
}) {
  const router = useRouter();
  const modele = MODELES_COURRIER[cle];
  const cles = documents?.map((d) => d.cle) ?? [cle];
  const modeles = cles.map((k) => MODELES_COURRIER[k]);
  // Champs de tous les documents, sans doublon ; date et lieu de signature
  // à la fin.
  const signature = new Set(CHAMPS_SIGNATURE.map((c) => c.nom));
  const champs = (() => {
    const vus = new Set<string>();
    const tous = modeles.flatMap(champsDuModele).filter((c) => (vus.has(c.nom) ? false : (vus.add(c.nom), true)));
    return [...tous.filter((c) => !signature.has(c.nom)), ...tous.filter((c) => signature.has(c.nom))];
  })();
  // Document qui introduit chaque champ : sert aux intertitres du
  // formulaire commun (« La feuille d'accident : en plus »).
  const origine = new Map<string, number>();
  modeles.forEach((m, i) => champsDuModele(m).forEach((c) => origine.has(c.nom) || origine.set(c.nom, i)));
  const [ouvert, setOuvert] = useState(!replie);
  const [valeurs, setValeurs] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = Object.fromEntries(champs.map((c) => [c.nom, c.defaut?.(contexte) ?? ""]));
    for (const [k, x] of Object.entries(initiales ?? {})) if (k in v && x) v[k] = x;
    // Convocation : date d'entretien proposée = la première possible.
    if (cle === "convocation_entretien" && !v.date_entretien) {
      v.date_entretien = calendrierEntretien("main_propre", v.fait_le || new Date().toISOString().slice(0, 10))?.auPlusTot ?? "";
    }
    return v;
  });
  // Calendrier de la convocation : remise en main propre ou recommandé.
  const [modeRemise, setModeRemise] = useState<ModeRemise>("main_propre");
  const [dateRemise, setDateRemise] = useState(() => new Date().toISOString().slice(0, 10));
  // Tant que l'abonné n'a pas choisi lui-même la date de l'entretien, elle
  // suit le calendrier (mode et date de remise).
  const [entretienChoisi, setEntretienChoisi] = useState(false);
  const recalculer = (mode: ModeRemise, date: string) => {
    const c = calendrierEntretien(mode, date);
    if (c && !entretienChoisi) setValeurs((x) => ({ ...x, date_entretien: c.auPlusTot }));
  };
  // Champs déjà connus par la gestion : rangés à part, pour vérification.
  const [connus] = useState(() => new Set(champs.filter((c) => c.connu && (c.defaut?.(contexte) ?? "").trim()).map((c) => c.nom)));
  const E = contexte.employeur;
  const S = contexte.salarie;
  const atthon = cles.every((k) => k.startsWith("atthon"));
  const adresseSalarie = modeles.some((m) => m.adresseSalarie);
  const avertissements = modeles.map((m) => m.avertissement).filter((x): x is string => Boolean(x));
  const officiel = cles.every(estFormulaireOfficiel);
  const coordonneesCompletes =
    atthon || (Boolean(E.civilite) && Boolean(S.civilite) && (!adresseSalarie || Boolean(S.adresse && S.ville)));
  // Seules les coordonnées manquantes sont demandées ; « Modifier » les
  // montre toutes (demande du 25/10 : ne pas redemander ce qui est connu).
  const [modifierCoordonnees, setModifierCoordonnees] = useState(!coordonneesCompletes);
  const [toutModifier, setToutModifier] = useState(false);
  const [adresseS, setAdresseS] = useState<ValeurAdresse>({ adresse: S.adresse, code_postal: S.code_postal, ville: S.ville });
  const majAdresseS = useCallback((v: ValeurAdresse) => setAdresseS(v), []);
  const demander = {
    civiliteE: toutModifier || !E.civilite,
    civiliteS: toutModifier || !S.civilite,
    adresseS: adresseSalarie && (toutModifier || !(S.adresse && S.ville)),
  };
  const [etat, setEtat] = useState<{ enCours: boolean; quel?: CleCourrier; message?: string; erreur?: boolean }>({ enCours: false });
  const adresseEmployeurManquante = !atthon && !(E.adresse && E.ville);

  const maj = (nomChamp: string, v: string) => setValeurs((x) => ({ ...x, [nomChamp]: v }));

  async function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const corps = new FormData(e.currentTarget);
    // Plusieurs documents : celui du bouton cliqué.
    const bouton = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const quel = (bouton?.name === "modele" ? bouton.value : cle) as CleCourrier;
    corps.set("modele", quel);
    setEtat({ enCours: true, quel });
    try {
      const reponse = await fetch(`/tableau-de-bord/gestions/${gestionId}/courrier`, {
        method: "POST",
        body: corps,
      });
      if (!reponse.ok) throw new Error((await reponse.text()) || "Erreur");
      const blob = await reponse.blob();
      const nomFichier =
        /filename="([^"]+)"/.exec(reponse.headers.get("Content-Disposition") ?? "")?.[1] ?? "courrier.pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nomFichier;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setEtat({
        enCours: false,
        message: `${nomFichier} est téléchargé : vérifiez-le, imprimez-le${atthon || quel === "feuille_accident" ? "" : " et signez-le"}.`,
      });
      setModifierCoordonnees(false);
      setToutModifier(false);
      router.refresh();
    } catch {
      setEtat({ enCours: false, erreur: true, message: "Le courrier n'a pas pu être préparé. Réessayez dans un instant." });
    }
  }

  if (!ouvert) {
    return (
      <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm">
          <strong className="text-brand-teal">{titre ?? modele.titre}</strong>
          <span className="block text-xs text-foreground/60">{description ?? modele.description}</span>
        </span>
        <button type="button" onClick={() => setOuvert(true)} className="btn btn-secondaire btn-sm shrink-0 self-start sm:self-auto">
          Préparer
        </button>
      </div>
    );
  }

  const rendreChamp = (c: ChampCourrier) => {
    if (c.si && valeurs[c.si.champ] !== c.si.valeur) return null;
    const v = valeurs[c.nom] ?? "";
    if (c.type === "case") {
      return (
        <label key={c.nom} className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name={c.nom}
            value="1"
            checked={v === "1"}
            onChange={(e) => maj(c.nom, e.target.checked ? "1" : "")}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand-violet)]"
          />
          {c.libelle}
        </label>
      );
    }
    let saisie: React.ReactNode;
    if (c.nom === "fait_a") {
      // Ville de signature : celle de l'employeur, ou un code postal qui
      // propose la commune.
      return (
        <div key={c.nom} className="flex flex-col gap-1 text-sm font-medium">
          <span>{c.libelle}</span>
          <input type="hidden" name={c.nom} value={v} />
          <SaisieVille
            valeur={v}
            onChange={(ville) => maj(c.nom, ville)}
            classeChamp={classeChamp}
            // Code postal de l'employeur, tant que la ville est la sienne.
            codePostalInitial={v && v === E.ville ? E.code_postal : ""}
          />
          <span className="text-xs font-normal text-foreground/60">Tapez un code postal pour choisir une autre commune.</span>
        </div>
      );
    }
    if (c.type === "textarea") {
      saisie = (
        <textarea name={c.nom} rows={c.nom === "motif" ? 6 : 3} maxLength={2000} value={v} placeholder={c.placeholder} onChange={(e) => maj(c.nom, e.target.value)} className={classeChamp} />
      );
    } else if (c.type === "select") {
      saisie = (
        <select
          name={c.nom}
          value={v}
          onChange={(e) => {
            maj(c.nom, e.target.value);
            if (c.remplit) {
              const t = c.remplit.textes(contexte)[e.target.value];
              if (t !== undefined) maj(c.remplit.champ, t);
            }
          }}
          className={classeChamp}
        >
          {c.options?.map((o) => (
            <option key={o.valeur} value={o.valeur}>
              {o.libelle}
            </option>
          ))}
        </select>
      );
    } else {
      saisie = (
        <input
          name={c.nom}
          type={c.type === "montant" ? "text" : c.type}
          inputMode={c.type === "montant" ? "decimal" : undefined}
          value={v}
          placeholder={c.placeholder}
          onChange={(e) => {
            maj(c.nom, e.target.value);
            if (c.nom === "date_entretien") setEntretienChoisi(true);
          }}
          className={`${classeChamp} ${c.type === "text" ? "" : "sm:w-56"}`}
        />
      );
    }
    // Calendrier du licenciement (demande du 12/11/2026).
    let aideDate: React.ReactNode = null;
    if (c.nom === "date_entretien" && cle === "convocation_entretien" && calendrier && v && v < calendrier.auPlusTot) {
      aideDate = (
        <span role="alert" className="text-xs font-bold text-red-700">
          Trop tôt : l&apos;entretien ne peut pas avoir lieu avant le {dateEnClair(calendrier.auPlusTot)}.
        </span>
      );
    }
    if (c.nom === "date_entretien" && cle === "notification_licenciement") {
      const f = fenetreNotification(v);
      if (f) {
        aideDate = (
          <span className="text-xs font-normal text-brand-teal">
            Lettre à envoyer à partir du <strong>{dateEnClair(f.debut)}</strong> et au plus tard le{" "}
            <strong>{dateEnClair(f.fin)}</strong>.
          </span>
        );
      }
    }
    return (
      <label key={c.nom} className="flex flex-col gap-1 text-sm font-medium">
        {c.libelle}
        {saisie}
        {c.aide && !(c.nom === "date_entretien" && calendrier) && (
          <span className="text-xs font-normal text-foreground/60">{c.aide}</span>
        )}
        {aideDate}
        {c.lienSiVide && !v.trim() && (
          <a href={c.lienSiVide.href} target="_blank" rel="noopener" className="text-xs font-medium text-brand-teal underline">
            {c.lienSiVide.texte}
          </a>
        )}
      </label>
    );
  };

  const calendrier = cle === "convocation_entretien" ? calendrierEntretien(modeRemise, dateRemise) : null;

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-4 rounded-lg border border-brand-gray/25 bg-white p-4">
      <div>
        <p className="font-bold text-brand-teal">{titre ?? modele.titre}</p>
        <p className="text-xs text-foreground/60">{description ?? modele.description}</p>
      </div>
      {avertissements.map((a) => (
        <p key={a} className="rounded-md border-l-4 border-brand-jaune bg-brand-jaune/20 p-3 text-sm">
          {a}
        </p>
      ))}

      {calendrier && (
        <fieldset className="flex flex-col gap-3 rounded-lg bg-brand-sky-tint/30 p-3 text-sm">
          <legend className="sr-only">Calendrier de la convocation</legend>
          <p className="font-bold text-brand-teal">Quand peut avoir lieu l&apos;entretien ?</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Mode de remise de la convocation">
            {(
              [
                ["main_propre", "Je la remets en main propre"],
                ["recommande", "Je l'envoie en recommandé"],
              ] as const
            ).map(([m, l]) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={modeRemise === m}
                onClick={() => {
                  setModeRemise(m);
                  recalculer(m, dateRemise);
                }}
                className={`btn btn-sm ${modeRemise === m ? "btn-primaire" : "btn-secondaire"}`}
              >
                {l}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1 font-medium">
            {modeRemise === "main_propre" ? "Date de remise" : "Date d'envoi"}
            <input
              type="date"
              value={dateRemise}
              onChange={(e) => {
                setDateRemise(e.target.value);
                recalculer(modeRemise, e.target.value);
              }}
              className={`${classeChamp} sm:w-56`}
            />
          </label>
          <p>
            {calendrier.presentationEstimee && (
              <>
                Présentation par le facteur estimée le {dateEnClair(calendrier.presentation)} (délai indicatif de La Poste :
                3 jours ouvrables).{" "}
              </>
            )}
            Entretien possible <strong>au plus tôt le {dateEnClair(calendrier.auPlusTot)}</strong>.{" "}
            {valeurs.date_entretien !== calendrier.auPlusTot && (
              <button
                type="button"
                onClick={() => {
                  maj("date_entretien", calendrier.auPlusTot);
                  setEntretienChoisi(false);
                }}
                className="font-medium text-brand-teal underline"
              >
                Retenir cette date
              </button>
            )}
          </p>
          <p className="text-xs text-foreground/70">
            Règle de la convention collective : l&apos;entretien peut avoir lieu à partir du 4e jour ouvrable qui suit la
            remise de la lettre ou sa première présentation par le facteur (dimanches et jours fériés non compris ; un délai
            qui tombe un samedi est reporté au jour ouvrable suivant).
            {calendrier.presentationEstimee &&
              " Si la lettre est présentée plus tard que prévu (suivez-la sur laposte.fr), décalez l'entretien d'autant. Une absence du salarié ne change rien : c'est la première présentation qui compte."}{" "}
            Jours fériés d&apos;Alsace-Moselle non pris en compte.
          </p>
        </fieldset>
      )}

      {!atthon && (
        <fieldset className="flex flex-col gap-3 text-sm">
          {modifierCoordonnees ? (
            <>
              <legend className="mb-1 font-medium">
                {toutModifier ? "Coordonnées" : "Il manque seulement"} (mémorisées pour vos prochains courriers)
              </legend>
              {(demander.civiliteE || demander.civiliteS) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {demander.civiliteE && (
                    <label className="flex flex-col gap-1 font-medium">
                      {contexte.details.employeur_tiers === "oui" ? "Civilité de l'employeur" : "Votre civilité"}
                      <select name="civilite_employeur" defaultValue={E.civilite} className={classeChamp}>
                        {CIVILITES.map((c) => (
                          <option key={c} value={c}>
                            {c || "—"}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {demander.civiliteS && (
                    <label className="flex flex-col gap-1 font-medium">
                      Civilité du salarié
                      <select name="civilite_salarie" defaultValue={S.civilite} className={classeChamp}>
                        {CIVILITES.map((c) => (
                          <option key={c} value={c}>
                            {c || "—"}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              )}
              {demander.adresseS && (
                <SaisieAdresse
                  valeur={adresseS}
                  onChange={majAdresseS}
                  noms={{ adresse: "adresse_salarie", code_postal: "code_postal_salarie", ville: "ville_salarie" }}
                  libelles={{ adresse: "Adresse du salarié", code_postal: "Code postal", ville: "Ville" }}
                  classeChamp={classeChamp}
                  classeGrille="grid gap-3 sm:grid-cols-[2fr_1fr_1.5fr]"
                />
              )}
            </>
          ) : (
            <p className="text-foreground/80">
              De : <strong>{nom(E)}</strong> · Pour : <strong>{nom(S)}</strong>
              {modele.adresseSalarie && S.adresse ? `, ${S.adresse}, ${S.code_postal} ${S.ville}` : ""}{" "}
              <button
                type="button"
                onClick={() => {
                  setToutModifier(true);
                  setModifierCoordonnees(true);
                }}
                className="font-medium text-brand-teal underline"
              >
                Modifier
              </button>
            </p>
          )}
          {adresseEmployeurManquante && (
            <p className="text-xs text-foreground/70">
              Votre adresse n&apos;est pas renseignée : complétez-la dans{" "}
              <Link href="/mon-compte" className="font-medium text-brand-teal underline">
                Mon compte
              </Link>{" "}
              (à défaut, des pointillés à compléter à la main).
            </p>
          )}
        </fieldset>
      )}

      {documents
        ? // Formulaire commun : un intertitre avant les informations propres
          // à chaque document suivant, la signature à la fin.
          [
            ...documents.map((d, i) => {
              const liste = champs.filter((c) => !connus.has(c.nom) && !signature.has(c.nom) && origine.get(c.nom) === i);
              if (!liste.length) return null;
              return (
                <div key={d.cle} className="flex flex-col gap-4">
                  {i > 0 && (
                    <p className="border-t border-brand-gray/20 pt-3 text-sm font-bold text-brand-violet">{d.bouton} : en plus</p>
                  )}
                  {liste.map(rendreChamp)}
                </div>
              );
            }),
            champs.some((c) => signature.has(c.nom)) ? (
              <div key="signature" className="flex flex-col gap-4">
                <p className="border-t border-brand-gray/20 pt-3 text-sm font-bold text-brand-violet">Signature de la déclaration</p>
                {champs.filter((c) => signature.has(c.nom) && !connus.has(c.nom)).map(rendreChamp)}
              </div>
            ) : null,
          ]
        : champs.filter((c) => !connus.has(c.nom)).map(rendreChamp)}
      {connus.size > 0 && (
        <details className="rounded-lg bg-brand-sky-tint/30 px-3 py-2 text-sm">
          <summary className="cursor-pointer font-medium">
            Déjà renseigné d&apos;après la gestion ({connus.size}) — vérifier
          </summary>
          <div className="mt-3 flex flex-col gap-4">{champs.filter((c) => connus.has(c.nom)).map(rendreChamp)}</div>
        </details>
      )}

      <p className="text-xs text-foreground/60">
        {officiel
          ? "Formulaire officiel modifiable : dans le PDF, chaque case préremplie peut encore être corrigée (la date de signature, par exemple) et ce qui reste vide se complète à l'écran ou à la main."
          : "Un champ laissé vide devient des pointillés, à compléter à la main. Pour changer autre chose, modifiez ici et téléchargez de nouveau."}
      </p>
      {documents ? (
        <div className="flex flex-col gap-2">
          {documents.map((d) => (
            <div key={d.cle} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <button
                type="submit"
                name="modele"
                value={d.cle}
                disabled={etat.enCours}
                className="btn btn-primaire w-full sm:w-72 sm:shrink-0"
              >
                {etat.enCours && etat.quel === d.cle ? "Préparation…" : `⬇ ${d.bouton}`}
              </button>
              <span className="text-xs text-foreground/70">{d.pour}</span>
            </div>
          ))}
        </div>
      ) : (
        <button type="submit" disabled={etat.enCours} className="btn btn-primaire w-full sm:w-auto sm:self-start">
          {etat.enCours ? "Préparation…" : "⬇ Télécharger le PDF prérempli"}
        </button>
      )}
      {etat.message && (
        <p aria-live="polite" className={`text-sm ${etat.erreur ? "text-red-600" : "text-brand-teal"}`}>
          {etat.message}
        </p>
      )}
    </form>
  );
}
