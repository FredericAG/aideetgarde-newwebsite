import Link from "next/link";
import { GuideInstallationComplet } from "@/components/Installation";

export const metadata = {
  title: "Installer l'application sur mon téléphone — Aide & Garde",
  description:
    "Ajoutez l'espace Aide & Garde à l'écran d'accueil de votre téléphone (Android, Samsung, iPhone) : les étapes, une par une.",
};

/**
 * Installer l'espace Aide & Garde sur l'écran d'accueil (page publique,
 * utile aussi à un proche qui aide l'abonné). Les étapes affichées sont
 * celles du téléphone utilisé.
 */
export default function InstallerPage() {
  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-xl">
        <h1 className="font-display font-black text-2xl text-brand-teal">Installer Aide &amp; Garde sur mon téléphone</h1>
        <p className="mt-2 text-base text-foreground/80">
          Une icône sur l&apos;écran d&apos;accueil, comme une application : vous retrouvez vos bulletins et vos
          salariés en un geste. Rien à télécharger dans un magasin d&apos;applications, c&apos;est gratuit et
          cela prend une minute.
        </p>
        <GuideInstallationComplet />
        <p className="mt-8 text-sm text-foreground/70">
          Une difficulté ? Appelez-nous, nous vous guidons pas à pas.{" "}
          <Link href="/aide/mon-espace#installer" className="font-medium text-brand-teal underline">
            Aide
          </Link>
        </p>
      </div>
    </div>
  );
}
