"use client";

import { useState, useTransition } from "react";
import { confirmerImport, previsualiserImport, type ApercuImport } from "./actions";

/** Import des montants payés hors du nouveau site (ancien site), par fichier. */
export function ImportMontants({ annee }: { annee: number }) {
  const [texte, setTexte] = useState("");
  const [apercu, setApercu] = useState<ApercuImport | null>(null);
  const [message, setMessage] = useState("");
  const [enCours, demarrer] = useTransition();

  async function lireFichier(f: File | undefined) {
    if (!f) return;
    setTexte(await f.text());
    setApercu(null);
    setMessage("");
  }

  const total = apercu?.reconnues.reduce((s, l) => s + l.montant, 0) ?? 0;
  return (
    <div className="flex flex-col gap-3 text-sm">
      <label className="flex flex-col gap-1 font-medium">
        Fichier CSV ou texte : une ligne par abonné, « référence client ; montant payé en {annee} »
        <input id="fichier-montants" type="file" accept=".csv,.txt,text/csv,text/plain" onChange={(e) => lireFichier(e.target.files?.[0])} />
      </label>
      <textarea
        id="texte-montants"
        value={texte}
        onChange={(e) => {
          setTexte(e.target.value);
          setApercu(null);
        }}
        rows={6}
        placeholder={"C00012;154,80\nC00013;232,20"}
        className="w-full rounded-md border border-brand-gray/40 bg-background px-3 py-2 font-mono text-xs"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!texte.trim() || enCours}
          onClick={() => demarrer(async () => setApercu(await previsualiserImport(texte)))}
          className="btn btn-secondaire btn-sm"
        >
          Vérifier le fichier
        </button>
        {apercu && apercu.reconnues.length > 0 && (
          <button
            type="button"
            disabled={enCours}
            onClick={() =>
              demarrer(async () => {
                setMessage(await confirmerImport(annee, apercu.reconnues));
                setApercu(null);
                setTexte("");
              })
            }
            className="btn btn-primaire btn-sm"
          >
            Enregistrer {apercu.reconnues.length} montant(s) pour {annee}
          </button>
        )}
      </div>
      {apercu?.erreur && <p className="text-red-700">{apercu.erreur}</p>}
      {apercu && !apercu.erreur && (
        <div className="rounded-md bg-[var(--carte)] p-3">
          <p>
            <strong>{apercu.reconnues.length}</strong> abonné(s) reconnu(s), total{" "}
            <strong>{total.toFixed(2).replace(".", ",")} €</strong>.
          </p>
          {apercu.inconnues.length > 0 && (
            <p className="mt-1 text-red-700">
              Références inconnues ({apercu.inconnues.length}), ignorées : {apercu.inconnues.slice(0, 20).join(" · ")}
              {apercu.inconnues.length > 20 ? " …" : ""}
            </p>
          )}
          {apercu.illisibles.length > 0 && (
            <p className="mt-1 text-foreground/70">
              Lignes ignorées ({apercu.illisibles.length}) : {apercu.illisibles.slice(0, 5).join(" · ")}
            </p>
          )}
        </div>
      )}
      {message && <p role="status" className="font-medium text-brand-teal">{message}</p>}
    </div>
  );
}
