import Link from "next/link";

/** Page « introuvable », en français et aux couleurs du site. */
export default function PageIntrouvable() {
  return (
    <div className="flex flex-1 justify-center px-6 py-16">
      <div className="w-full max-w-xl text-center">
        <p className="font-display text-5xl font-black text-brand-violet">404</p>
        <h1 className="mt-4 font-display text-2xl font-black text-brand-teal">Page introuvable</h1>
        <p className="mt-3 text-sm text-foreground/70">
          Cette page n&apos;existe pas, ou n&apos;est pas accessible avec le
          compte actuellement connecté.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/tableau-de-bord" className="btn btn-primaire">
            Mon tableau de bord
          </Link>
          <Link href="/aide" className="btn btn-secondaire">
            Aide et contact
          </Link>
        </div>
      </div>
    </div>
  );
}
