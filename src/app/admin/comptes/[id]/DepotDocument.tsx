"use client";

import { useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BUCKET, TAILLE_MAX_PDF, TYPES_DOCUMENT } from "@/lib/data";
import { analyserNomFichier, titreParDefaut } from "@/lib/nom-fichier";
import { enregistrerDocument, preparerDepot } from "./actions";

const inputClass =
  "rounded-md border border-brand-gray/40 bg-background px-2 py-1.5 text-sm outline-none focus:border-brand-teal";

/**
 * Dépôt d'un PDF sur une gestion (glisser-déposer ou clic).
 *
 * À la sélection du fichier, le type, la période et le titre sont
 * préremplis d'après son nom (modifiables avant validation).
 *
 * Trois temps :
 * 1. le serveur vérifie les informations et les doublons, et fournit le
 *    chemin lisible sous lequel ranger le fichier ;
 * 2. le navigateur envoie le fichier DIRECTEMENT à Supabase Storage (la base
 *    vérifie que l'utilisateur connecté est administrateur) ;
 * 3. le serveur enregistre la fiche du document ; s'il échoue, il supprime
 *    le fichier envoyé.
 */
export function DepotDocument({
  compteId,
  gestionId,
}: {
  compteId: string;
  gestionId: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [type, setType] = useState("bulletin");
  const [periode, setPeriode] = useState("");
  const [titre, setTitre] = useState("");
  const [survol, setSurvol] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  function choisir(f: File | undefined | null) {
    setMessage(null);
    if (!f) return;
    const estPdf =
      f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    if (!estPdf) {
      setMessage({ ok: false, texte: "Seuls les fichiers PDF sont acceptés." });
      return;
    }
    if (f.size > TAILLE_MAX_PDF) {
      setMessage({ ok: false, texte: "Fichier trop volumineux (20 Mo maximum)." });
      return;
    }
    setFichier(f);
    // Préremplissage d'après le nom du fichier (à vérifier avant de déposer).
    const analyse = analyserNomFichier(f.name);
    if (analyse.type) setType(analyse.type);
    setPeriode(analyse.periode ?? "");
    setTitre(
      analyse.type
        ? titreParDefaut(analyse.type, analyse.periode)
        : f.name.replace(/\.pdf$/i, ""),
    );
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setSurvol(false);
    choisir(e.dataTransfer.files?.[0]);
  }

  async function deposer() {
    if (!fichier) {
      setMessage({ ok: false, texte: "Choisissez d'abord un fichier PDF." });
      return;
    }
    if (!titre.trim()) {
      setMessage({ ok: false, texte: "Le titre du document est obligatoire." });
      return;
    }
    if (type === "bulletin" && !periode.trim()) {
      setMessage({ ok: false, texte: "Un bulletin de salaire doit avoir une période (AAMM)." });
      return;
    }
    setEnvoi(true);
    setMessage(null);
    try {
      const meta = { compteId, gestionId, typeDocument: type, periode, titre };
      const preparation = await preparerDepot(meta);
      if (!preparation.ok || !preparation.documentId || !preparation.chemin) {
        setMessage({ ok: false, texte: preparation.message });
        return;
      }
      const { documentId, chemin } = preparation;

      const supabase = createClient();
      const { error: erreurEnvoi } = await supabase.storage
        .from(BUCKET)
        .upload(chemin, fichier, { contentType: "application/pdf", upsert: false });
      if (erreurEnvoi) {
        console.error("Envoi du fichier impossible :", erreurEnvoi);
        setMessage({
          ok: false,
          texte: "L'envoi du fichier a échoué. Réessayez ; si le problème continue, vérifiez que les scripts brique2c et brique2d ont bien été exécutés.",
        });
        return;
      }

      const resultat = await enregistrerDocument({
        ...meta,
        documentId,
        storagePath: chemin,
        nomFichier: fichier.name,
      });
      setMessage({ ok: resultat.ok, texte: resultat.message });
      if (resultat.ok) {
        setFichier(null);
        setTitre("");
        setPeriode("");
        if (inputRef.current) inputRef.current.value = "";
        router.refresh();
      }
    } catch (e) {
      console.error("Dépôt impossible :", e);
      setMessage({ ok: false, texte: "Le dépôt a échoué (connexion interrompue ?). Réessayez." });
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setSurvol(true);
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={onDrop}
        className={`cursor-pointer rounded-lg border-2 border-dashed px-4 py-5 text-center text-sm transition-colors ${
          survol
            ? "border-brand-teal bg-brand-teal/10"
            : "border-brand-gray/40 hover:border-brand-teal"
        }`}
      >
        {fichier ? (
          <span>
            <span className="font-medium">{fichier.name}</span>{" "}
            <span className="text-foreground/60">
              ({Math.max(1, Math.round(fichier.size / 1024))} Ko) — cliquez pour changer
            </span>
          </span>
        ) : (
          <span className="text-foreground/70">
            Glissez un PDF ici, ou cliquez pour le choisir (20 Mo maximum)
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => choisir(e.target.files?.[0])}
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium">
          Type
          <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
            {Object.entries(TYPES_DOCUMENT).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Période (AAMM)
          <input
            type="text"
            inputMode="numeric"
            placeholder="2609"
            maxLength={4}
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            className={`${inputClass} w-24`}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Titre
          <input
            type="text"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            className={`${inputClass} w-56`}
          />
        </label>
        <button
          type="button"
          onClick={deposer}
          disabled={envoi}
          className="rounded-md bg-brand-violet px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {envoi ? "Envoi en cours…" : "Déposer le document"}
        </button>
      </div>

      {message && (
        <p
          aria-live="polite"
          className={`text-sm ${message.ok ? "text-brand-teal" : "text-red-600"}`}
        >
          {message.texte}
        </p>
      )}
    </div>
  );
}
