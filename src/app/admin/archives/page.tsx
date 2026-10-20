import { ListeComptes } from "../ListeComptes";

export const metadata = { title: "Comptes archivés — Administration Aide & Garde" };

/** Onglet « Archivés » : comptes inactifs (voir ListeComptes.tsx). */
export default function ArchivesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return <ListeComptes searchParams={searchParams} archives />;
}
