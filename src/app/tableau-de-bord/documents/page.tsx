import { redirect } from "next/navigation";
import { isUuid } from "@/lib/data";

/**
 * Ancien onglet « Mes documents » : remplacé le 24/10 par « Mes gestions »
 * (les documents de chaque salarié sont en bas de sa gestion). Les liens
 * déjà envoyés (emails, notifications) y mènent toujours.
 */
export default async function AnciennesPagesDocuments({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const salarie = Array.isArray(sp.salarie) ? sp.salarie[0] : sp.salarie;
  redirect(salarie && isUuid(salarie) ? `/tableau-de-bord/gestions/${salarie}#documents` : "/tableau-de-bord/gestions");
}
