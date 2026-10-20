import { ListeComptes } from "./ListeComptes";

export const metadata = { title: "Comptes — Administration Aide & Garde" };

/** Onglet « Comptes » de l'administration (voir ListeComptes.tsx). */
export default function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return <ListeComptes searchParams={searchParams} />;
}
