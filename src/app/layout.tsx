import type { Metadata, Viewport } from "next";
import { corporative, stevieSans } from "@/fonts";
import { SiteHeader } from "@/components/SiteHeader";
import { NavigationTelephone } from "@/components/NavigationTelephone";
import { PiedDePage } from "@/components/PiedDePage";
import "./globals.css";

export const viewport: Viewport = {
  // Couleur de la barre du navigateur / de l'application installée.
  themeColor: "#376873",
  // Permet à la barre d'onglets du téléphone de tenir compte de la zone
  // du geste d'accueil de l'iPhone (env(safe-area-inset-bottom)).
  viewportFit: "cover",
};

export const metadata: Metadata = {
  // Une fois installé sur l'écran d'accueil d'un iPhone, le site s'ouvre
  // en plein écran avec ce nom sous l'icône.
  appleWebApp: { capable: true, title: "Aide & Garde", statusBarStyle: "default" },
  title: "Aide & Garde",
  description:
    "Aide & Garde — mandataire en emploi direct : garde d'enfants, auxiliaires de vie, employés de maison.",
  // Site de test : aucune page ne doit apparaître dans les moteurs de
  // recherche tant que NEXT_PUBLIC_INDEXATION ne vaut pas "oui" (voir
  // src/app/robots.ts).
  robots:
    process.env.NEXT_PUBLIC_INDEXATION === "oui"
      ? undefined
      : { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${corporative.variable} ${stevieSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        {children}
        <PiedDePage />
        <NavigationTelephone />
      </body>
    </html>
  );
}
