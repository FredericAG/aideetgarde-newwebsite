import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Créer mon compte — Aide & Garde",
  description: "Créez votre espace employeur Aide & Garde en 2 minutes, gratuitement et sans engagement.",
  alternates: { canonical: "/inscription" },
};

export default function InscriptionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
