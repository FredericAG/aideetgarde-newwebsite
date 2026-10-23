import { redirect } from "next/navigation";

/**
 * Ancienne page « Découvrir » (23/10) : son contenu est désormais la page
 * d'accueil. Les liens déjà envoyés dans les emails de recommandation
 * (/decouvrir?source=recommandation) y mènent toujours.
 */
export default async function Decouvrir({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  const { source } = await searchParams;
  redirect(source === "recommandation" ? "/?source=recommandation" : "/");
}
