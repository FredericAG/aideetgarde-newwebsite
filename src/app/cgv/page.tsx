import Link from "next/link";
import { ACompleter } from "@/components/ACompleter";
import { PageLegale, Section } from "@/components/PageLegale";
import { ENTREPRISE, MENTION_MANDATAIRE, VERSION_CGV, libelleTva, prixHT } from "@/lib/entreprise";
import { formatEuros } from "@/lib/data";
import { FORMULES } from "@/lib/formules";

export const metadata = {
  title: "Conditions générales de vente — Aide & Garde",
  description:
    "Abonnement Aide & Garde : objet du mandat, prix, paiement, résiliation en ligne, droit de rétractation et médiation.",
};

/**
 * Conditions générales de vente, limitées aux mentions obligatoires
 * (décision de Frédéric du 22/10/2026) :
 * - vente à distance : Code de la consommation, art. L111-1, L221-5,
 *   L221-25, L616-1, formulaire type (annexe à l'art. R221-1) ;
 * - services à la personne en mode mandataire : arrêté du 17 mars 2015
 *   (mention « le consommateur est l'employeur » en première page, prix
 *   HT et TTC, frais de mandat) ; objet du mandat (DGCCRF).
 * Toute modification impose de changer VERSION_CGV (src/lib/entreprise.ts) :
 * la version acceptée est enregistrée avec chaque souscription.
 */
const sommaire = [
  { id: "vendeur", titre: "Vendeur" },
  { id: "mandat", titre: "Objet du mandat" },
  { id: "employeur", titre: "Vos obligations d'employeur" },
  { id: "prix", titre: "Prix et paiement" },
  { id: "duree", titre: "Durée et résiliation" },
  { id: "retractation", titre: "Droit de rétractation" },
  { id: "reclamations", titre: "Réclamations et médiation" },
  { id: "formulaire", titre: "Annexe : formulaire de rétractation" },
];

