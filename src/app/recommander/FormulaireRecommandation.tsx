"use client";

import { useState } from "react";

/**
 * Partage du lien de parrainage (décision du 13/11/2026). Le site n'envoie
 * rien : c'est l'abonné qui envoie, depuis son téléphone ou sa messagerie
 * (avec une récompense, un e-mail envoyé par le site relèverait de la
 * prospection commerciale, CNIL). Le nom du fichier est gardé ; l'ancien
 * formulaire d'e-mail est retiré.
 */
export function messageParDefaut(lien: string): string {
  return `J'utilise Aide & Garde pour la paie de mon salarié à domicile : contrat, bulletins chaque mois, déclarations à l'Urssaf. Je n'ai plus à m'en occuper. Avec mon lien, un mois vous est offert : ${lien}`;
}

export function FormulaireRecommandation({ lien, code }: { lien: string; code: string }) {
  const [copie, setCopie] = useState<"" | "lien" | "message">("");
  const message = messageParDefaut(lien);

  async function copier(texte: string, quoi: "lien" | "message") {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(quoi);
    } catch {
      // Copie refusée par le navigateur : le texte reste sélectionnable.
      setCopie("");
    }
  }

  const enc = encodeURIComponent(message);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium">Votre lien personnel</p>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
          <input
            id="lien-parrainage"
            readOnly
            value={lien}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-md border border-brand-gray/40 bg-background px-3 py-2.5 text-sm"
          />
          <button type="button" onClick={() => copier(lien, "lien")} className="btn btn-primaire shrink-0">
            {copie === "lien" ? "Lien copié" : "Copier le lien"}
          </button>
        </div>
        <p className="mt-1 text-xs text-foreground/60">
          Ou votre code, à indiquer à l&apos;inscription : <strong className="tracking-wider">{code}</strong>
        </p>
      </div>

      <div>
        <p className="text-sm font-medium">L&apos;envoyer</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <a href={`https://wa.me/?text=${enc}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondaire btn-sm">
            WhatsApp
          </a>
          <a href={`sms:?&body=${enc}`} className="btn btn-secondaire btn-sm">
            SMS
          </a>
          <a href={`mailto:?subject=${encodeURIComponent("Aide & Garde, pour la paie de votre salarié à domicile")}&body=${enc}`} className="btn btn-secondaire btn-sm">
            E-mail
          </a>
          <button type="button" onClick={() => copier(message, "message")} className="btn btn-secondaire btn-sm">
            {copie === "message" ? "Message copié" : "Copier le message"}
          </button>
        </div>
        <p className="mt-2 rounded-md bg-[var(--carte)] p-3 text-sm text-foreground/80">{message}</p>
      </div>
    </div>
  );
}
