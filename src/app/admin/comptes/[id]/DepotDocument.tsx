"use client";

import { useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BUCKET, TAILLE_MAX_PDF, TYPES_DOCUMENT, formatDate } from "@/lib/data";
import { analyserNomFichier, lireNomNorme, memeNom } from "@/lib/nom-fichier";
import { empreinteFichier } from "@/lib/empreinte";
import { enregistrerDocument, preparerDepot, type ConflitDocument } from "./actions";

const inputClass =
  "rounded-md border border-brand-gray/40 bg-background px-2 py-1.5 text-sm outline-none focus:border-brand-teal";

/**
 * Dépôt d'un PDF sur une gestion (glisser-déposer ou clic).
 *
 * À la sélection du fichier, le type et la période sont
 * préremplis d'après son nom (modifiables avant validation).
 *
 * Trois temps :
 * 1. le serveur vérifie les informations et les doublons, et fournit le
 *    chemin lisible sous lequel ranger le fichier ;
 * 2. le navigateur envoie le fichier DIRECTEMENT à Supabase Storage (la base
 *    vérifie que l'utilisateur connecté est administrateur) ;
 * 3. le serveur enregistre la fiche du document ; s'il échoue, il supprime
 *    le fichier envoyé.
 *
 * Fichier nommé selon la norme (AG00123_DUPONT_MARTIN_BP_2605.pdf) : type,
 * période et précision sont repris du nom, et un avertissement s'affiche si
 * la référence ou les noms ne correspondent pas à cette gestion. Un document
 * déjà en ligne pour la même cible n'est remplacé qu'après confirmation.
 */
export function DepotDocument({
  compteId,
  gestionId,
  typeInitial = "bulletin",
  periodeInitiale = "",
  remplacerInitial = false,
  reference = "",
  nomEmployeur = "",
  nomSalarie = "",
}: {
  compteId: string;
  gestionId: string;
  /** Type proposé d'office (bulletin de salaire par défaut). */
  typeInitial?: string;
  /** Mois proposé d'office (AAMM), ex. celui de la déclaration à traiter. */
  periodeInitiale?: string;
  /** Bulletin corrigé attendu : le dépôt remplace le bulletin déjà en ligne sans redemander. */
  remplacerInitial?: boolean;
  /** Référence de la gestion (AG00123) et noms enregistrés, pour contrôler un fichier normé. */
  reference?: string;
  nomEmployeur?: string;
  nomSalarie?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [type, setType] = useState(typeInitial);
  const [periode, setPeriode] = useState(periodeInitiale);
  // Précision facultative (« Démission », « n° 2 ») : le titre est calculé
  // par le serveur (type, période, précision), sans répéter les noms.
  const [complement, setComplement] = useState("");
  const [empreinte, setEmpreinte] = useState<string | undefined>(undefined);
  const [avertissement, setAvertissement] = useState<string | null>(null);
  const [conflit, setConflit] = useState<ConflitDocument | null>(null);
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
    setConflit(null);
    setAvertissement(null);
    setEmpreinte(undefined);
    void empreinteFichier(f).then(setEmpreinte);
    const norme = lireNomNorme(f.name);
    if (norme.ok) {
      // Fichier à la norme : le nom fait foi pour le type, la période et la précision.
      setType(norme.type);
      setPeriode(norme.periode);
      setComplement(norme.complement);
      const ecarts: string[] = [];
      if (reference && norme.reference !== reference) ecarts.push(`référence ${norme.reference} (cette gestion : ${reference})`);
      if (nomEmployeur && !memeNom(norme.employeur, nomEmployeur)) ecarts.push(`employeur « ${norme.employeur} »`);
      if (nomSalarie && !memeNom(norme.salarie, nomSalarie)) ecarts.push(`salarié « ${norme.salarie} »`);
      if (ecarts.length) {
        setAvertissement(`Ce fichier semble destiné à une autre gestion : ${ecarts.join(", ")}. Vérifiez avant de déposer.`);
      }
      return;
    }
    // Ancien nom : les valeurs déjà proposées (mois de la déclaration à
    // traiter) sont prioritaires ; le nom ne complète que ce qui est vide.
    const analyse = analyserNomFichier(f.name);
    if (!periode && analyse.periode) setPeriode(analyse.periode);
    if (!periodeInitiale && analyse.type) setType(analyse.type);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setSurvol(false);
    choisir(e.dataTransfer.files?.[0]);
  }

  async function deposer(remplacer = remplacerInitial) {
    if (!fichier) {
      setMessage({ ok: false, texte: "Choisissez d'abord un fichier PDF." });
      return;
    }
    if (type === "bulletin" && !periode.trim()) {
      setMessage({ ok: false, texte: "Un bulletin de salaire doit avoir une période (AAMM)." });
      return;
    }
    setEnvoi(true);
    setMessage(null);
    setConflit(null);
    try {
      const meta = {
        compteId,
        gestionId,
        typeDocument: type,
        periode,
        complement,
        remplacer,
        empreinte: empreinte ?? (await empreinteFichier(fichier)),
      };
      const preparation = await preparerDepot(meta);
      if (preparation.conflit) {
        // Demander avant de remplacer (décision du 21/10).
        setConflit(preparation.conflit);
        return;
      }
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
        setComplement("");
        setPeriode("");
        setType(typeInitial);
        setAvertissement(null);
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
          Précision (facultatif)
          <input
            type="text"
            value={complement}
            maxLength={60}
            placeholder="ex. Démission, n° 2"
            onChange={(e) => setComplement(e.target.value)}
            className={`${inputClass} w-56`}
          />
        </label>
        <button
          type="button"
          onClick={() => deposer()}
          disabled={envoi}
          className="btn btn-primaire btn-sm"
        >
          {envoi ? "Envoi en cours…" : "Déposer le document"}
        </button>
      </div>

      {avertissement && (
        <p role="alert" className="rounded-md border border-brand-jaune bg-brand-jaune/25 px-3 py-2 text-sm">
          {avertissement}
        </p>
      )}

      {conflit && (
        <div role="alertdialog" aria-label="Remplacer le document ?" className="rounded-lg border-2 border-brand-violet bg-brand-violet/5 p-3 text-sm">
          <p className="font-bold">
            {conflit.identique
              ? "Ce fichier est déjà en ligne, à l'identique."
              : `${TYPES_DOCUMENT[type as keyof typeof TYPES_DOCUMENT] ?? "Ce document"}${periode ? ` ${periode.slice(2)}/20${periode.slice(0, 2)}` : ""} existe déjà dans cette gestion.`}
          </p>
          <p className="mt-1 text-foreground/80">
            Déposé le {formatDate(conflit.deposeLe)} ·{" "}
            {conflit.consulteLe ? `téléchargé par l'abonné le ${formatDate(conflit.consulteLe)}` : "pas encore téléchargé par l'abonné"}.
            {" "}Le remplacer supprime l&apos;ancien fichier (une trace est gardée) et le document redevient « nouveau » pour l&apos;abonné.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primaire btn-sm" disabled={envoi} onClick={() => deposer(true)}>
              Oui, remplacer
            </button>
            <button type="button" className="btn btn-secondaire btn-sm" onClick={() => setConflit(null)}>
              Non, garder l&apos;existant
            </button>
          </div>
        </div>
      )}

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
