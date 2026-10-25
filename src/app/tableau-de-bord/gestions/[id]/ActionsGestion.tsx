"use client";

import Link from "next/link";
import { useState } from "react";
import type { Declaration, DemandeAvenant as DemandeAvenantType, ModeFinContrat, Signalement } from "@/lib/data";
import type { ContexteCourrier } from "@/lib/courriers/modeles";
import { CorrectionBulletin } from "./CorrectionBulletin";
import { DeclarationMois } from "./DeclarationMois";
import { DemandeAvenant } from "./DemandeAvenant";
import { FormulaireCourrier } from "./FormulaireCourrier";
import { PrevenirAideEtGarde } from "./PrevenirAideEtGarde";

export type CleAction =
  | "declarer"
  | "corriger"
  | "avenant"
  | "attestation"
  | "arret"
  | "accident"
  | "maternite"
  | "fin"
  | "courriers";


/**
 * Actions rangées par verbe (demande du 25/10) : la ligne « Déclarer » vient
 * en premier, avec « Le mois » mis en avant (l'action de chaque mois).
 */
const GROUPES: { verbe: string; actions: { cle: CleAction; libelle: string; court: string }[] }[] = [
  {
    verbe: "Déclarer",
    actions: [
      { cle: "declarer", libelle: "Le mois", court: "Le mois" },
      { cle: "arret", libelle: "Un arrêt maladie", court: "Arrêt maladie" },
      { cle: "accident", libelle: "Un accident du travail", court: "Accident du travail" },
      { cle: "maternite", libelle: "Un congé maternité", court: "Congé maternité" },
    ],
  },
  {
    verbe: "Demander",
    actions: [
      { cle: "avenant", libelle: "Un avenant", court: "Avenant" },
      { cle: "corriger", libelle: "Une correction de bulletin", court: "Correction de bulletin" },
    ],
  },
  {
    verbe: "Rédiger",
    actions: [
      { cle: "attestation", libelle: "Une attestation d'emploi", court: "Attestation d'emploi" },
      { cle: "courriers", libelle: "Un autre courrier", court: "Autre courrier" },
    ],
  },
  { verbe: "Prévoir", actions: [{ cle: "fin", libelle: "Une fin de contrat", court: "Fin de contrat" }] },
];

const MODES_FIN: { cle: Exclude<ModeFinContrat, "retraite">; libelle: string }[] = [
  { cle: "licenciement", libelle: "Licenciement" },
  { cle: "rupture_conventionnelle", libelle: "Rupture conventionnelle" },
  { cle: "demission", libelle: "Démission" },
];

function Etape({ n, titre, children }: { n: number; titre: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-violet text-xs font-bold text-white"
      >
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-brand-teal">{titre}</p>
        <div className="mt-1 flex flex-col gap-2 text-sm">{children}</div>
      </div>
    </li>
  );
}

function LienAide({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm font-medium text-brand-teal underline">
      {children}
    </Link>
  );
}

/**
 * Cadre « Actions » de la gestion (demande du 24/10/2026) : remplace les
 * cartes « Déclarer le mois » et « Un changement dans le contrat ? ».
 * L'action principale (déclarer le mois) est ouverte d'office ; les autres
 * sont à un clic, chacune avec ses courriers préremplis et, au besoin, le
 * bouton « Prévenir Aide & Garde ».
 */
