import Link from "next/link";

/** Invitation à recommander Aide & Garde à un proche (bouche à oreille). */
export function EncartRecommander({ className = "" }: { className?: string }) {
  return (
    <section
      aria-label="Recommander Aide & Garde"
      className={`flex flex-col gap-3 rounded-xl border-2 border-brand-jaune bg-brand-jaune/15 p-4 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <p className="text-sm">
        <strong className="text-brand-teal">Satisfait d&apos;Aide &amp; Garde ?</strong> Parlez-en à un proche qui
        emploie quelqu&apos;un à domicile : c&apos;est ce qui nous fait grandir.
      </p>
      <Link href="/recommander" className="btn btn-primaire btn-sm shrink-0 self-start sm:self-auto">
        Recommander à un proche
      </Link>
    </section>
  );
}
