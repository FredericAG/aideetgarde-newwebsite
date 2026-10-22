import Image from "next/image";
import Link from "next/link";
import { GererCookies } from "./Consentement";
import { ENTREPRISE } from "@/lib/entreprise";

/**
 * Pied de page de toutes les pages : liens vers les informations légales
 * (mentions légales, confidentialité et cookies, CGV) et vers la
 * résiliation en ligne, qui doivent rester accessibles en permanence
 * (service-public.gouv.fr, fiche F37351 ; Code de la consommation,
 * art. L215-1-1).
 *
 * Sur ordinateur, ces liens restent visibles en permanence dans une bande
 * fine fixée en bas de l'écran (demande de Frédéric du 23/10) ; le logo
 * « Services à la personne » et la mention mandataire restent en fin de
 * page. Sur téléphone, c'est la barre d'onglets qui est fixe : les liens
 * restent en fin de page.
 */
export function PiedDePage() {
  const lien = "underline-offset-2 hover:underline";
  const liens = (
    <>
      <span>© Aide &amp; Garde</span>
      <Link href="/mentions-legales" className={lien}>
        Mentions légales
      </Link>
      <Link href="/confidentialite" className={lien}>
        Confidentialité et cookies
      </Link>
      <GererCookies className={lien} />
      <Link href="/cgv" className={lien}>
        Conditions générales de vente
      </Link>
      <Link href="/tableau-de-bord/abonnement#resilier" className={lien}>
        Résilier votre contrat
      </Link>
      <Link href="/aide#contact" className={lien}>
        Contact
      </Link>
    </>
  );
  return (
    <>
      <footer className="mt-auto border-t border-brand-gray/15 px-4 py-5 text-xs text-foreground/60 sm:px-6">
        <nav aria-label="Informations légales" className="mx-auto mb-3 flex w-full max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 sm:hidden">
          {liens}
        </nav>
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3">
          {/* Logo du secteur des services à la personne : obligatoire sur les
              supports commerciaux des organismes déclarés (Code du travail,
              art. R7232-19). Charte graphique NOVA : fichier d'origine non
              modifié, au moins 60 px de large, cliquable vers
              servicesalapersonne.gouv.fr, zone de protection autour. */}
          <a
            href="https://www.servicesalapersonne.gouv.fr/"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 bg-white p-2"
            aria-label="Services à la personne (site du ministère, nouvelle fenêtre)"
          >
            <Image src="/logo-services-a-la-personne.jpg" alt="S ! services à la personne" width={80} height={68} unoptimized />
          </a>
          <p className="text-[0.7rem] leading-relaxed text-foreground/50">
            Aide et Garde, organisme de services à la personne déclaré (n° SAP {ENTREPRISE.numeroSap}), intervient en
            mode mandataire : vous êtes l&apos;employeur de votre salarié à domicile.{" "}
            <Link href="/mentions-legales#activite" className={lien}>
              Activités déclarées
            </Link>
          </p>
        </div>
      </footer>
      {/* Ordinateur : bande fixe en bas de l'écran, et sa place réservée en
          fin de page pour ne rien masquer. */}
      <div aria-hidden="true" className="hidden h-9 sm:block" />
      <nav
        aria-label="Informations légales"
        className="fixed inset-x-0 bottom-0 z-30 hidden h-9 border-t border-brand-gray/15 bg-white px-6 text-xs text-foreground/60 shadow-[0_-2px_8px_rgba(0,0,0,0.05)] sm:block"
      >
        <div className="mx-auto flex h-full w-full max-w-5xl items-center gap-x-5 overflow-x-auto whitespace-nowrap">
          {liens}
        </div>
      </nav>
    </>
  );
}
