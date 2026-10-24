import { getSessionCourante } from "@/lib/auth";
import { isUuid, type Civilite, type Gestion } from "@/lib/data";
import { contexteCourrier } from "@/lib/courriers/contexte";
import { genererCourrier } from "@/lib/courriers/generer";
import { MODELES_COURRIER, champsDuModele, estCleCourrier } from "@/lib/courriers/modeles";

export const runtime = "nodejs";

function civilite(v: FormDataEntryValue | null): Civilite {
  return v === "Madame" || v === "Monsieur" ? v : "";
}

function texte(fd: FormData, nom: string, max = 2000): string {
  const v = fd.get(nom);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/**
 * Courrier prérempli d'une gestion, en PDF (cadre « Actions »). Reçoit le
 * petit formulaire du courrier ; les coordonnées saisies (civilités, adresse
 * du salarié) sont mémorisées pour les fois suivantes. Rien d'autre n'est
 * enregistré : le PDF est fabriqué à la demande et n'est pas conservé.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return new Response("Gestion introuvable.", { status: 404 });
  const { supabase, user, profile } = await getSessionCourante();
  if (!supabase || !user) return new Response("Reconnectez-vous.", { status: 401 });

  const fd = await request.formData();
  const cle = texte(fd, "modele", 40);
  if (!estCleCourrier(cle)) return new Response("Courrier inconnu.", { status: 400 });

  const { data: gestion } = await supabase
    .from("gestions")
    .select("*")
    .eq("id", id)
    .eq("employeur_id", user.id)
    .maybeSingle<Gestion>();
  if (!gestion) return new Response("Gestion introuvable.", { status: 404 });

  const contexte = await contexteCourrier(supabase, profile, gestion);
  // Coordonnées saisies dans le formulaire : elles priment pour ce courrier
  // et sont mémorisées (une valeur vide n'efface rien).
  const saisie = {
    civilite_employeur: civilite(fd.get("civilite_employeur")),
    civilite_salarie: civilite(fd.get("civilite_salarie")),
    adresse_salarie: texte(fd, "adresse_salarie", 200),
    code_postal_salarie: texte(fd, "code_postal_salarie", 10),
    ville_salarie: texte(fd, "ville_salarie", 100),
  };
  if (saisie.civilite_employeur) contexte.employeur.civilite = saisie.civilite_employeur;
  if (saisie.civilite_salarie) contexte.salarie.civilite = saisie.civilite_salarie;
  if (saisie.adresse_salarie) contexte.salarie.adresse = saisie.adresse_salarie;
  if (saisie.code_postal_salarie) contexte.salarie.code_postal = saisie.code_postal_salarie;
  if (saisie.ville_salarie) contexte.salarie.ville = saisie.ville_salarie;

  if (Object.values(saisie).some(Boolean)) {
    // Sans le script brique3e, la mémorisation échoue en silence : le
    // courrier est tout de même produit.
    await supabase.rpc("memoriser_coordonnees_courrier", {
      p_gestion_id: id,
      p_civilite_employeur: saisie.civilite_employeur,
      p_civilite_salarie: saisie.civilite_salarie,
      p_adresse_salarie: saisie.adresse_salarie,
      p_code_postal_salarie: saisie.code_postal_salarie,
      p_ville_salarie: saisie.ville_salarie,
    });
  }

  const valeurs: Record<string, string> = {};
  for (const champ of champsDuModele(MODELES_COURRIER[cle])) {
    valeurs[champ.nom] = texte(fd, champ.nom);
  }

  const { octets, fichier } = await genererCourrier(cle, contexte, valeurs);
  return new Response(Buffer.from(octets), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fichier}"`,
      "Cache-Control": "no-store",
    },
  });
}
