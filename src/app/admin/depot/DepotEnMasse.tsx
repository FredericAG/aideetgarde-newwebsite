"use client";

import Link from "next/link";
import { useRef, useState, type DragEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { BUCKET, TAILLE_MAX_PDF, formatDate, formatPeriode, libelleDocument, type TypeDocument } from "@/lib/data";
import { lireNomNorme, memeNom, titreDocument, type LectureNorme } from "@/lib/nom-fichier";
import { empreinteFichier } from "@/lib/empreinte";
import { enregistrerDocument, preparerDepot } from "../comptes/[id]/actions";
import { analyserDepot, notifierDepotGroupe, type DepotReussi, type DocumentEnLigne, type GestionDepot } from "./actions";

/**
 * État d'un fichier, du plus bloquant au plus simple :
 * - non_reconnu : nom hors norme (jamais deviné) ;
 * - gestion_inconnue : référence AG introuvable ;
 * - gestion_inactive : gestion en préparation (pas encore validée) ;
 * - doublon_lot : deux fichiers du lot visent le même document ;
 * - noms_differents : référence trouvée mais noms différents → à confirmer ;
 * - conflit : un document existe déjà → remplacer ou ignorer ;
 * - identique : déjà en ligne à l'identique → ignoré par défaut ;
 * - pret : rien à signaler.
 */
type Etat =
  | "non_reconnu"
  | "gestion_inconnue"
  | "gestion_inactive"
  | "doublon_lot"
  | "noms_differents"
  | "conflit"
  | "identique"
  | "pret";

type Envoi = "attente" | "en_cours" | "depose" | "remplace" | "ignore" | "echec";

interface Ligne {
  id: number;
  fichier: File;
  chemin: string;
  lecture: LectureNorme;
  empreinte?: string;
  gestion?: GestionDepot;
  existant?: DocumentEnLigne;
  etat: Etat;
  detail: string;
  /** Décision de l'administrateur pour un document déjà en ligne. */
  choix: "remplacer" | "ignorer" | null;
  /** Noms différents confirmés par l'administrateur (la référence fait foi). */
  nomsConfirmes?: boolean;
  envoi: Envoi;
  message?: string;
}

const LIBELLE_ETAT: Record<Etat, string> = {
  non_reconnu: "Nom non reconnu",
  gestion_inconnue: "Référence inconnue",
  gestion_inactive: "Gestion pas encore validée",
  doublon_lot: "En double dans le lot",
  noms_differents: "Noms à vérifier",
  conflit: "Existe déjà",
  identique: "Déjà en ligne à l'identique",
  pret: "Prêt",
};

const PARALLELE = 3;

/** Clé d'unicité d'un document dans une gestion (comme la base). */
function cleCible(gestionId: string, type: TypeDocument, periode: string, complement: string): string {
  const titre = type === "bulletin" ? "" : titreDocument(type, periode, complement).trim().toLowerCase();
  return `${gestionId}|${type}|${periode}|${titre}`;
}

/** Fichiers d'un glisser-déposer, dossiers compris (parcours récursif). */
async function fichiersDepuisDepot(e: DragEvent<HTMLElement>): Promise<{ f: File; chemin: string }[]> {
  const items = Array.from(e.dataTransfer.items ?? []);
  const entrees = items
    .map((i) => (typeof i.webkitGetAsEntry === "function" ? i.webkitGetAsEntry() : null))
    .filter((x): x is FileSystemEntry => Boolean(x));
  if (!entrees.length) return Array.from(e.dataTransfer.files ?? []).map((f) => ({ f, chemin: f.name }));
  const resultat: { f: File; chemin: string }[] = [];
  async function parcourir(entree: FileSystemEntry, dossier: string): Promise<void> {
    if (entree.isFile) {
      const f = await new Promise<File>((ok, ko) => (entree as FileSystemFileEntry).file(ok, ko));
      resultat.push({ f, chemin: dossier + f.name });
    } else if (entree.isDirectory) {
      const lecteur = (entree as FileSystemDirectoryEntry).createReader();
      // readEntries renvoie les éléments par paquets : lire jusqu'au paquet vide.
      for (;;) {
        const lot = await new Promise<FileSystemEntry[]>((ok, ko) => lecteur.readEntries(ok, ko));
        if (!lot.length) break;
        for (const x of lot) await parcourir(x, `${dossier}${entree.name}/`);
      }
    }
  }
  for (const x of entrees) await parcourir(x, "");
  return resultat;
}

/** Exécute `tache` sur chaque élément, `n` à la fois. */
async function enParallele<T>(liste: T[], n: number, tache: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, liste.length) }, async () => {
      while (i < liste.length) await tache(liste[i++]);
    }),
  );
}

