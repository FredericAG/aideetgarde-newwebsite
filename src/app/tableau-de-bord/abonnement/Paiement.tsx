"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { FORMULES } from "@/lib/formules";
import { formatEuros } from "@/lib/data";
import { confirmerPaiement, preparerPaiement, type EtatPaiement } from "./actions";

const URL_FORMULAIRE = "https://static.systempay.fr";

function BoutonContinuer({ texte }: { texte: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primaire btn-lg w-full sm:w-auto">
      {pending ? "Préparation du paiement…" : texte}
    </button>
  );
}

/** Charge une feuille de style ou un script une seule fois. */
function chargerRessource(type: "css" | "js", url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`[data-systempay="${url}"]`)) return resolve();
    const el =
      type === "css"
        ? Object.assign(document.createElement("link"), { rel: "stylesheet", href: url })
        : Object.assign(document.createElement("script"), { src: url, async: true });
    el.setAttribute("data-systempay", url);
    el.addEventListener("load", () => resolve());
    el.addEventListener("error", () => reject(new Error(url)));
    document.head.appendChild(el);
  });
}

/**
 * Formulaire de carte Systempay, affiché dans la page (les champs de carte
 * sont des cadres sécurisés servis par Systempay : le numéro de carte ne
 * transite jamais par le site Aide & Garde).
 */
function FormulaireCarte({
  formToken,
  orderId,
  clePublique,
}: {
  formToken: string;
  orderId: string;
  clePublique: string;
}) {
  const router = useRouter();
  const [etat, setEtat] = useState<"chargement" | "pret" | "confirmation" | "erreur">("chargement");
  const monte = useRef(false);

  useEffect(() => {
    if (monte.current) return;
    monte.current = true;
    let annule = false;
    (async () => {
      try {
        await chargerRessource("css", `${URL_FORMULAIRE}/static/js/krypton-client/V4.0/ext/neon-reset.min.css`);
        await chargerRessource("js", `${URL_FORMULAIRE}/static/js/krypton-client/V4.0/ext/neon.js`);
        const KRGlue = (await import("@lyracom/embedded-form-glue")).default;
        const { KR } = await KRGlue.loadLibrary(URL_FORMULAIRE, clePublique);
        await KR.setFormConfig({ formToken, "kr-language": "fr-FR" });
        await KR.onSubmit(async () => {
          // Paiement accepté : on fait confirmer le résultat par le serveur
          // (qui interroge Systempay), puis on recharge la page.
          setEtat("confirmation");
          await confirmerPaiement(orderId).catch(() => null);
          router.replace(`/tableau-de-bord/abonnement?commande=${encodeURIComponent(orderId)}`);
          router.refresh();
          return false; // pas de redirection automatique du formulaire
        });
        await KR.renderElements("#formulaire-carte");
        if (!annule) setEtat("pret");
      } catch (e) {
        console.error("Formulaire Systempay :", e);
        if (!annule) setEtat("erreur");
      }
    })();
    return () => {
      annule = true;
    };
  }, [formToken, orderId, clePublique, router]);

  return (
    <div>
      {etat === "chargement" && (
        <p className="text-sm text-foreground/70" role="status">
          Chargement du formulaire de paiement sécurisé…
        </p>
      )}
      {etat === "confirmation" && (
        <p className="text-sm font-medium text-brand-teal" role="status">
          Paiement accepté, activation en cours…
        </p>
      )}
      {etat === "erreur" && (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Le formulaire de paiement n&apos;a pas pu s&apos;afficher. Vérifiez votre connexion puis
          rechargez la page.
        </p>
      )}
      <div id="formulaire-carte" className={etat === "confirmation" ? "hidden" : ""}>
        <div className="kr-smart-form" kr-card-form-expanded="" />
      </div>
    </div>
  );
}

