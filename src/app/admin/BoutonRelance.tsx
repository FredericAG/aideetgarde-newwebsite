"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { contenuRelance, type ModeleRelance } from "@/lib/relances";
import { envoyerRelance } from "./relances-actions";

/**
 * Bouton « Relancer » : ouvre une fenêtre qui montre le message exact
 * (destinataire, sujet, texte) et demande confirmation avant l'envoi.
 */
export function BoutonRelance({
  compteId,
  destinataire,
  modele,
  libelle,
  derniere,
  className = "btn btn-secondaire btn-sm",
}: {
  compteId: string;
  /** « Prénom NOM <email> », affiché dans la confirmation. */
  destinataire: string;
  modele: ModeleRelance;
  libelle?: string;
  /** Date de la dernière relance du même type, s'il y en a une. */
  derniere?: string | null;
  className?: string;
}) {
  const fenetre = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [bilan, setBilan] = useState<{ ok: boolean; message: string } | null>(null);
  const c = contenuRelance(modele);

  return (
    <span className="relative z-10 inline-flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={() => {
          setBilan(null);
          fenetre.current?.showModal();
        }}
        disabled={enCours}
        className={`${className} whitespace-nowrap`}
        title={c.usage}
      >
        {enCours ? "Envoi…" : (libelle ?? "✉ Relancer")}
      </button>
      {bilan ? (
        <span className={`text-[11px] ${bilan.ok ? "text-brand-teal" : "text-red-700"}`} role="status">
          {bilan.ok ? "✓ Envoyé" : bilan.message}
        </span>
      ) : derniere ? (
        <span className="text-[11px] text-foreground/60">relancé le {derniere}</span>
      ) : null}
      <dialog
        ref={fenetre}
        className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-xl border-2 border-brand-jaune bg-white p-5 text-left text-sm text-foreground shadow-xl backdrop:bg-brand-black/40"
      >
        <p className="font-bold text-brand-teal">Envoyer cet email ?</p>
        <p className="mt-2 text-xs text-foreground/70">
          À : <strong>{destinataire}</strong>
          {derniere && <span className="block font-bold text-red-700">Déjà relancé le {derniere} pour ce motif.</span>}
        </p>
        <div className="mt-3 rounded-lg border border-brand-gray/25 p-3">
          <p className="font-bold">{c.sujet}</p>
          {c.paragraphes.map((t) => (
            <p key={t} className="mt-2 text-foreground/85">
              {t}
            </p>
          ))}
          <p className="mt-2 text-xs text-foreground/60">Bouton dans l&apos;email : « {c.lien.texte} »</p>
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
                const r = await envoyerRelance(compteId, modele);
                setBilan(r);
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
