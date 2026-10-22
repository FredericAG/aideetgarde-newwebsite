import Link from "next/link";
import { ACompleter } from "@/components/ACompleter";
import { PageLegale, Section } from "@/components/PageLegale";
import { ENTREPRISE, VERSION_CGV } from "@/lib/entreprise";
import { formatEuros } from "@/lib/data";
import { FORMULES } from "@/lib/formules";

export const metadata = {
  title: "Conditions générales de vente — Aide & Garde",
  description:
    "Abonnement Aide & Garde : service, prix, paiement mensuel, résiliation en ligne, droit de rétractation de 14 jours et médiation.",
};

/**
 * Conditions générales de vente (Code de la consommation, art. L111-1,
 * L221-5 et suivants ; fiche service-public F37351). Elles décrivent ce que
 * fait réellement le site (spécifications § 3 et § 9). Toute modification
 * impose de changer VERSION_CGV (src/lib/entreprise.ts) : la version
 * acceptée est enregistrée avec chaque souscription.
 */
const sommaire = [
  { id: "objet", titre: "Objet et vendeur" },
  { id: "service", titre: "Le service" },
  { id: "prix", titre: "Prix" },
  { id: "souscription", titre: "Souscription et paiement" },
  { id: "duree", titre: "Durée et résiliation" },
  { id: "retractation", titre: "Droit de rétractation" },
  { id: "engagements", titre: "Vos engagements et les nôtres" },
  { id: "donnees", titre: "Données personnelles" },
  { id: "reclamations", titre: "Réclamations et médiation" },
  { id: "droit", titre: "Droit applicable" },
  { id: "formulaire", titre: "Annexe : formulaire de rétractation" },
];