export function ActionsGestion({
  gestionId,
  actionInitiale,
  contexte,
  declaration,
  bulletins,
  declarations,
  avenantEnAttente,
  signalements,
}: {
  gestionId: string;
  actionInitiale: CleAction;
  contexte: ContexteCourrier;
  declaration: { options: { valeur: string; libelle: string }[]; parDefaut: string };
  bulletins: { periode: string; documentId: string }[];
  declarations: Declaration[];
  avenantEnAttente: DemandeAvenantType | null;
  signalements: Signalement[];
}) {
  const [action, setAction] = useState<CleAction>(actionInitiale);
  const [modeFin, setModeFin] = useState<Exclude<ModeFinContrat, "retraite">>(
    (signalements.find((s) => s.type === "fin_contrat" && s.statut === "envoyee")?.precision as Exclude<ModeFinContrat, "retraite">) ||
      "licenciement",
  );
  const enAttente = (types: Signalement["type"][]) =>
    signalements.some((s) => types.includes(s.type) && s.statut === "envoyee");
  const pastille: Partial<Record<CleAction, boolean>> = {
    avenant: Boolean(avenantEnAttente),
    arret: enAttente(["arret_maladie"]),
    accident: enAttente(["accident_travail"]),
    maternite: enAttente(["conge_maternite"]),
    fin: enAttente(["fin_contrat"]),
  };
  const garde = contexte.gestion.type_gestion === "garde_enfants";
  // Congé maternité : masqué seulement si le salarié est un homme.
  const groupes = GROUPES.map((g) => ({
    ...g,
    actions: g.actions.filter((a) => a.cle !== "maternite" || contexte.salarie.civilite !== "Monsieur"),
  }));
  const courrier = (cle: Parameters<typeof FormulaireCourrier>[0]["cle"], replie = false) => (
    <FormulaireCourrier key={cle} gestionId={gestionId} cle={cle} contexte={contexte} replie={replie} />
  );

  return (
    <section id="declaration" aria-labelledby="titre-actions" className="carte mt-6 scroll-mt-24 p-4 sm:p-5">
      <h2 id="titre-actions" className="text-sm font-bold text-brand-violet">
        Que souhaitez-vous faire ?
      </h2>

      <div role="tablist" aria-label="Actions" className="mt-2 flex flex-col gap-2.5 sm:grid sm:grid-cols-[5.5rem_1fr] sm:items-baseline sm:gap-x-2 sm:gap-y-2">
        {groupes.map((g) => (
          <div key={g.verbe} className="flex flex-col gap-1 sm:contents">
            <span className="text-xs font-bold uppercase tracking-wide text-foreground/55">{g.verbe}</span>
            <div className="flex flex-wrap gap-1.5">
              {g.actions.map((a) => {
                const actif = a.cle === action;
                const principal = a.cle === "declarer";
                return (
                  <button
                    key={a.cle}
                    type="button"
                    role="tab"
                    aria-selected={actif}
                    aria-controls="panneau-action"
                    onClick={() => setAction(a.cle)}
                    className={`relative rounded-full border px-2.5 py-1 text-sm leading-snug sm:px-3 transition-colors ${
                      actif
                        ? "border-brand-violet bg-brand-violet font-bold text-white"
                        : principal
                          ? "border-2 border-brand-violet bg-white font-bold text-brand-violet hover:bg-brand-violet/5"
                          : "border-brand-gray/35 bg-white text-brand-teal hover:border-brand-violet/50"
                    } ${pastille[a.cle] ? "pr-6 sm:pr-7" : ""}`}
                  >
                    <span className="sm:hidden">{a.court}</span>
                    <span className="hidden sm:inline">{a.libelle}</span>
                    {pastille[a.cle] && (
                      <span
                        className={`absolute right-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full ${actif ? "bg-brand-jaune" : "bg-brand-violet"}`}
                        title="Demande en cours"
                        aria-label="Demande en cours"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div id="panneau-action" role="tabpanel" className="mt-4 border-t border-brand-gray/15 pt-4">
        {action === "declarer" && (
          <DeclarationMois
            key={gestionId}
            gestionId={gestionId}
            options={declaration.options}
            parDefaut={declaration.parDefaut}
            declarations={declarations}
          />
        )}

        {action === "corriger" && (
          <CorrectionBulletin gestionId={gestionId} bulletins={bulletins} declarations={declarations} />
        )}

        {action === "avenant" && <DemandeAvenant gestionId={gestionId} enAttente={avenantEnAttente} />}

        {action === "attestation" && courrier("attestation_emploi")}

        {action === "arret" && (
          <div className="flex flex-col gap-4">
            <ol className="flex flex-col gap-5">
              <Etape n={1} titre="Prévenez-nous : nous établissons l'attestation de salaire">
                <PrevenirAideEtGarde
                  gestionId={gestionId}
                  type="arret_maladie"
                  signalements={signalements}
                  titre="Arrêt maladie de votre salarié"
                  texte="Dès réception de l'avis d'arrêt de travail. Nous préparons l'attestation de salaire (cerfa 11135*04, formulaire S3201) : elle permet à votre salarié de toucher ses indemnités journalières."
                  placeholder="ex. arrêt jusqu'au 15 novembre, prolongation possible"
                />
              </Etape>
              <Etape n={2} titre="Remettez à votre salarié l'attestation sur l'honneur">
                <p className="text-foreground/70">
                  Formulaire de l&apos;Assurance Maladie pour les salariés de particuliers employeurs : il le complète, le
                  signe et l&apos;envoie à sa CPAM.
                </p>
                {courrier("atthon_maladie", true)}
              </Etape>
              <Etape n={3} titre="Besoin d'un remplaçant ?">
                <p className="text-foreground/70">
                  Un CDD de remplacement ne prend pas de place dans votre abonnement.{" "}
                  <Link href={`/tableau-de-bord/gestions/nouvelle?remplace=${gestionId}`} className="font-medium text-brand-teal underline">
                    Ajouter un salarié remplaçant
                  </Link>
                </p>
              </Etape>
            </ol>
            <LienAide href="/aide/arret-de-travail#arret-maladie">En savoir plus sur l&apos;arrêt maladie</LienAide>
          </div>
        )}

        {action === "accident" && (
          <div className="flex flex-col gap-4">
            <ol className="flex flex-col gap-5">
              <Etape n={1} titre="Prévenez-nous : l'attestation de salaire est obligatoire">
                <PrevenirAideEtGarde
                  gestionId={gestionId}
                  type="accident_travail"
                  signalements={signalements}
                  titre="Accident du travail de votre salarié"
                  texte="Nous préparons l'attestation de salaire « accident du travail » (cerfa 11137*03, formulaire S6202), à envoyer à la CPAM de votre salarié."
                  placeholder="ex. chute dans l'escalier, arrêt de travail prescrit jusqu'au…"
                />
              </Etape>
              <Etape n={2} titre="Déclarez l'accident dans les 48 heures">
                <p className="text-foreground/70">
                  À envoyer en recommandé avec avis de réception à la CPAM du lieu de résidence de votre salarié, au plus
                  tard 48 heures après avoir appris l&apos;accident (dimanches et jours fériés non compris).
                </p>
                {courrier("declaration_accident", true)}
                <p className="text-xs text-foreground/60">
                  Feuille d&apos;accident (cerfa 11383) : elle donne à votre salarié la gratuité des soins. Le modèle en
                  ligne n&apos;est qu&apos;un spécimen : l&apos;original se demande à la CPAM, qui peut aussi le remettre
                  directement à votre salarié.
                </p>
              </Etape>
              <Etape n={3} titre="Remettez à votre salarié l'attestation sur l'honneur">
                {courrier("atthon_accident", true)}
              </Etape>
            </ol>
            <LienAide href="/aide/arret-de-travail#accident-du-travail">En savoir plus sur l&apos;accident du travail</LienAide>
          </div>
        )}

        {action === "maternite" && (
          <div className="flex flex-col gap-4">
            <ol className="flex flex-col gap-5">
              <Etape n={1} titre="Prévenez-nous : nous préparons l'attestation de salaire">
                <PrevenirAideEtGarde
                  gestionId={gestionId}
                  type="conge_maternite"
                  signalements={signalements}
                  titre="Congé maternité de votre salariée"
                  texte="Indiquez la date de début du congé. Aide & Garde prépare l'attestation de salaire (cerfa 11135*04, formulaire S3201) qui permet à votre salariée d'être indemnisée par l'Assurance Maladie."
                  placeholder="ex. congé prénatal à partir du…, date prévue de l'accouchement"
                />
              </Etape>
              <Etape n={2} titre="Pendant le congé">
                <p className="text-foreground/70">
                  Votre salariée est indemnisée par l&apos;Assurance Maladie : pas de salaire à verser pour cette période.
                  Signalez simplement son absence dans votre déclaration du mois.
                </p>
              </Etape>
              <Etape n={3} titre="Besoin d'un remplaçant ?">
                <p className="text-foreground/70">
                  Un CDD de remplacement ne prend pas de place dans votre abonnement.{" "}
                  <Link href={`/tableau-de-bord/gestions/nouvelle?remplace=${gestionId}`} className="font-medium text-brand-teal underline">
                    Ajouter un salarié remplaçant
                  </Link>
                </p>
              </Etape>
            </ol>
            <LienAide href="/aide/arret-de-travail#conge-maternite">En savoir plus sur le congé maternité</LienAide>
          </div>
        )}

        {action === "fin" && (
          <div className="flex flex-col gap-4">
            <div role="radiogroup" aria-label="Mode de fin de contrat" className="flex flex-wrap gap-2">
              {MODES_FIN.map((m) => (
                <button
                  key={m.cle}
                  type="button"
                  role="radio"
                  aria-checked={modeFin === m.cle}
                  onClick={() => setModeFin(m.cle)}
                  className={`btn btn-sm ${modeFin === m.cle ? "btn-primaire" : "btn-secondaire"}`}
                >
                  {m.libelle}
                </button>
              ))}
            </div>

            {modeFin === "licenciement" && (
              <>
                <p className="text-sm text-foreground/70">
                  Trois étapes obligatoires, dans l&apos;ordre. Nous établissons ensuite les documents de fin de contrat.
                </p>
                <ol className="flex flex-col gap-5">
                  <Etape n={1} titre="Convoquez votre salarié à un entretien préalable">
                    {courrier("convocation_entretien", true)}
                  </Etape>
                  <Etape n={2} titre="Tenez l'entretien">
                    <p className="text-foreground/70">
                      Au plus tôt le 5e jour ouvrable après la remise de la convocation. Exposez les motifs et écoutez
                      votre salarié ; ne confirmez pas le licenciement pendant l&apos;entretien.
                    </p>
                  </Etape>
                  <Etape n={3} titre="Envoyez la lettre de licenciement">
                    <p className="text-foreground/70">
                      En recommandé, entre le 5e et le 30e jour ouvrable après l&apos;entretien. Le préavis est calculé
                      d&apos;après l&apos;ancienneté.
                    </p>
                    {courrier("notification_licenciement", true)}
                    {garde && (
                      <p className="text-xs text-foreground/60">
                        Le texte « Changement de mode de garde » est proposé dans la liste des motifs.
                      </p>
                    )}
                  </Etape>
                  <Etape n={4} titre="Prévenez-nous pour les documents de fin de contrat">
                    <PrevenirAideEtGarde
                      gestionId={gestionId}
                      type="fin_contrat"
                      precision="licenciement"
                      signalements={signalements}
                      titre="Licenciement"
                      texte="Certificat de travail, reçu pour solde de tout compte, attestation France Travail : nous les préparons pour le dernier jour."
                      placeholder="ex. préavis effectué / dispensé, congés restants…"
                    />
                  </Etape>
                </ol>
                <p className="flex flex-wrap gap-x-4 gap-y-1">
                  <LienAide href="/aide/fin-du-contrat#licenciement">Le licenciement pas à pas</LienAide>
                  <LienAide href="/aide/fin-du-contrat#justifier-rupture">Justifier un licenciement</LienAide>
                  <LienAide href="/aide/fin-du-contrat#preavis">Le préavis</LienAide>
                </p>
              </>
            )}

            {modeFin === "rupture_conventionnelle" && (
              <>
                <p className="text-sm text-foreground/70">
                  Vous êtes d&apos;accord tous les deux pour mettre fin au contrat. Après un ou plusieurs entretiens,
                  nous préparons la convention de rupture avec les informations que vous nous donnez ; elle est signée
                  par vous deux, puis homologuée par l&apos;administration (comptez plus d&apos;un mois au total).
                </p>
                <PrevenirAideEtGarde
                  gestionId={gestionId}
                  type="fin_contrat"
                  precision="rupture_conventionnelle"
                  signalements={signalements}
                  titre="Rupture conventionnelle"
                  texte="Indiquez la date de fin souhaitée : nous vous recontactons pour préparer la convention."
                  placeholder="ex. indemnité convenue, date du premier entretien…"
                />
                <LienAide href="/aide/fin-du-contrat#rupture-conventionnelle">La rupture conventionnelle pas à pas</LienAide>
              </>
            )}

            {modeFin === "demission" && (
              <>
                <p className="text-sm text-foreground/70">
                  Votre salarié vous remet sa démission par écrit. Prévenez-nous : nous établissons les documents de fin
                  de contrat.
                </p>
                <PrevenirAideEtGarde
                  gestionId={gestionId}
                  type="fin_contrat"
                  precision="demission"
                  signalements={signalements}
                  titre="Démission"
                  texte="Indiquez le dernier jour prévu (fin du préavis)."
                  placeholder="ex. lettre reçue le…, préavis effectué ou non"
                />
                {courrier("demission", true)}
                <LienAide href="/aide/fin-du-contrat#demission">La démission</LienAide>
              </>
            )}
          </div>
        )}

        {action === "courriers" && (
          <div className="flex flex-col divide-y divide-brand-gray/15">
            {courrier("retraite", true)}
            {courrier("inaptitude_reclassement", true)}
            {courrier("avance_salaire", true)}
            {courrier("autorisation_parentale", true)}
            {courrier("autorisation_travail", true)}
            <p className="pt-3 text-xs text-foreground/60">
              Régularisation d&apos;un salarié étranger par le travail :{" "}
              <Link href="/aide/contrat#situation-irreguliere" className="font-medium text-brand-teal underline">
                ce qu&apos;il faut savoir
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