export default function CgvPage() {
  const e = ENTREPRISE;
  const majLe = VERSION_CGV.split("-").reverse().join("/");
  const tva = libelleTva();
  // Franchise en base de TVA : un seul prix (pas de distinction HT / TTC).
  const franchise = e.tauxTva === 0;
  return (
    <PageLegale titre="Conditions générales de vente" majLe={majLe} sommaire={sommaire}>
      <p className="rounded-md border-l-4 border-brand-jaune bg-brand-jaune/15 px-3 py-2 text-sm">
        <strong>Mode mandataire.</strong> {MENTION_MANDATAIRE}
      </p>

      <Section id="vendeur" titre="1. Vendeur">
        <p>
          <ACompleter valeur={e.denomination} quoi="dénomination sociale" /> ({e.nomCommercial}),{" "}
          <ACompleter valeur={e.formeJuridique} quoi="forme juridique" />, <ACompleter valeur={e.siege} quoi="adresse du siège" />,{" "}
          <ACompleter valeur={e.rcs} quoi="immatriculation" />, organisme de services à la personne déclaré sous le n° SAP {e.numeroSap}. Contact : {e.email}, {e.telephone}.
        </p>
      </Section>

      <Section id="mandat" titre="2. Objet du mandat">
        <p>
          Pour chaque salarié compris dans la formule choisie, vous donnez mandat à {e.nomCommercial} pour :
        </p>
        <ul>
          <li>établir le contrat de travail et ses avenants ;</li>
          <li>établir chaque mois le bulletin de paie à partir des informations que vous déclarez dans votre espace ;</li>
          <li>déclarer les salaires en votre nom auprès de l&apos;Urssaf (Pajemploi ou Cesu), dans les conditions de l&apos;article 3 ;</li>
          <li>établir les documents de fin de contrat ;</li>
          <li>mettre ces documents à votre disposition dans votre espace.</li>
        </ul>
      </Section>

      <Section id="employeur" titre="3. Vos obligations d'employeur">
        <p>
          Il vous appartient d&apos;ouvrir votre compte employeur à l&apos;Urssaf (Pajemploi pour la garde
          d&apos;enfants, Cesu pour les autres emplois à domicile), de transmettre à {e.nomCommercial} les
          informations de ce compte nécessaires aux déclarations, et de lui demander expressément de déclarer en
          votre nom. À défaut, {e.nomCommercial} ne peut pas déclarer pour votre compte et les déclarations restent à
          votre charge.
        </p>
        <p>
          Les documents sont établis à partir des informations que vous transmettez : vous êtes responsable de leur
          exactitude et de leur transmission dans les délais indiqués dans votre espace.
        </p>
      </Section>

      <Section id="prix" titre="4. Prix et paiement">
        <div className="overflow-x-auto rounded-lg border border-brand-gray/25">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="entete-teal">
              <tr>
                <th className="px-3 py-2">Formule</th>
                <th className="px-3 py-2">{franchise ? "Prix par mois" : "Prix TTC par mois"}</th>
                {!franchise && <th className="px-3 py-2">Prix HT par mois</th>}
              </tr>
            </thead>
            <tbody>
              {FORMULES.map((f) => (
                <tr key={f.quota} className="border-t border-brand-gray/20 even:bg-[#f7f7f7]">
                  <td className="px-3 py-2">Jusqu&apos;à {f.libelle}</td>
                  <td className="px-3 py-2 font-bold">{formatEuros(f.tarif)}</td>
                  {!franchise && (
                    <td className="px-3 py-2">
                      {prixHT(f.tarif) !== null ? formatEuros(prixHT(f.tarif)!) : <ACompleter valeur={null} quoi="taux de TVA" />}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          {tva ?? <ACompleter valeur={null} quoi="taux de TVA (20 % ou « TVA non applicable »)" />}. Le prix correspond aux
          frais de mandat ; il ne comprend ni le salaire ni les cotisations sociales de vos salariés.
        </p>
        <p>
          Paiement par carte bancaire (Systempay) : le premier mois à la souscription, puis chaque mois à la même
          date (le 28 pour une souscription un 29, 30 ou 31).
        </p>
      </Section>

      <Section id="duree" titre="5. Durée et résiliation">
        <p>
          L&apos;abonnement est à durée indéterminée, sans durée minimale. Il se résilie à tout moment en ligne, depuis
          la page{" "}
          <Link href="/tableau-de-bord/abonnement#resilier" className="text-brand-teal underline">
            Mon abonnement
          </Link>{" "}
          (lien « Résilier votre contrat » en bas de chaque page). La résiliation prend effet à la fin du mois civil
          en cours ; le mois commencé reste dû.
        </p>
      </Section>

      <Section id="retractation" titre="6. Droit de rétractation">
        <p>
          Vous disposez de 14 jours à compter de la souscription pour vous rétracter, sans motif ni pénalité : bouton
          « Renoncer au contrat ici » de la page{" "}
          <Link href="/tableau-de-bord/abonnement#renoncer" className="text-brand-teal underline">
            Mon abonnement
          </Link>
          , formulaire ci-dessous ou toute déclaration dénuée d&apos;ambiguïté adressée à {e.email}.
        </p>
        <p>
          Ayant demandé que le service commence pendant ce délai, vous êtes remboursé du montant payé, moins le
          montant correspondant au service fourni jusqu&apos;à votre rétractation, au plus tard 14 jours après
          celle-ci, sur la carte utilisée.
        </p>
      </Section>

      <Section id="reclamations" titre="7. Réclamations et médiation">
        <p>
          Réclamations : {e.email}. En cas de litige non résolu, vous pouvez recourir gratuitement au médiateur de la
          consommation : <ACompleter valeur={e.mediateur} quoi="nom du médiateur" />,{" "}
          <ACompleter valeur={e.mediateurSite} quoi="site du médiateur" />.
        </p>
      </Section>

      <Section id="formulaire" titre="Annexe : formulaire de rétractation">
        <p className="text-xs text-foreground/70">
          Veuillez compléter et renvoyer le présent formulaire uniquement si vous souhaitez vous rétracter du contrat.
        </p>
        <div className="rounded-lg border border-brand-gray/30 bg-white p-4 text-sm">
          <p>
            À l&apos;attention de <ACompleter valeur={e.denomination} quoi="dénomination sociale" /> ({e.nomCommercial}),{" "}
            <ACompleter valeur={e.siege} quoi="adresse du siège" />, {e.email} :
          </p>
          <p className="mt-2">
            Je vous notifie par la présente ma rétractation du contrat portant sur la prestation de services
            ci-dessous : abonnement Aide &amp; Garde.
          </p>
          <div className="mt-2 space-y-1">
            <p>Commandé le : ……………………</p>
            <p>Nom du consommateur : ……………………</p>
            <p>Adresse du consommateur : ……………………</p>
            <p>Signature (uniquement en cas d&apos;envoi sur papier) : ……………………</p>
            <p>Date : ……………………</p>
          </div>
        </div>
      </Section>

      <p className="text-xs text-foreground/60">Version {VERSION_CGV}.</p>
    </PageLegale>
  );
}