/** Choix de la formule puis paiement du premier mois. */
export function Souscription({
  clePublique,
  placesUtilisees,
}: {
  clePublique: string;
  placesUtilisees: number;
}) {
  const [etat, action] = useActionState<EtatPaiement, FormData>(preparerPaiement, { etape: "choix" });
  const premiereValide = FORMULES.find((f) => f.quota >= placesUtilisees)?.quota ?? FORMULES[FORMULES.length - 1].quota;

  if (etat.etape === "formulaire") {
    return (
      <div className="mt-4">
        <p className="mb-4 text-sm">
          {etat.libelle} : <strong>{formatEuros(etat.montant)}</strong>
        </p>
        <FormulaireCarte formToken={etat.formToken} orderId={etat.orderId} clePublique={clePublique} />
      </div>
    );
  }

  return (
    <form action={action} className="mt-4 flex flex-col gap-4">
      <input type="hidden" name="type" value="souscription" />
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-medium">Nombre de salariés suivis</legend>
        {FORMULES.map((f) => {
          const tropPetite = f.quota < placesUtilisees;
          return (
            <label
              key={f.quota}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border-2 bg-white p-4 has-[:checked]:border-brand-violet has-[:checked]:bg-brand-violet/5 ${
                tropPetite ? "cursor-not-allowed border-brand-gray/20 opacity-50" : "border-brand-gray/30"
              }`}
            >
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  name="quota"
                  value={f.quota}
                  defaultChecked={f.quota === premiereValide}
                  disabled={tropPetite}
                  className="h-4 w-4 accent-[var(--color-brand-violet)]"
                />
                <span className="font-medium">{f.libelle}</span>
              </span>
              <span className="whitespace-nowrap font-bold text-brand-teal">
                {formatEuros(f.tarif)} <span className="text-xs font-normal text-foreground/60">/ mois</span>
              </span>
            </label>
          );
        })}
      </fieldset>
      {placesUtilisees > 1 && (
        <p className="text-xs text-foreground/60">
          Vous suivez déjà {placesUtilisees} salariés : les formules plus petites ne sont pas
          proposées.
        </p>
      )}
      {etat.erreur && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {etat.erreur}
        </p>
      )}
      <p className="text-sm text-foreground/70">
        Vous payez aujourd&apos;hui le premier mois. Les mois suivants, le même montant est
        prélevé automatiquement à la même date sur la carte enregistrée. Sans engagement :
        résiliable en ligne à tout moment, effet à la fin du mois en cours.
      </p>
      {/* Obligations de la vente en ligne : CGV et délai de rétractation. */}
      <div className="flex flex-col gap-2 rounded-lg border border-brand-gray/25 bg-white p-3 text-sm">
        <label className="flex items-start gap-2">
          <input type="checkbox" name="cgv" value="oui" required className="mt-1" />
          <span>
            J&apos;ai lu et j&apos;accepte les{" "}
            <Link href="/cgv" target="_blank" className="font-medium text-brand-teal underline">
              conditions générales de vente
            </Link>
            .
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="execution" value="oui" required className="mt-1" />
          <span>
            Je demande que le service commence dès le paiement, sans attendre la fin du délai de
            rétractation de 14 jours. Si je me rétracte pendant ce délai (bouton « Renoncer au contrat
            ici » de cette page), je serai remboursé du montant payé, moins le service déjà fourni.
          </span>
        </label>
      </div>
      <div>
        <BoutonContinuer texte="Continuer vers le paiement" />
      </div>
    </form>
  );
}

/** Règlement d'une échéance impayée avec une nouvelle carte. */
export function Regularisation({
  clePublique,
  echeanceId,
  montant,
}: {
  clePublique: string;
  echeanceId: string;
  montant: number;
}) {
  const [etat, action] = useActionState<EtatPaiement, FormData>(preparerPaiement, { etape: "choix" });
  if (etat.etape === "formulaire") {
    return (
      <div className="mt-4">
        <FormulaireCarte formToken={etat.formToken} orderId={etat.orderId} clePublique={clePublique} />
      </div>
    );
  }
  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="type" value="regularisation" />
      <input type="hidden" name="echeance" value={echeanceId} />
      {etat.erreur && (
        <p role="alert" className="mb-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {etat.erreur}
        </p>
      )}
      <BoutonContinuer texte={`Régler ${formatEuros(montant)} avec une carte`} />
    </form>
  );
}
