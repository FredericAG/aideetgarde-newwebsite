/**
 * Mise en page des pages légales (mentions légales, confidentialité, CGV) :
 * titre, date de mise à jour, sommaire et texte lisible (colonne étroite).
 */
export function PageLegale({
  titre,
  majLe,
  sommaire,
  children,
}: {
  titre: string;
  majLe: string;
  sommaire?: { id: string; titre: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 sm:py-12">
      <article className="texte-legal w-full max-w-3xl">
        <h1 className="font-display font-black text-2xl text-brand-teal">{titre}</h1>
        <p className="mt-1 text-xs text-foreground/60">Mis à jour le {majLe}</p>
        {sommaire && (
          <nav aria-label="Sommaire" className="carte mt-6 p-4 text-sm">
            <ol className="list-decimal space-y-1 pl-5">
              {sommaire.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-brand-teal underline">
                    {s.titre}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}
        <div className="mt-6 flex flex-col gap-6 text-sm leading-relaxed text-foreground/90">{children}</div>
      </article>
    </div>
  );
}

/** Section numérotée d'une page légale. */
export function Section({ id, titre, children }: { id: string; titre: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-4">
      <h2 className="mb-2 font-bold text-brand-teal">{titre}</h2>
      <div className="flex flex-col gap-2 [&_li]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1">{children}</div>
    </section>
  );
}
