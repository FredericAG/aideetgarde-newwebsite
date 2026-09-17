import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-24 dark:bg-background">
      <main className="flex w-full max-w-2xl flex-col items-center gap-8 text-center">
        <span className="font-display font-black uppercase tracking-wide rounded-full bg-brand-jaune px-4 py-1 text-sm text-brand-black">
          Refonte en cours — Brique 0
        </span>

        <Image
          src="/aide-et-garde-logo.svg"
          alt="Aide & Garde"
          width={505}
          height={159}
          priority
          className="h-16 w-auto sm:h-20"
        />

        <p className="max-w-md text-lg leading-8 text-foreground/80">
          Nouvelle base technique du site en construction (Next.js, Tailwind,
          Firebase, Vercel). Le site actuel continue de fonctionner normalement
          pour les abonnés pendant toute la durée du développement.
        </p>

        <div className="mt-4 grid w-full gap-3 text-left text-sm text-foreground/70 sm:grid-cols-2">
          <div className="rounded-lg border border-brand-teal/20 bg-background/60 p-4">
            <p className="font-bold text-brand-teal">Étape actuelle</p>
            <p>Brique 0 — fondations (Next.js, Tailwind, Vercel).</p>
          </div>
          <div className="rounded-lg border border-brand-violet/20 bg-background/60 p-4">
            <p className="font-bold text-brand-violet">Prochaine étape</p>
            <p>Authentification et espace &laquo; Mon compte &raquo;.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