export default function CgvPage() {
  const e = ENTREPRISE;
  const majLe = VERSION_CGV.split("-").reverse().join("/");
  return (
    <PageLegale titre="Conditions générales de vente" majLe={majLe} sommaire={sommaire}>
      <p className="text-xs text-foreground/60">Version {VERSION_CGV}. La version acceptée lors de votre souscription est conservée avec votre commande.</p>

      <Section id="objet" titre="1. Objet et vendeur">
        <p>
          Les présentes conditions s&apos;appliquent à l&apos;abonnement souscrit sur aideetgarde.fr auprès de{" "}
          <ACompleter valeur={e.denomination} quoi="dénomination sociale" /> ({e.nomCommercial}),{" "}
          <ACompleter valeur={e.formeJuridique} quoi="forme juridique" />,{" "}
          <ACompleter valeur={e.siege} quoi="adresse du siège" />, <ACompleter valeur={e.rcs} quoi="immatriculation" />.
          Contact : {e.email}, {e.telephone}.
        </p>
        <p>
          Elles s&apos;adressent aux particuliers qui emploient un salarié à leur domicile. Les mentions légales
          complètes figurent sur la page{" "}
          <Link href="/mentions-legales" className="text-brand-teal underline">Mentions légales</Link>.
        </p>
      </Section>

      <Section id="service" titre="2. Le service">
        <p>
          {e.nomCommercial} agit comme <strong>mandataire</strong> : vous restez l&apos;employeur de votre salarié et
          prenez les décisions qui vous reviennent (embauche, horaires, rupture du contrat). Pour chaque salarié
          compris dans votre abonnement, {e.nomCommercial} :
        </p>
        <ul>
          <li>établit le contrat de travail et ses avenants ;</li>
          <li>établit chaque mois le bulletin de paie à partir de ce que vous déclarez dans votre espace ;</li>
          <li>fait les déclarations auprès de l&apos;Urssaf (Pajemploi ou Cesu) pour votre compte ;</li>
          <li>prépare les documents de fin de contrat ;</li>
          <li>met tous ces documents à votre disposition dans votre espace, en permanence.</li>
        </ul>
        <p>
          Le nombre de salariés compris dans l&apos;abonnement dépend de la formule choisie. Le centre d&apos;aide
          donne des informations générales sur l&apos;emploi à domicile : elles ne remplacent pas un conseil
          juridique adapté à votre situation.
        </p>
        <p>
          {e.nomCommercial} exerce une activité de services à la personne :{" "}
          <ACompleter valeur={e.sap} quoi="numéro de déclaration SAP" />,{" "}
          <ACompleter valeur={e.sapAutorite} quoi="autorité" />.
        </p>
      </Section>

      <Section id="prix" titre="3. Prix">
        <div className="overflow-x-auto rounded-lg border border-brand-gray/25">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="entete-teal">
              <tr>
                <th className="px-3 py-2">Formule</th>
                <th className="px-3 py-2">Prix par mois</th>
              </tr>
            </thead>
            <tbody>
              {FORMULES.map((f) => (
                <tr key={f.quota} className="border-t border-brand-gray/20 even:bg-[#f7f7f7]">
                  <td className="px-3 py-2">Jusqu&apos;à {f.libelle}</td>
                  <td className="px-3 py-2 font-bold">{formatEuros(f.tarif)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Prix en euros, <ACompleter valeur={e.mentionPrix} quoi="mention TVA (TTC ou « TVA non applicable »)" />. Le prix
          applicable est celui affiché au moment de la souscription. En cas de changement de tarif, vous êtes
          prévenu par email au moins un mois avant ; vous pouvez alors résilier sans frais.
        </p>
      </Section>

      <Section id="souscription" titre="4. Souscription et paiement">
        <p>
          Vous souscrivez depuis votre espace, page « Mon abonnement » : vous choisissez la formule, acceptez les
          présentes conditions, demandez que le service commence tout de suite (voir l&apos;article 6), puis payez
          par carte bancaire sur la page sécurisée de Systempay (BRED Banque Populaire). {e.nomCommercial} ne voit
          jamais le numéro complet de votre carte.
        </p>
        <p>
          Le premier mois est payé à la souscription. Votre carte est ensuite débitée chaque mois à la même date
          (pour une souscription un 29, 30 ou 31 : le 28), sans frais supplémentaires. Un email de confirmation
          récapitule votre commande.
        </p>
        <p>
          Si un prélèvement est refusé, un nouvel essai a lieu 3 jours puis 7 jours après ; vous êtes prévenu par
          email à chaque refus et pouvez régler à tout moment avec une autre carte. Après trois refus, la somme
          reste due et {e.nomCommercial} prend contact avec vous.
        </p>
      </Section>

      <Section id="duree" titre="5. Durée et résiliation">
        <p>
          L&apos;abonnement est <strong>sans durée minimale</strong>. Vous pouvez le résilier à tout moment, en
          quelques clics, depuis la page{" "}
          <Link href="/tableau-de-bord/abonnement#resilier" className="text-brand-teal underline">
            Mon abonnement
          </Link>{" "}
          (lien « Résilier votre contrat » en bas de chaque page). Vous recevez une confirmation par email.
        </p>
        <p>
          La résiliation prend effet à la <strong>fin du mois civil</strong> en cours. Le mois commencé reste dû :
          une échéance qui tombe avant cette date est prélevée normalement, et aucune ne l&apos;est après. Vous
          pouvez annuler votre demande jusqu&apos;à cette date. Vos documents restent consultables dans votre
          espace après la fin de l&apos;abonnement.
        </p>
      </Section>

      <Section id="retractation" titre="6. Droit de rétractation">
        <p>
          Vous disposez de <strong>14 jours</strong> à compter de la souscription pour renoncer à votre abonnement,
          sans avoir à vous justifier ni à payer de pénalité.
        </p>
        <p>
          <strong>Comment faire :</strong> sur la page{" "}
          <Link href="/tableau-de-bord/abonnement#renoncer" className="text-brand-teal underline">
            Mon abonnement
          </Link>
          , bouton « Renoncer au contrat ici », puis « Confirmer la rétractation ». Vous recevez aussitôt par email
          un accusé de réception qui reprend votre demande, sa date et son heure. Vous pouvez aussi nous envoyer le
          formulaire ci-dessous, ou toute déclaration claire, à {e.email}.
        </p>
        <p>
          <strong>Service commencé pendant le délai :</strong> à la souscription, vous demandez expressément que
          le service commence sans attendre la fin du délai. Si vous vous rétractez, l&apos;abonnement prend fin le
          jour même et vous êtes remboursé de ce que vous avez payé, moins le montant correspondant au service
          fourni jusqu&apos;à votre rétractation (calculé au prorata des jours). Le remboursement est fait sur la
          carte utilisée, au plus tard 14 jours après votre demande.
        </p>
      </Section>

      <Section id="engagements" titre="7. Vos engagements et les nôtres">
        <p>
          Les documents sont établis à partir des informations que vous déclarez. Vous vous engagez à les donner
          exactes et complètes, et à déclarer chaque mois dans les délais indiqués dans votre espace. Vous restez
          responsable, comme employeur, du paiement du salaire et du respect du droit du travail.
        </p>
        <p>
          {e.nomCommercial} s&apos;engage à établir les documents conformément à la réglementation et à la
          convention collective en vigueur, et à les mettre à votre disposition dans les délais. Elle répond des
          erreurs qui lui sont imputables, sans répondre de celles qui viennent d&apos;informations inexactes ou
          tardives.
        </p>
      </Section>

      <Section id="donnees" titre="8. Données personnelles">
        <p>
          Le traitement de vos données et de celles de vos salariés est décrit sur la page{" "}
          <Link href="/confidentialite" className="text-brand-teal underline">Confidentialité et cookies</Link>.
        </p>
      </Section>

      <Section id="reclamations" titre="9. Réclamations et médiation">
        <p>
          Pour toute réclamation, écrivez d&apos;abord à {e.email}. Si la réponse ne vous satisfait pas, ou sans
          réponse sous deux mois, vous pouvez saisir gratuitement le médiateur de la consommation :{" "}
          <ACompleter valeur={e.mediateur} quoi="nom du médiateur" />,{" "}
          <ACompleter valeur={e.mediateurSite} quoi="site du médiateur" />, dans l&apos;année qui suit votre
          réclamation écrite.
        </p>
      </Section>

      <Section id="droit" titre="10. Droit applicable">
        <p>
          Les présentes conditions sont soumises au droit français. À défaut d&apos;accord amiable, le litige est
          porté devant le tribunal compétent selon les règles de droit commun.
        </p>
      </Section>

      <Section id="formulaire" titre="Annexe : formulaire de rétractation">
        <p className="text-xs text-foreground/70">
          Modèle prévu par le Code de la consommation. À compléter et renvoyer uniquement si vous souhaitez vous
          rétracter (le bouton « Renoncer au contrat ici » de votre espace est plus simple).
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
    </PageLegale>
  );
}
