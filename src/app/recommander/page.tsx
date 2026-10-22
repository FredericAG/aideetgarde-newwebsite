import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { FormulaireRecommandation } from "./FormulaireRecommandation";

export const metadata: Metadata = {
  title: "Recommander Aide & Garde",
  robots: { index: false, follow: false },
};

/**
 * Recommandation par un abonné (bouche à oreille) : il écrit à un proche,
 * qui reçoit un email avec un lien vers la page « Découvrir Aide & Garde ».
 */
export default async function RecommanderPage() {
  const { user, profile } = await requireUser("/recommander");
  const signature = [profile?.prenom, profile?.nom].filter(Boolean).join(" ").trim() || user.email || "";

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-2xl">
        <h1 className="font-display font-black text-2xl text-brand-teal">Recommander Aide &amp; Garde</h1>
        <p className="mt-2 text-sm text-foreground/75">
          Un proche emploie quelqu&apos;un à domicile, ou s&apos;apprête à le faire ? Le bouche à oreille est ce qui
          nous fait grandir : merci de lui parler de nous. Indiquez son adresse email, relisez le message, et
          envoyez.
        </p>
        <div className="carte mt-6 p-5">
          <FormulaireRecommandation signature={signature} />
        </div>
      </div>
    </div>
  );
}
