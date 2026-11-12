"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { relancerSansDeclaration } from "./actions";

/**
 * Bouton « Relancer les abonnés sans déclaration » : montre le message
 * exact et le nombre de destinataires, puis demande confirmation.
 */
export function RelanceGroupee({
  periode,
  nombre,
  exemples,
  sujet,
  paragraphes,
  joursEntreRelances,
}: {
  periode: string;
  /** Abonnés qui recevront l'email. */
  nombre: number;
  /** Quelques noms, pour vérifier d'un coup d'œil. */
  exemples: string[];
  sujet: string;
  paragraphes: string[];
  joursEntreRelances: number;
}) {
  const fenetre = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [bilan, setBilan] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={enCours || nombre === 0}
        onClick={() => {
          setBilan(null);
          fenetre.current?.showModal();
        }}
        className="btn btn-primaire btn-sm whitespace-nowrap disabled:opacity-60"
      >
        {enCours ? "Envoi en cours…" : `✉ Relancer ${nombre} abonné${nombre > 1 ? "s" : ""} sans déclaration`}
      </button>
      {bilan && (
        <span role="status" className={`text-xs ${bilan.ok ? "text-brand-teal" : "text-red-700"}`}>
          {bilan.message}
        </span>
      )}
      <dialog
        ref={fenetre}
        className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-xl border-2 border-brand-jaune bg-white p-5 text-left text-sm text-foreground shadow-xl backdrop:bg-brand-black/40"
      >
        <p className="font-bold text-brand-teal">
          Envoyer cet email à {nombre} abonné{nombre > 1 ? "s" : ""} ?
        </p>
        <p className="mt-2 text-xs text-foreground/70">
          Un seul email par abonné, même s&apos;il emploie plusieurs salariés. Les abonnés déjà relancés depuis moins de{" "}
          {joursEntreRelances} jours ne le reçoivent pas.
          {exemples.length > 0 && (
            <span className="mt-1 block">
              Par exemple : {exemples.join(", ")}
              {nombre > exemples.length ? "…" : ""}
            </span>
          )}
        </p>
        <div className="mt-3 rounded-lg border border-brand-gray/25 p-3">
          <p className="font-bold">{sujet}</p>
          {paragraphes.map((t) => (
            <p key={t} className="mt-2 text-foreground/85">
              {t}
            </p>
          ))}
        </div>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" autoFocus onClick={() => fenetre.current?.close()} className="btn btn-secondaire">
            Non, annuler
          </button>
          <button
            type="button"
            onClick={() => {
              fenetre.current?.close();
              demarrer(async () => {
                setBilan(await relancerSansDeclaration(periode));
                router.refresh();
              });
            }}
            className="btn btn-primaire"
          >
            Oui, envoyer
          </button>
        </div>
      </dialog>
    </span>
  );
}
