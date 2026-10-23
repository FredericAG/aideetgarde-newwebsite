import "server-only";
import { readFile } from "node:fs/promises";

/**
 * Note et avis Google de la fiche Aide & Garde, lus avec l'API Places (New)
 * de Google (Place Details) et affichés sur la page d'accueil.
 *
 * Variables d'environnement (Vercel) :
 * - GOOGLE_PLACES_API_KEY : clé API Google Cloud, API « Places API (New) »
 *   activée, clé restreinte à cette seule API. SECRET : type « Sensitive »,
 *   jamais de préfixe NEXT_PUBLIC_ (l'appel se fait uniquement sur le serveur).
 * - GOOGLE_PLACE_ID : identifiant de la fiche (outil « Place ID Finder »).
 * Sans ces variables, rien ne s'affiche.
 *
 * Google renvoie au plus 5 avis, choisis et ordonnés par Google (« les plus
 * pertinents »). Ils sont affichés tels quels, avec le nom de leur auteur et
 * le lien vers Google, comme l'exigent les règles d'utilisation de l'API.
 * Réponse gardée 6 heures au plus : 4 appels par jour environ.
 */
export interface AvisGoogle {
  auteur: string;
  auteurLien: string | null;
  auteurPhoto: string | null;
  note: number;
  texte: string;
  quand: string; // « il y a 2 mois », fourni par Google
  lien: string | null;
}

export interface FicheGoogle {
  note: number | null;
  nombre: number;
  lien: string | null;
  avis: AvisGoogle[];
}

interface ReponsePlaces {
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: {
    rating?: number;
    text?: { text?: string; languageCode?: string };
    originalText?: { text?: string; languageCode?: string };
    relativePublishTimeDescription?: string;
    googleMapsUri?: string;
    authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
  }[];
}

function convertir(r: ReponsePlaces): FicheGoogle {
  return {
    note: typeof r.rating === "number" ? r.rating : null,
    nombre: r.userRatingCount ?? 0,
    lien: r.googleMapsUri ?? null,
    avis: (r.reviews ?? [])
      .map((a) => ({
        auteur: a.authorAttribution?.displayName ?? "Utilisateur Google",
        auteurLien: a.authorAttribution?.uri ?? null,
        auteurPhoto: a.authorAttribution?.photoUri ?? null,
        note: a.rating ?? 0,
        // Texte d'origine s'il est en français, sinon la traduction de Google.
        texte: (a.originalText?.languageCode === "fr" ? a.originalText.text : a.text?.text) ?? "",
        quand: a.relativePublishTimeDescription ?? "",
        lien: a.googleMapsUri ?? null,
      }))
      .filter((a) => a.texte.trim()),
  };
}

export async function lireFicheGoogle(): Promise<FicheGoogle | null> {
  // Aperçu local uniquement (jamais en production) : fichier d'exemple.
  if (process.env.NODE_ENV !== "production" && process.env.AVIS_GOOGLE_APERCU) {
    try {
      return convertir(JSON.parse(await readFile(process.env.AVIS_GOOGLE_APERCU, "utf8")) as ReponsePlaces);
    } catch {
      return null;
    }
  }
  const cle = process.env.GOOGLE_PLACES_API_KEY;
  const lieu = process.env.GOOGLE_PLACE_ID;
  if (!cle || !lieu) return null;
  try {
    const reponse = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(lieu)}?languageCode=fr&regionCode=FR`,
      {
        headers: {
          "X-Goog-Api-Key": cle,
          "X-Goog-FieldMask": "rating,userRatingCount,googleMapsUri,reviews",
        },
        next: { revalidate: 6 * 3600 },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!reponse.ok) {
      console.error("Avis Google indisponibles :", reponse.status, await reponse.text().catch(() => ""));
      return null;
    }
    return convertir((await reponse.json()) as ReponsePlaces);
  } catch (e) {
    console.error("Avis Google indisponibles :", e);
    return null;
  }
}