export function DepotEnMasse() {
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [ignores, setIgnores] = useState(0);
  const [analyse, setAnalyse] = useState(false);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [survol, setSurvol] = useState(false);
  const [prevenir, setPrevenir] = useState(true);
  const [bilan, setBilan] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<"tout" | "probleme">("tout");
  const fichiersRef = useRef<HTMLInputElement>(null);
  const dossierRef = useRef<HTMLInputElement>(null);
  const compteur = useRef(0);

  function maj(id: number, modif: Partial<Ligne>) {
    setLignes((ls) => ls.map((l) => (l.id === id ? { ...l, ...modif } : l)));
  }

  async function ajouter(entrees: { f: File; chemin: string }[]) {
    setErreur(null);
    setBilan(null);
    const pdf = entrees.filter((x) => /\.pdf$/i.test(x.f.name));
    setIgnores((n) => n + entrees.length - pdf.length);
    if (!pdf.length) return;
    setAnalyse(true);
    try {
      // 1. Lecture des noms et empreintes (dans le navigateur, rien n'est envoyé).
      const nouvelles: Ligne[] = [];
      await enParallele(pdf, 4, async ({ f, chemin }) => {
        const lecture = f.size > TAILLE_MAX_PDF ? ({ ok: false, erreur: "Fichier trop volumineux (20 Mo maximum)." } as const) : lireNomNorme(f.name);
        nouvelles.push({
          id: ++compteur.current,
          fichier: f,
          chemin,
          lecture,
          empreinte: lecture.ok ? await empreinteFichier(f) : undefined,
          etat: "pret",
          detail: "",
          choix: null,
          envoi: "attente",
        });
      });
      const toutes = [...lignes.filter((l) => l.envoi !== "depose" && l.envoi !== "remplace"), ...nouvelles];
      // 2. Gestions et documents déjà en ligne pour les références lues.
      const refs = toutes.flatMap((l) => (l.lecture.ok ? [l.lecture.reference] : []));
      const r = await analyserDepot(refs);
      if (r.erreur) setErreur(`Analyse impossible : ${r.erreur}`);
      setLignes(evaluer(toutes, r.gestions, r.documents));
    } finally {
      setAnalyse(false);
    }
  }

  /** Calcule l'état de chaque fichier (aucun rangement « au plus probable »). */
  function evaluer(liste: Ligne[], gestions: GestionDepot[], documents: DocumentEnLigne[]): Ligne[] {
    const parRef = new Map(gestions.map((g) => [g.reference, g]));
    const enLigne = new Map<string, DocumentEnLigne>();
    for (const d of documents) {
      const titre = d.type === "bulletin" ? "" : d.titre.trim().toLowerCase();
      enLigne.set(`${d.gestionId}|${d.type}|${d.periode ?? ""}|${titre}`, d);
    }
    const vues = new Map<string, Ligne>();
    return liste.map((l0) => {
      const l: Ligne = { ...l0, etat: "pret", detail: "", existant: undefined, gestion: undefined };
      if (!l.lecture.ok) return { ...l, etat: "non_reconnu", detail: l.lecture.erreur };
      const lu = l.lecture;
      const g = parRef.get(lu.reference);
      if (!g) return { ...l, etat: "gestion_inconnue", detail: `Aucune gestion ${lu.reference}.` };
      l.gestion = g;
      if (g.statut !== "en_cours" && g.statut !== "terminee") {
        return { ...l, etat: "gestion_inactive", detail: "Validez d'abord la gestion." };
      }
      const cle = cleCible(g.id, lu.type, lu.periode, lu.complement);
      const deja = vues.get(cle);
      if (deja) {
        return { ...l, etat: "doublon_lot", detail: `Même document que « ${deja.fichier.name} ».` };
      }
      vues.set(cle, l);
      const ecarts: string[] = [];
      if (!memeNom(lu.employeur, g.employeurNom)) ecarts.push(`employeur « ${lu.employeur} » ≠ ${g.employeurNom || "?"}`);
      if (!memeNom(lu.salarie, g.salarieNom)) ecarts.push(`salarié « ${lu.salarie} » ≠ ${g.salarieNom || "?"}`);
      const existant = enLigne.get(cle);
      l.existant = existant;
      if (ecarts.length && !l.nomsConfirmes) {
        return { ...l, etat: "noms_differents", detail: ecarts.join(" ; ") };
      }
      if (existant && l.empreinte && existant.empreinte === l.empreinte) {
        return { ...l, etat: "identique", detail: `Déposé le ${formatDate(existant.deposeLe)}.`, choix: l.choix ?? "ignorer" };
      }
      if (existant) {
        return {
          ...l,
          etat: "conflit",
          detail: `Déposé le ${formatDate(existant.deposeLe)}, ${existant.consulteLe ? `téléchargé par l'abonné le ${formatDate(existant.consulteLe)}` : "pas encore téléchargé"}.`,
        };
      }
      return l;
    });
  }

  /** Le fichier partira-t-il au prochain envoi ? */
  function aEnvoyer(l: Ligne): boolean {
    if (l.envoi === "depose" || l.envoi === "remplace" || l.envoi === "en_cours") return false;
    if (l.etat === "pret") return true;
    if (l.etat === "conflit" || l.etat === "identique") return l.choix === "remplacer";
    return false;
  }
  function aDecider(l: Ligne): boolean {
    return l.envoi === "attente" && (l.etat === "noms_differents" || (l.etat === "conflit" && !l.choix));
  }

  function confirmerNoms(l: Ligne) {
    // Les noms diffèrent mais la référence fait foi : on réévalue la ligne
    // (elle peut encore être en conflit avec un document existant).
    setLignes((ls) => {
      const toutes = ls.map((x) => (x.id === l.id ? { ...x, nomsConfirmes: true } : x));
      const gestions = toutes.flatMap((x) => (x.gestion ? [x.gestion] : []));
      const documents = toutes.flatMap((x) => (x.existant ? [x.existant] : []));
      const etats = new Map(evaluer(toutes, gestions, documents).map((x) => [x.id, x]));
      // Seules les lignes encore en attente changent d'état.
      return toutes.map((x) => (x.envoi === "attente" ? etats.get(x.id) ?? x : x));
    });
  }

  function choisirTous(choix: "remplacer" | "ignorer") {
    setLignes((ls) => ls.map((l) => (l.etat === "conflit" && l.envoi === "attente" ? { ...l, choix } : l)));
  }

  async function envoyer() {
    const aTraiter = lignes.filter(aEnvoyer);
    if (!aTraiter.length) return;
    setEnvoiEnCours(true);
    setBilan(null);
    const reussis: DepotReussi[] = [];
    const supabase = createClient();
    await enParallele(aTraiter, PARALLELE, async (l) => {
      if (!l.lecture.ok || !l.gestion) return;
      const lu = l.lecture;
      maj(l.id, { envoi: "en_cours", message: undefined });
      const meta = {
        compteId: l.gestion.employeurId,
        gestionId: l.gestion.id,
        typeDocument: lu.type,
        periode: lu.periode,
        complement: lu.complement,
        remplacer: l.choix === "remplacer",
        empreinte: l.empreinte,
      };
      try {
        const prep = await preparerDepot(meta);
        if (prep.conflit) {
          // Un document est apparu entre l'analyse et l'envoi : redemander.
          maj(l.id, { envoi: "attente", etat: "conflit", choix: null, detail: `Déposé le ${formatDate(prep.conflit.deposeLe)} (pendant l'envoi).` });
          return;
        }
        if (!prep.ok || !prep.documentId || !prep.chemin) {
          maj(l.id, { envoi: "echec", message: prep.message });
          return;
        }
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(prep.chemin, l.fichier, { contentType: "application/pdf", upsert: false });
        if (error) {
          maj(l.id, { envoi: "echec", message: "Envoi du fichier impossible, réessayez." });
          return;
        }
        const r = await enregistrerDocument({
          ...meta,
          documentId: prep.documentId,
          storagePath: prep.chemin,
          nomFichier: l.fichier.name,
          notifier: false,
        });
        if (!r.ok) {
          maj(l.id, { envoi: "echec", message: r.message });
          return;
        }
        maj(l.id, { envoi: r.remplacement ? "remplace" : "depose", message: undefined });
        reussis.push({ ...meta, remplacement: Boolean(r.remplacement) });
      } catch {
        maj(l.id, { envoi: "echec", message: "Connexion interrompue, réessayez." });
      }
    });
    setLignes((ls) =>
      ls.map((l) =>
        l.envoi === "attente" && (l.etat === "identique" || (l.etat === "conflit" && l.choix === "ignorer"))
          ? { ...l, envoi: "ignore" }
          : l,
      ),
    );
    let texte = `${reussis.length} document(s) mis en ligne.`;
    if (reussis.length && prevenir) {
      try {
        const bilans = await notifierDepotGroupe(reussis);
        texte += ` ${bilans.length} abonné(s) prévenu(s) (une notification et un email chacun).`;
      } catch {
        texte += " Les abonnés n'ont pas pu être prévenus.";
      }
    } else if (reussis.length) {
      texte += " Abonnés non prévenus (option décochée).";
    }
    setBilan(texte);
    setEnvoiEnCours(false);
  }

  const nb = {
    total: lignes.length,
    pret: lignes.filter(aEnvoyer).length,
    decider: lignes.filter(aDecider).length,
    bloque: lignes.filter((l) => l.envoi === "attente" && ["non_reconnu", "gestion_inconnue", "gestion_inactive", "doublon_lot"].includes(l.etat)).length,
    faits: lignes.filter((l) => l.envoi === "depose" || l.envoi === "remplace").length,
    echecs: lignes.filter((l) => l.envoi === "echec").length,
    conflits: lignes.filter((l) => l.etat === "conflit" && l.envoi === "attente").length,
  };
  const enCours = lignes.filter((l) => l.envoi === "en_cours").length;
  const ordre = (l: Ligne) =>
    l.envoi === "echec" ? 0 : aDecider(l) ? 1 : l.envoi === "attente" && !aEnvoyer(l) && l.etat !== "identique" ? 2 : aEnvoyer(l) ? 3 : 4;
  const affichees = [...lignes]
    .filter((l) => filtre === "tout" || ordre(l) <= 2)
    .sort((a, b) => ordre(a) - ordre(b) || a.chemin.localeCompare(b.chemin));

  return (
    <div className="flex flex-col gap-5">
      {/* Zone de dépôt */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Déposer des PDF ou un dossier"
        onClick={() => fichiersRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fichiersRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setSurvol(true);
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setSurvol(false);
          await ajouter(await fichiersDepuisDepot(e));
        }}
        className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors ${
          survol ? "border-brand-jaune bg-brand-jaune/10" : "border-brand-gray/40 hover:border-brand-jaune"
        }`}
      >
        <p className="font-bold text-brand-teal">Glissez ici vos PDF, ou un dossier entier</p>
        <p className="mt-1 text-sm text-foreground/70">
          Noms à la norme : <code>AG00123_DUPONT_MARTIN_BP_2605.pdf</code> (précision facultative à la fin). Rien n&apos;est
          envoyé avant votre validation.
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn btn-secondaire btn-sm" onClick={() => fichiersRef.current?.click()}>
            Choisir des fichiers
          </button>
          <button type="button" className="btn btn-secondaire btn-sm" onClick={() => dossierRef.current?.click()}>
            Choisir un dossier
          </button>
        </div>
        <input
          ref={fichiersRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={async (e) => {
            const fs = Array.from(e.target.files ?? []);
            e.target.value = "";
            await ajouter(fs.map((f) => ({ f, chemin: f.name })));
          }}
        />
        <input
          ref={dossierRef}
          type="file"
          multiple
          className="hidden"
          // Sélection d'un dossier entier (navigateurs de bureau).
          {...({ webkitdirectory: "" } as Record<string, string>)}
          onChange={async (e) => {
            const fs = Array.from(e.target.files ?? []);
            e.target.value = "";
            await ajouter(fs.map((f) => ({ f, chemin: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name })));
          }}
        />
      </div>

      {analyse && <p className="text-sm text-foreground/70" aria-live="polite">Lecture des fichiers et recherche des gestions…</p>}
      {erreur && <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{erreur}</p>}

      {lignes.length > 0 && (
        <>
          {/* Récapitulatif */}
          <section aria-label="Récapitulatif" className="carte flex flex-col gap-3 p-4">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm tabular-nums">
              <span><b className="text-lg text-brand-teal">{nb.pret}</b> prêt(s) à déposer</span>
              <span><b className="text-lg text-brand-violet">{nb.decider}</b> à décider</span>
              <span><b className="text-lg text-red-700">{nb.bloque}</b> non déposable(s)</span>
              {nb.faits > 0 && <span><b className="text-lg text-brand-teal">{nb.faits}</b> déjà déposé(s)</span>}
              {nb.echecs > 0 && <span><b className="text-lg text-red-700">{nb.echecs}</b> échec(s)</span>}
              {ignores > 0 && <span className="text-foreground/60">{ignores} fichier(s) non PDF ignoré(s)</span>}
            </div>
            {envoiEnCours && (
              <div className="h-2 overflow-hidden rounded-full bg-brand-gray/20" aria-hidden="true">
                <div
                  className="h-full bg-brand-violet transition-all"
                  style={{ width: `${(100 * (nb.faits + nb.echecs)) / Math.max(1, nb.faits + nb.echecs + nb.pret + enCours)}%` }}
                />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn btn-primaire"
                disabled={!nb.pret || envoiEnCours || analyse}
                onClick={envoyer}
              >
                {envoiEnCours ? `Envoi en cours… (${enCours} en cours)` : `Déposer ${nb.pret} fichier(s)`}
              </button>
              {nb.conflits > 0 && !envoiEnCours && (
                <>
                  <button type="button" className="btn btn-secondaire btn-sm" onClick={() => choisirTous("remplacer")}>
                    Tout remplacer ({nb.conflits})
                  </button>
                  <button type="button" className="btn btn-secondaire btn-sm" onClick={() => choisirTous("ignorer")}>
                    Tout ignorer ({nb.conflits})
                  </button>
                </>
              )}
              {nb.echecs > 0 && !envoiEnCours && (
                <button
                  type="button"
                  className="btn btn-secondaire btn-sm"
                  onClick={() => setLignes((ls) => ls.map((l) => (l.envoi === "echec" ? { ...l, envoi: "attente" } : l)))}
                >
                  Remettre les échecs dans la liste
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondaire btn-sm ml-auto"
                disabled={envoiEnCours}
                onClick={() => {
                  setLignes([]);
                  setIgnores(0);
                  setBilan(null);
                }}
              >
                Vider la liste
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={prevenir} onChange={(e) => setPrevenir(e.target.checked)} />
              Prévenir les abonnés à la fin (une notification et un email par abonné, qui récapitulent ses documents)
            </label>
            {bilan && <p role="status" className="rounded-md bg-brand-teal/10 px-3 py-2 text-sm font-medium text-brand-teal">{bilan}</p>}
          </section>

          <div className="flex gap-2 text-sm" role="group" aria-label="Afficher">
            <button type="button" className={`btn btn-sm ${filtre === "tout" ? "btn-primaire" : "btn-secondaire"}`} onClick={() => setFiltre("tout")}>
              Tous ({nb.total})
            </button>
            <button type="button" className={`btn btn-sm ${filtre === "probleme" ? "btn-primaire" : "btn-secondaire"}`} onClick={() => setFiltre("probleme")}>
              À traiter ({nb.decider + nb.bloque + nb.echecs})
            </button>
          </div>

          {/* Détail par fichier */}
          <div className="overflow-x-auto rounded-xl border border-brand-gray/25">
            <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
              <thead className="entete-liste">
                <tr>
                  <th className="px-3 py-2">Fichier</th>
                  <th className="px-3 py-2">Destination</th>
                  <th className="px-3 py-2">Document</th>
                  <th className="px-3 py-2">État</th>
                </tr>
              </thead>
              <tbody>
                {affichees.map((l) => {
                  const lu = l.lecture.ok ? l.lecture : null;
                  return (
                    <tr key={l.id} className="border-t border-brand-gray/20 align-top even:bg-[#f7f7f7]">
                      <td className="max-w-[16rem] px-3 py-2 font-mono text-xs break-all">{l.chemin}</td>
                      <td className="px-3 py-2">
                        {l.gestion ? (
                          <>
                            <Link href={`/admin/comptes/${l.gestion.employeurId}`} className="font-bold text-brand-teal hover:underline" target="_blank">
                              {l.gestion.employeurPrenom} {l.gestion.employeurNom.toUpperCase()}
                            </Link>
                            <span className="block text-xs text-foreground/70">
                              {l.gestion.reference} · {l.gestion.salariePrenom} {l.gestion.salarieNom}
                            </span>
                          </>
                        ) : lu ? (
                          <span className="font-mono text-xs">{lu.reference}</span>
                        ) : (
                          <span className="text-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {lu ? (
                          <>
                            {libelleDocument({ type_document: lu.type, complement: lu.complement || null })}
                            <span className="block text-xs text-foreground/70 tabular-nums">{formatPeriode(lu.periode)}</span>
                          </>
                        ) : (
                          <span className="text-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <EtatLigne
                          l={l}
                          bloque={envoiEnCours}
                          onChoix={(choix) => maj(l.id, { choix })}
                          onConfirmerNoms={() => confirmerNoms(l)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function EtatLigne({
  l,
  bloque,
  onChoix,
  onConfirmerNoms,
}: {
  l: Ligne;
  bloque: boolean;
  onChoix: (c: "remplacer" | "ignorer") => void;
  onConfirmerNoms: () => void;
}) {
  if (l.envoi === "en_cours") return <span className="font-medium text-brand-violet">Envoi…</span>;
  if (l.envoi === "depose") return <span className="font-bold text-brand-teal">✓ Déposé</span>;
  if (l.envoi === "remplace") return <span className="font-bold text-brand-teal">✓ Remplacé</span>;
  if (l.envoi === "ignore") return <span className="text-foreground/60">Ignoré</span>;
  if (l.envoi === "echec") return <span className="font-bold text-red-700">Échec : {l.message}</span>;

  const badge = (texte: string, classe: string) => (
    <span className={`inline-block self-start rounded-full px-2 py-0.5 text-xs font-bold ${classe}`}>{texte}</span>
  );
  switch (l.etat) {
    case "pret":
      return badge("Prêt", "bg-brand-teal/15 text-brand-teal");
    case "noms_differents":
      return (
        <div className="flex flex-col gap-1">
          {badge(LIBELLE_ETAT[l.etat], "bg-brand-jaune text-brand-black")}
          <span className="text-xs">{l.detail}</span>
          <button type="button" className="btn btn-secondaire btn-sm self-start" disabled={bloque} onClick={onConfirmerNoms}>
            Confirmer quand même
          </button>
        </div>
      );
    case "conflit":
    case "identique":
      return (
        <div className="flex flex-col gap-1">
          {badge(LIBELLE_ETAT[l.etat], l.etat === "identique" ? "bg-brand-gray/20 text-foreground/70" : "bg-brand-violet text-white")}
          <span className="text-xs">{l.detail}</span>
          <span className="flex flex-wrap gap-1">
            <button
              type="button"
              disabled={bloque}
              className={`btn btn-sm ${l.choix === "remplacer" ? "btn-primaire" : "btn-secondaire"}`}
              aria-pressed={l.choix === "remplacer"}
              onClick={() => onChoix("remplacer")}
            >
              Remplacer
            </button>
            <button
              type="button"
              disabled={bloque}
              className={`btn btn-sm ${l.choix === "ignorer" ? "btn-primaire" : "btn-secondaire"}`}
              aria-pressed={l.choix === "ignorer"}
              onClick={() => onChoix("ignorer")}
            >
              Ignorer
            </button>
          </span>
        </div>
      );
    default:
      return (
        <div className="flex flex-col gap-1">
          {badge(LIBELLE_ETAT[l.etat], "bg-red-100 text-red-800")}
          <span className="text-xs">{l.detail}</span>
        </div>
      );
  }
}
