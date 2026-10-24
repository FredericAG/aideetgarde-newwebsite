"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  MODELES_COURRIER,
  champsDuModele,
  estFormulaireOfficiel,
  type ChampCourrier,
  type CleCourrier,
  type ContexteCourrier,
} from "@/lib/courriers/modeles";
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
 */
export function FormulaireCourrier({
  gestionId,
  cle,
  contexte,
  replie = false,
}: {
  gestionId: string;
  cle: CleCourrier;
  contexte: ContexteCourrier;
  /** Affiché d'abord comme une ligne « Préparer », dépliée au clic. */
  replie?: boolean;
}) {
  const router = useRouter();
  const modele = MODELES_COURRIER[cle];
  const champs = champsDuModele(modele);
  const [ouvert, setOuvert] = useState(!replie);
  const [valeurs, setValeurs] = useState<Record<string, string>>(() =>
    Object.fromEntries(champs.map((c) => [c.nom, c.defaut?.(contexte) ?? ""])),
  );
  const E = contexte.employeur;
  const S = contexte.salarie;
  const atthon = cle.startsWith("atthon");
  const coordonneesCompletes =
    atthon || (Boolean(E.civilite) && Boolean(S.civilite) && (!modele.adresseSalarie || Boolean(S.adresse && S.ville)));
  const [modifierCoordonnees, setModifierCoordonnees] = useState(!coordonneesCompletes);
  const [etat, setEtat] = useState<{ enCours: boolean; message?: string; erreur?: boolean }>({ enCours: false });
  const adresseEmployeurManquante = !atthon && !(E.adresse && E.ville);

  const maj = (nomChamp: string, v: string) => setValeurs((x) => ({ ...x, [nomChamp]: v }));

  async function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEtat({ enCours: true });
    try {
      const reponse = await fetch(`/tableau-de-bord/gestions/${gestionId}/courrier`, {
        method: "POST",
        body: new FormData(e.currentTarget),
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
      setEtat({ enCours: false, message: `${nomFichier} est téléchargé : vérifiez-le, imprimez-le et signez-le.` });
      setModifierCoordonnees(false);
      router.refresh();
    } catch {
      setEtat({ enCours: false, erreur: true, message: "Le courrier n'a pas pu être préparé. Réessayez dans un instant." });
    }
  }

  if (!ouvert) {
    return (
      <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm">
          <strong className="text-brand-teal">{modele.titre}</strong>
          <span className="block text-xs text-foreground/60">{modele.description}</span>
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
          onChange={(e) => maj(c.nom, e.target.value)}
          className={`${classeChamp} ${c.type === "text" ? "" : "sm:w-56"}`}
        />
      );
    }
    return (
      <label key={c.nom} className="flex flex-col gap-1 text-sm font-medium">
        {c.libelle}
        {saisie}
        {c.aide && <span className="text-xs font-normal text-foreground/60">{c.aide}</span>}
      </label>
    );
  };

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-4 rounded-lg border border-brand-gray/25 bg-white p-4">
      <input type="hidden" name="modele" value={cle} />
      <div>
        <p className="font-bold text-brand-teal">{modele.titre}</p>
        <p className="text-xs text-foreground/60">{modele.description}</p>
      </div>
      {modele.avertissement && (
        <p className="rounded-md border-l-4 border-brand-jaune bg-brand-jaune/20 p-3 text-sm">{modele.avertissement}</p>
      )}

      {!atthon && (
        <fieldset className="flex flex-col gap-3 text-sm">
          {modifierCoordonnees ? (
            <>
              <legend className="mb-1 font-medium">Coordonnées (mémorisées pour vos prochains courriers)</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 font-medium">
                  Votre civilité
                  <select name="civilite_employeur" defaultValue={E.civilite} className={classeChamp}>
                    {CIVILITES.map((c) => (
                      <option key={c} value={c}>
                        {c || "—"}
                      </option>
                    ))}
                  </select>
                </label>
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
              </div>
              {modele.adresseSalarie && (
                <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1.5fr]">
                  <label className="flex flex-col gap-1 font-medium">
                    Adresse du salarié
                    <input name="adresse_salarie" defaultValue={S.adresse} autoComplete="off" className={classeChamp} />
                  </label>
                  <label className="flex flex-col gap-1 font-medium">
                    Code postal
                    <input name="code_postal_salarie" defaultValue={S.code_postal} inputMode="numeric" autoComplete="off" className={classeChamp} />
                  </label>
                  <label className="flex flex-col gap-1 font-medium">
                    Ville
                    <input name="ville_salarie" defaultValue={S.ville} autoComplete="off" className={classeChamp} />
                  </label>
                </div>
              )}
            </>
          ) : (
            <p className="text-foreground/80">
              De : <strong>{nom(E)}</strong> · Pour : <strong>{nom(S)}</strong>
              {modele.adresseSalarie && S.adresse ? `, ${S.adresse}, ${S.code_postal} ${S.ville}` : ""}{" "}
              <button type="button" onClick={() => setModifierCoordonnees(true)} className="font-medium text-brand-teal underline">
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

      {champs.map(rendreChamp)}

      <p className="text-xs text-foreground/60">
        {estFormulaireOfficiel(cle)
          ? "Formulaire officiel : ce qui reste vide se complète à l'écran ou à la main."
          : "Un champ laissé vide devient des pointillés, à compléter à la main."}
      </p>
      <button type="submit" disabled={etat.enCours} className="btn btn-primaire w-full sm:w-auto sm:self-start">
        {etat.enCours ? "Préparation…" : "⬇ Télécharger le PDF prérempli"}
      </button>
      {etat.message && (
        <p aria-live="polite" className={`text-sm ${etat.erreur ? "text-red-600" : "text-brand-teal"}`}>
          {etat.message}
        </p>
      )}
    </form>
  );
}
