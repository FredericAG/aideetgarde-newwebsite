import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFCheckBox, PDFDocument, PDFDropdown, PDFName, PDFRadioGroup, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { ancienneteMois } from "@/lib/data";
import {
  MODELES_COURRIER,
  emploiEnToutesLettres,
  deEmploi,
  enQualiteDe,
  type CleCourrier,
  type ContexteCourrier,
} from "./modeles";

/**
 * Génération des courriers préremplis (PDF). Le texte de chaque courrier est
 * dans la fonction du même nom ci-dessous ; une information inconnue est
 * remplacée par des pointillés, à compléter à la main.
 */

type Valeurs = Record<string, string>;

/** Pointillés pour une information à compléter à la main. */
const BLANC = "........................";
const LIGNE_A_REMPLIR = "..........................................................................................................................";

interface Lettre {
  expediteur?: string[];
  destinataire?: string[];
  lieuDate?: string;
  mention?: string[];
  objet?: string;
  titre?: string;
  salutation?: string;
  corps: Bloc[];
  politesse?: string;
  signatures: string[];
  /** Encadré en bas de page (remise en main propre…). */
  encadre?: string[];
}

type Bloc = string | { liste: string[] } | { lignes: number };

// --- Petites aides de rédaction ----------------------------------------------

const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/** "2026-11-05" → "5 novembre 2026" (pointillés si vide). */
function dateLongue(iso: string | undefined | null): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return BLANC;
  const [a, m, j] = iso.slice(0, 10).split("-").map(Number);
  return `${j === 1 ? "1er" : j} ${MOIS[m - 1]} ${a}`;
}

/** "2026-11-05" → "05/11/2026" ("" si vide). */
function dateCourte(iso: string | undefined | null): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return "";
  const [a, m, j] = iso.slice(0, 10).split("-");
  return `${j}/${m}/${a}`;
}

function ou(v: string | undefined | null): string {
  const t = (v ?? "").trim();
  return t || BLANC;
}

function euros(v: string | undefined): string {
  const n = Number((v ?? "").replace(/\s/g, "").replace(",", "."));
  if (!v || !Number.isFinite(n) || n <= 0) return BLANC;
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`;
}

function nomComplet(p: { civilite: string; prenom: string; nom: string }, avecCivilite = true): string {
  const nom = [p.prenom, p.nom.toUpperCase()].filter(Boolean).join(" ");
  return [avecCivilite ? p.civilite : "", nom].filter(Boolean).join(" ") || BLANC;
}

function blocAdresse(p: { civilite: string; prenom: string; nom: string; adresse: string; code_postal: string; ville: string }): string[] {
  const villeLigne = [p.code_postal, p.ville].filter(Boolean).join(" ");
  return [nomComplet(p), p.adresse || BLANC, villeLigne || BLANC];
}

function adresseEnLigne(p: { adresse: string; code_postal: string; ville: string }): string {
  const t = [p.adresse, [p.code_postal, p.ville].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return t || BLANC;
}

/** e muet selon la civilité : soussigné(e), dispensé(e)… */
function e(civilite: string): string {
  return civilite === "Madame" ? "e" : civilite === "Monsieur" ? "" : "(e)";
}

function appel(civilite: string): string {
  return civilite || "Madame, Monsieur";
}

function lieuDate(v: Valeurs): string {
  const lieu = (v.fait_a ?? "").trim();
  const date = (v.fait_le ?? "").trim();
  return `${lieu || "À " + BLANC}, le ${date ? dateLongue(date) : BLANC}`;
}

/** Paragraphes d'un texte saisi (lignes vides = nouveau paragraphe). */
function paragraphes(texte: string | undefined): string[] {
  return (texte ?? "")
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

function lignesSaisies(texte: string | undefined): string[] {
  return (texte ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/^[-–•*]\s*/, "").trim())
    .filter(Boolean);
}

// Préavis (convention collective IDCC 3239, art. 162.4.1 et 162.6 ; départ
// à la retraite : code du travail, art. L1237-10 qui renvoie au préavis de
// licenciement).
// Durées écrites avec leur préposition : « préavis d'un mois », « de deux mois ».
function preavisLicenciement(mois: number): string {
  return mois < 6 ? "d'une semaine" : mois < 24 ? "d'un mois" : "de deux mois";
}
function preavisDemission(mois: number): string {
  return mois < 6 ? "d'une semaine" : mois < 24 ? "de deux semaines" : "d'un mois";
}

function anciennete(c: ContexteCourrier, v: Valeurs): number {
  const ref = v.fait_le && /^\d{4}-\d{2}-\d{2}/.test(v.fait_le) ? v.fait_le : new Date().toISOString().slice(0, 10);
  return ancienneteMois(c.gestion.date_debut, ref);
}

const ENVOI = ["Lettre recommandée avec accusé de réception", "ou remise en main propre contre décharge"];
const DOCUMENTS_FIN =
  "votre certificat de travail, votre reçu pour solde de tout compte et votre attestation France Travail";

// --- Texte des courriers -------------------------------------------------------

const LETTRES: Record<Exclude<CleCourrier, "atthon_maladie" | "atthon_accident" | "declaration_accident" | "autorisation_travail">, (c: ContexteCourrier, v: Valeurs) => Lettre> = {
  attestation_emploi: (c, v) => {
    const E = c.employeur;
    const S = c.salarie;
    const lien = S.civilite === "Madame" ? "ma salariée" : S.civilite === "Monsieur" ? "mon salarié" : "mon salarié(e)";
    const contrat =
      c.gestion.type_contrat === "CDI"
        ? ", en contrat à durée indéterminée"
        : c.gestion.type_contrat === "CDD"
          ? ", en contrat à durée déterminée"
          : "";
    const horaires =
      v.avec_horaires && c.gestion.heures
        ? `, pour une durée de travail de ${String(c.gestion.heures).replace(".", ",")} heures par ${c.gestion.unite_heures ?? "semaine"}`
        : "";
    return {
      expediteur: blocAdresse(E),
      titre: "ATTESTATION D'EMPLOI",
      corps: [
        `Je soussigné${e(E.civilite)} ${nomComplet(E)}, demeurant ${adresseEnLigne(E)}, certifie que ${nomComplet(S)}, demeurant ${adresseEnLigne(S)}, est ${lien} ${enQualiteDe(c)} depuis le ${dateLongue(c.gestion.date_debut)}${contrat}${horaires}.`,
        "Attestation établie pour servir et valoir ce que de droit.",
      ],
      lieuDate: lieuDate(v),
      signatures: ["Signature de l'employeur"],
    };
  },

  convocation_entretien: (c, v) => {
    const S = c.salarie;
    const heure = v.heure_entretien ? v.heure_entretien.replace(":", " h ") : BLANC;
    return {
      expediteur: blocAdresse(c.employeur),
      destinataire: blocAdresse(S),
      lieuDate: lieuDate(v),
      mention: ENVOI,
      objet: "Convocation à un entretien préalable à un éventuel licenciement",
      salutation: `${appel(S.civilite)},`,
      corps: [
        "Je vous informe que j'envisage à votre égard une mesure de licenciement.",
        `Afin de vous exposer les motifs de cette décision envisagée et de recueillir vos explications, je vous prie de bien vouloir vous présenter à un entretien préalable le ${dateLongue(v.date_entretien)} à ${heure}, ${ou(v.lieu)}.`,
      ],
      politesse: `Je vous prie d'agréer, ${appel(S.civilite)}, l'expression de mes salutations distinguées.`,
      signatures: ["Signature de l'employeur"],
      encadre: [
        "En cas de remise en main propre (deux exemplaires) :",
        `Reçu en main propre le ${BLANC}`,
        "Signature du salarié :",
      ],
    };
  },

  notification_licenciement: (c, v) => {
    const S = c.salarie;
    const motif = paragraphes(v.motif);
    return {
      expediteur: blocAdresse(c.employeur),
      destinataire: blocAdresse(S),
      lieuDate: lieuDate(v),
      mention: ["Lettre recommandée avec accusé de réception"],
      objet: "Notification de licenciement",
      salutation: `${appel(S.civilite)},`,
      corps: [
        `À la suite de notre entretien préalable du ${dateLongue(v.date_entretien)}, je vous informe de ma décision de vous licencier pour le motif suivant :`,
        ...(motif.length ? motif : [{ lignes: 5 } as Bloc]),
        `Votre préavis, d'une durée ${preavisLicenciement(anciennete(c, v))}, débutera à la date de première présentation de cette lettre.` +
          (v.dispense_preavis ? " Je vous dispense de l'effectuer ; il vous sera néanmoins rémunéré aux échéances habituelles." : ""),
        `À l'issue de votre contrat, je vous remettrai ${DOCUMENTS_FIN}.`,
      ],
      politesse: `Je vous prie d'agréer, ${appel(S.civilite)}, l'expression de mes salutations distinguées.`,
      signatures: ["Signature de l'employeur"],
    };
  },

  inaptitude_reclassement: (c, v) => {
    const S = c.salarie;
    const postes = lignesSaisies(v.postes);
    const amenagements = lignesSaisies(v.amenagements);
    const raison =
      v.raison === "refus_medecin"
        ? `le médecin du travail n'a pas validé le poste de reclassement que nous avions identifié, pour le motif suivant : ${ou(v.motif_medecin)}.`
        : v.raison === "refus_salarie"
          ? "vous avez refusé la proposition de reclassement qui vous a été faite et nous n'avons pu identifier d'autre emploi disponible correspondant à vos capacités."
          : "nous n'avons pu identifier aucun emploi disponible correspondant à vos capacités, compte tenu de votre état de santé.";
    return {
      expediteur: blocAdresse(c.employeur),
      destinataire: blocAdresse(S),
      lieuDate: lieuDate(v),
      mention: ["Lettre recommandée avec accusé de réception"],
      objet: "Impossibilité de reclassement à la suite de votre inaptitude",
      salutation: `${appel(S.civilite)},`,
      corps: [
        `Le ${dateLongue(v.date_avis)}, le médecin du travail a conclu à votre inaptitude à l'emploi ${deEmploi(c)}.`,
        "Sur la base de nos échanges avec le médecin du travail et des préconisations qu'il a formulées, nous avons recherché les postes disponibles pouvant être adaptés à votre état de santé :",
        postes.length ? { liste: postes } : { lignes: 3 },
        "Nous avons également envisagé les aménagements qui auraient pu nous permettre de vous proposer un emploi de reclassement, et notamment :",
        amenagements.length ? { liste: amenagements } : { lignes: 3 },
        `Malgré ces recherches, nous sommes malheureusement dans l'impossibilité de procéder à votre reclassement : ${raison}`,
        "Compte tenu de votre inaptitude physique et de cette impossibilité de reclassement, nous allons être amenés à envisager une procédure de licenciement.",
      ],
      politesse: `Je vous prie d'agréer, ${appel(S.civilite)}, l'expression de mes salutations distinguées.`,
      signatures: ["Signature de l'employeur", "Signature du salarié (« lu et approuvé »)"],
    };
  },

  demission: (c, v) => {
    const E = c.employeur;
    const S = c.salarie;
    return {
      expediteur: blocAdresse(S),
      destinataire: blocAdresse(E),
      lieuDate: `${(S.ville || "").trim() || "À " + BLANC}, le ${BLANC}`,
      mention: ENVOI,
      objet: "Démission",
      salutation: `${appel(E.civilite)},`,
      corps: [
        `Je vous informe de ma décision de démissionner de mon poste ${deEmploi(c)}, que j'occupe à votre service depuis le ${dateLongue(c.gestion.date_debut)}.`,
        `Mon préavis, d'une durée ${preavisDemission(anciennete(c, v))}, commencera à la date de première présentation de cette lettre ou de sa remise en main propre.`,
        ...(v.dispense_demandee
          ? [`Je souhaiterais toutefois être dispensé${e(S.civilite)} d'effectuer ce préavis et quitter mon poste dès la réception de cette lettre. Je vous remercie de bien vouloir me confirmer votre accord.`]
          : []),
        "Lors de mon dernier jour de travail, je vous remercie de bien vouloir me remettre mon certificat de travail, mon reçu pour solde de tout compte et mon attestation France Travail.",
      ],
      politesse: `Je vous prie d'agréer, ${appel(E.civilite)}, l'expression de mes salutations distinguées.`,
      signatures: ["Signature du salarié"],
      encadre: [
        "En cas de remise en main propre (deux exemplaires) :",
        `Reçu en main propre le ${BLANC}`,
        "Signature de l'employeur :",
      ],
    };
  },

  retraite: (c, v) => {
    const E = c.employeur;
    const S = c.salarie;
    return {
      expediteur: blocAdresse(S),
      destinataire: blocAdresse(E),
      lieuDate: `${(S.ville || "").trim() || "À " + BLANC}, le ${BLANC}`,
      mention: ENVOI,
      objet: "Départ volontaire à la retraite",
      salutation: `${appel(E.civilite)},`,
      corps: [
        "Je vous informe de ma décision de faire valoir mes droits à la retraite.",
        `Compte tenu du préavis ${preavisLicenciement(anciennete(c, v))} à respecter, qui commence à la réception de cette lettre, mon départ prendra effet le ${dateLongue(v.date_depart)}.`,
        "Lors de mon dernier jour de travail, je vous remercie de bien vouloir me remettre mon certificat de travail, mon reçu pour solde de tout compte et mon attestation France Travail.",
      ],
      politesse: `Je vous prie d'agréer, ${appel(E.civilite)}, l'expression de mes salutations distinguées.`,
      signatures: ["Signature du salarié"],
    };
  },

  autorisation_parentale: (c, v) => {
    const E = c.employeur;
    const S = c.salarie;
    const periode = v.au ? `du ${dateLongue(v.du)} au ${dateLongue(v.au)}` : `à compter du ${dateLongue(v.du)}`;
    return {
      expediteur: [ou(v.parent), BLANC, BLANC],
      destinataire: blocAdresse(E),
      lieuDate: `À ${BLANC}, le ${BLANC}`,
      objet: "Autorisation parentale de travail pour un mineur",
      salutation: `${appel(E.civilite)},`,
      corps: [
        `Je soussigné(e) ${ou(v.parent)}, parent de ${[S.prenom, S.nom.toUpperCase()].filter(Boolean).join(" ") || BLANC}, né${e(S.civilite)} le ${dateLongue(v.date_naissance)}, et disposant du plein exercice de l'autorité parentale, autorise ${nomComplet(E)} à l'employer ${periode} ${enQualiteDe(c)}, dans le respect des dispositions du code du travail relatives au travail des jeunes de moins de dix-huit ans (articles L. 4153-1 et suivants, D. 4153-1 et suivants).`,
      ],
      politesse: `Je vous prie d'agréer, ${appel(E.civilite)}, l'expression de mes salutations distinguées.`,
      signatures: ["Signature du parent"],
    };
  },

  avance_salaire: (c, v) => {
    const E = c.employeur;
    const S = c.salarie;
    return {
      titre: "AVANCE SUR SALAIRE — ENGAGEMENT DE REMBOURSEMENT",
      corps: [
        `À la demande de ${nomComplet(S)}, salarié${e(S.civilite)}, je soussigné${e(E.civilite)} ${nomComplet(E)}, employeur, lui accorde à titre individuel et exceptionnel une avance sur salaire d'un montant de ${euros(v.montant)}.`,
        "Cette avance est remboursable sans intérêts.",
        `Le remboursement se fera par une retenue sur salaire à chaque paie, à partir du ${dateLongue(v.debut_remboursement)} et jusqu'au remboursement complet. Chaque retenue sera de ${euros(v.retenue)}, sans dépasser le dixième du salaire net.`,
        `${nomComplet(S)} pourra également rembourser l'avance par anticipation, à sa demande.`,
        "En cas de rupture du contrat, quelle qu'en soit la cause, les sommes restant dues seront retenues sur le solde de tout compte et, si celui-ci ne suffit pas, réglées directement par le salarié.",
      ],
      lieuDate: lieuDate(v),
      signatures: ["Signature du salarié", "Signature de l'employeur"],
    };
  },
};

// --- Mise en page ------------------------------------------------------------------

const A4: [number, number] = [595.28, 841.89];
const MARGE = 64;
const TAILLE = 10.5;
const INTERLIGNE = 15;

class Mise {
  page!: PDFPage;
  y = 0;
  constructor(
    private doc: PDFDocument,
    private normal: PDFFont,
    private gras: PDFFont,
    private italique: PDFFont,
  ) {
    this.nouvellePage();
  }
  get largeur() {
    return A4[0] - 2 * MARGE;
  }
  nouvellePage() {
    this.page = this.doc.addPage(A4);
    this.y = A4[1] - MARGE;
  }
  place(hauteur: number) {
    if (this.y - hauteur < MARGE) this.nouvellePage();
  }
  police(style: "normal" | "gras" | "italique") {
    return style === "gras" ? this.gras : style === "italique" ? this.italique : this.normal;
  }
  /** Découpe un texte en lignes tenant dans la largeur donnée. */
  couper(texte: string, largeur: number, f: PDFFont, taille = TAILLE): string[] {
    const lignes: string[] = [];
    let ligne = "";
    for (const mot of texte.split(/\s+/).filter(Boolean)) {
      const essai = ligne ? `${ligne} ${mot}` : mot;
      if (f.widthOfTextAtSize(essai, taille) <= largeur || !ligne) {
        ligne = essai;
      } else {
        lignes.push(ligne);
        ligne = mot;
      }
    }
    if (ligne) lignes.push(ligne);
    return lignes;
  }
  texte(t: string, opts: { x?: number; largeur?: number; style?: "normal" | "gras" | "italique"; taille?: number; aligne?: "gauche" | "droite" | "centre" } = {}) {
    const f = this.police(opts.style ?? "normal");
    const taille = opts.taille ?? TAILLE;
    const x0 = opts.x ?? MARGE;
    const largeur = opts.largeur ?? A4[0] - MARGE - x0;
    for (const ligne of this.couper(t, largeur, f, taille)) {
      this.place(INTERLIGNE);
      const w = f.widthOfTextAtSize(ligne, taille);
      const x = opts.aligne === "droite" ? x0 + largeur - w : opts.aligne === "centre" ? x0 + (largeur - w) / 2 : x0;
      this.page.drawText(ligne, { x, y: this.y - taille, size: taille, font: f, color: rgb(0.1, 0.1, 0.1) });
      this.y -= INTERLIGNE * (taille / TAILLE);
    }
  }
  espace(h: number) {
    this.y -= h;
  }
}

/** Remplace les caractères que les polices standard du PDF ne savent pas écrire. */
function compatible(police: PDFFont) {
  const cache = new Map<string, string>();
  return (t: string) =>
    Array.from(t.replace(/[   ]/g, " "))
      .map((ch) => {
        if (cache.has(ch)) return cache.get(ch)!;
        let r = ch;
        try {
          police.encodeText(ch);
        } catch {
          const SANS_DECOMPOSITION: Record<string, string> = { Ł: "L", ł: "l", Ø: "O", ø: "o", Đ: "D", đ: "d", Ħ: "H", ħ: "h", ı: "i" };
          const sansAccent = SANS_DECOMPOSITION[ch] ?? ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
          try {
            police.encodeText(sansAccent);
            r = sansAccent;
          } catch {
            r = "?";
          }
        }
        cache.set(ch, r);
        return r;
      })
      .join("");
}

function nettoyerLettre(l: Lettre, n: (t: string) => string): Lettre {
  const bloc = (b: Bloc): Bloc => (typeof b === "string" ? n(b) : "liste" in b ? { liste: b.liste.map(n) } : b);
  return {
    ...l,
    expediteur: l.expediteur?.map(n),
    destinataire: l.destinataire?.map(n),
    lieuDate: l.lieuDate && n(l.lieuDate),
    mention: l.mention?.map(n),
    objet: l.objet && n(l.objet),
    titre: l.titre && n(l.titre),
    salutation: l.salutation && n(l.salutation),
    corps: l.corps.map(bloc),
    politesse: l.politesse && n(l.politesse),
    signatures: l.signatures.map(n),
    encadre: l.encadre?.map(n),
  };
}

async function mettreEnPage(lettre: Lettre, titrePdf: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(titrePdf);
  doc.setCreator("Aide & Garde");
  doc.setProducer("Aide & Garde");
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const gras = await doc.embedFont(StandardFonts.HelveticaBold);
  const italique = await doc.embedFont(StandardFonts.HelveticaOblique);
  const l = nettoyerLettre(lettre, compatible(normal));
  const m = new Mise(doc, normal, gras, italique);
  const colonneDroite = MARGE + m.largeur * 0.52;

  if (l.expediteur) {
    l.expediteur.forEach((t, i) => m.texte(t, { style: i === 0 ? "gras" : "normal", largeur: m.largeur * 0.48 }));
    m.espace(18);
  }
  if (l.destinataire) {
    l.destinataire.forEach((t, i) => m.texte(t, { x: colonneDroite, style: i === 0 ? "gras" : "normal" }));
    m.espace(18);
  }
  if (l.lieuDate && (l.destinataire || l.objet)) {
    m.texte(l.lieuDate, { x: colonneDroite });
    m.espace(14);
  }
  if (l.mention) {
    l.mention.forEach((t) => m.texte(t, { style: "italique" }));
    m.espace(10);
  }
  if (l.titre) {
    m.espace(l.expediteur ? 16 : 40);
    m.texte(l.titre, { style: "gras", taille: 14, aligne: "centre", x: MARGE, largeur: m.largeur });
    m.espace(22);
  }
  if (l.objet) {
    m.texte(`Objet : ${l.objet}`, { style: "gras" });
    m.espace(14);
  }
  if (l.salutation) {
    m.texte(l.salutation);
    m.espace(8);
  }
  for (const b of l.corps) {
    if (typeof b === "string") {
      m.texte(b);
    } else if ("liste" in b) {
      for (const item of b.liste) {
        const lignes = m.couper(item, m.largeur - 16, normal);
        lignes.forEach((ligne, i) => {
          m.place(INTERLIGNE);
          if (i === 0) m.page.drawText("–", { x: MARGE + 4, y: m.y - TAILLE, size: TAILLE, font: normal });
          m.page.drawText(ligne, { x: MARGE + 16, y: m.y - TAILLE, size: TAILLE, font: normal, color: rgb(0.1, 0.1, 0.1) });
          m.y -= INTERLIGNE;
        });
      }
    } else {
      for (let i = 0; i < b.lignes; i++) {
        m.place(INTERLIGNE + 6);
        m.espace(6);
        m.texte(LIGNE_A_REMPLIR, { largeur: m.largeur });
      }
    }
    m.espace(8);
  }
  if (l.politesse) {
    m.texte(l.politesse);
    m.espace(8);
  }
  if (l.lieuDate && !(l.destinataire || l.objet)) {
    m.espace(8);
    m.texte(l.lieuDate);
    m.espace(8);
  }

  // Signatures : une colonne, ou deux côte à côte.
  m.place(90);
  m.espace(10);
  const largeurColonne = m.largeur / Math.max(1, l.signatures.length);
  const ySignature = m.y;
  l.signatures.forEach((s, i) => {
    m.y = ySignature;
    m.texte(s, { x: MARGE + i * largeurColonne + (l.signatures.length === 1 ? m.largeur * 0.52 : 0), largeur: largeurColonne - 10 });
  });
  m.y = ySignature - 80;

  if (l.encadre) {
    const hauteur = l.encadre.length * INTERLIGNE + 46;
    m.place(hauteur + 10);
    const haut = m.y;
    m.page.drawRectangle({
      x: MARGE,
      y: haut - hauteur,
      width: m.largeur,
      height: hauteur,
      borderColor: rgb(0.6, 0.6, 0.6),
      borderWidth: 0.8,
    });
    m.espace(8);
    l.encadre.forEach((t, i) => m.texte(t, { x: MARGE + 10, style: i === 0 ? "italique" : "normal", taille: 9.5 }));
    m.y = haut - hauteur - 10;
  }

  return doc.save();
}

// --- Attestation sur l'honneur de l'Assurance Maladie (ATTHON) -----------------------

/**
 * Formulaire de l'Assurance Maladie (modeles-pdf/atthon.pdf), prérempli :
 * nom du salarié, nature de l'arrêt, employeur CESU/Pajemploi, première
 * ligne du tableau (employeur, téléphone, dernier jour travaillé, maintien
 * du salaire). Les champs restent modifiables : le salarié complète son
 * numéro de sécurité sociale, ses autres employeurs, le lieu et la date, et
 * signe.
 */
async function remplirAtthon(c: ContexteCourrier, v: Valeurs, accident: boolean): Promise<Uint8Array> {
  const modele = await readFile(path.join(process.cwd(), "modeles-pdf", "atthon.pdf"));
  const doc = await PDFDocument.load(modele);
  const form = doc.getForm();
  const police = await doc.embedFont(StandardFonts.Helvetica);
  const n = compatible(police);
  const texte = (champ: string, valeur: string) => {
    try {
      form.getTextField(champ).setText(n(valeur));
    } catch {
      // Champ absent d'une nouvelle version du formulaire : on continue.
    }
  };
  const caseACocher = (champ: string, coche: boolean) => {
    try {
      const cb = form.getCheckBox(champ);
      if (coche) cb.check();
      else cb.uncheck();
    } catch {
      /* idem */
    }
  };

  texte("Nom prenom Sal", nomComplet(c.salarie, false).replace(BLANC, ""));
  caseACocher("Mal", !accident);
  caseACocher("Acc", accident);
  caseACocher("Mat", false);
  caseACocher("Pat", false);
  caseACocher("Xieurs", true);
  texte("Nom employeur", nomComplet(c.employeur, false).replace(BLANC, ""));
  texte("Tel", c.employeur.telephone);
  texte("Date", dateCourte(v.dernier_jour));
  caseACocher("Check Box8", Boolean(v.maintien));

  // Date de début de l'arrêt : écrite à la place des tirets « -- /-- /---- ».
  const debut = dateCourte(v.debut_arret);
  if (debut) {
    const page = doc.getPage(0);
    const hauteurPage = page.getHeight();
    page.drawRectangle({ x: 78.5, y: hauteurPage - 227.5, width: 44, height: 13.5, color: rgb(1, 1, 1) });
    page.drawText(debut, { x: 80, y: hauteurPage - 224.5, size: 10, font: police, color: rgb(0, 0, 0) });
  }

  form.updateFieldAppearances(police);
  doc.setTitle("Attestation sur l'honneur pour le paiement des indemnités journalières");
  return doc.save();
}

// --- Déclaration d'accident du travail (cerfa 14463*03) ------------------------------

/**
 * Formulaire officiel (modeles-pdf/declaration-accident-travail-14463-03.pdf)
 * prérempli : employeur, salarié, contrat, et ce que l'abonné a indiqué de
 * l'accident. Les champs restent modifiables (numéro de sécurité sociale,
 * date de naissance, témoin… à compléter).
 */
async function remplirDeclarationAccident(c: ContexteCourrier, v: Valeurs): Promise<Uint8Array> {
  const modele = await readFile(path.join(process.cwd(), "modeles-pdf", "declaration-accident-travail-14463-03.pdf"));
  const doc = await PDFDocument.load(modele);
  const form = doc.getForm();
  const police = await doc.embedFont(StandardFonts.Helvetica);
  const n = compatible(police);
  const texte = (champ: string, valeur: string) => {
    if (!valeur) return;
    try {
      const f = form.getTextField(champ);
      const max = f.getMaxLength();
      f.setText(n(max ? valeur.slice(0, max) : valeur));
    } catch {
      /* champ absent d'une autre version du formulaire */
    }
  };
  // Cases à choix multiples du formulaire : un même champ, une case par
  // option ; on coche celle dont l'état « actif » correspond.
  const choisir = (champ: string, correspond: (etat: string) => boolean) => {
    try {
      const f = form.getField(champ);
      if (!(f instanceof PDFCheckBox)) return;
      for (const w of f.acroField.getWidgets()) {
        const etat = w.getOnValue();
        if (!etat) continue;
        const nomEtat = etat.decodeText();
        if (correspond(nomEtat)) {
          w.setAppearanceState(etat);
          f.acroField.dict.set(PDFName.of("V"), etat);
        } else {
          w.setAppearanceState(PDFName.of("Off"));
        }
      }
    } catch {
      /* idem */
    }
  };
  const chiffres = (t: string) => t.replace(/\D/g, "");
  const jjmmaaaa = (iso?: string) => chiffres(dateCourte(iso));
  const E = c.employeur;
  const S = c.salarie;

  choisir("accident", (e) => e === "travail");
  texte("Nom et prénom ou raison sociale de lemployeur", nomComplet(E, false).replace(BLANC, ""));
  texte("Adresse", E.adresse);
  texte("Code postal", chiffres(E.code_postal));
  texte("adresse 2 employeur", E.ville);
  texte("téléphone employeur", chiffres(E.telephone));

  texte("Nom et prénom victime", [S.nom.toUpperCase(), S.prenom].filter(Boolean).join(" "));
  if (S.civilite) choisir("sexe", (e) => (S.civilite === "Madame" ? e.startsWith("f") : e.startsWith("m")));
  texte("Adresse_victime", S.adresse);
  texte("Code postal victime", chiffres(S.code_postal));
  texte("Adresse_victime 2", S.ville);
  texte("date naissance", jjmmaaaa(c.details.date_naissance));
  texte("date embauche", jjmmaaaa(c.gestion.date_debut));
  texte("Profession", emploiEnToutesLettres(c));
  if (c.gestion.type_contrat) choisir("contrat", (e) => e === c.gestion.type_contrat);

  texte("date accident", jjmmaaaa(v.date_accident));
  texte("heure", chiffres(v.heure_accident ?? ""));
  texte("lieu accident", v.lieu_accident ?? "");
  const lieu = { habituel: "lieu habituel travail", occasionnel: "lieu occasionnel travail", deplacement: "deplacement pour employeur" }[
    v.lieu_type as "habituel" | "occasionnel" | "deplacement"
  ];
  if (lieu) choisir("lieu", (e) => e === lieu);
  texte("activité victime", v.activite ?? "");
  texte("nature accident", v.nature ?? "");
  texte("Siège des lésions", v.siege_lesions ?? "");
  texte("Nature des lésions", v.nature_lesions ?? "");
  if (v.consequences === "sans" || v.consequences === "avec") choisir("conséquences", (e) => e.startsWith(v.consequences));

  texte("nom et prenom signataire", nomComplet(E, false).replace(BLANC, ""));
  texte("qualité signataire", "Particulier employeur");
  texte("lieu declaration", v.fait_a ?? "");
  texte("date declaration", jjmmaaaa(v.fait_le));

  form.updateFieldAppearances(police);
  doc.setTitle("Déclaration d'accident du travail (cerfa 14463*03)");
  return doc.save();
}

// --- Demande d'autorisation de travail (cerfa 15186*03) ------------------------------

/**
 * Formulaire officiel (modeles-pdf/autorisation-travail-15186-03.pdf),
 * partie employeur préremplie pour un particulier employeur, selon la
 * pratique d'Aide & Garde : n° Pajemploi ou CESU à la place du SIRET,
 * convention collective 3239, emploi, niveau et code ROME ; partie « taxe
 * employeur » laissée vide. Le salarié complète ses documents d'identité et
 * de séjour. Le formulaire d'origine est un formulaire « XFA » : il est
 * converti en formulaire PDF classique, lisible partout et modifiable.
 */
async function remplirAutorisationTravail(c: ContexteCourrier, v: Valeurs): Promise<Uint8Array> {
  const modele = await readFile(path.join(process.cwd(), "modeles-pdf", "autorisation-travail-15186-03.pdf"));
  const doc = await PDFDocument.load(modele);
  const form = doc.getForm();
  const police = await doc.embedFont(StandardFonts.Helvetica);
  const n = compatible(police);
  const P1 = "topmostSubform[0].Page1[0].";
  const P2 = "topmostSubform[0].Page2[0].";
  const texte = (champ: string, valeur: string | undefined) => {
    if (!valeur) return;
    try {
      const f = form.getTextField(champ);
      const max = f.getMaxLength();
      // Champs très bas sur ce formulaire : petite taille fixe, lisible.
      if (!f.isCombed()) f.setFontSize(8);
      f.setText(n(max ? valeur.slice(0, max) : valeur));
    } catch {
      /* champ absent d'une autre version du formulaire */
    }
  };
  const radio = (champ: string, option: string) => {
    try {
      const f = form.getField(champ);
      if (f instanceof PDFRadioGroup) f.select(option);
    } catch {
      /* idem */
    }
  };
  const liste = (champ: string, option: string) => {
    try {
      const f = form.getField(champ);
      if (f instanceof PDFDropdown) f.select(option);
    } catch {
      /* idem */
    }
  };
  const E = c.employeur;
  const S = c.salarie;
  const g = c.gestion;
  const villeEmployeur = [E.adresse, E.ville].filter(Boolean).join(", ");

  // 1. Motif : première demande.
  try {
    form.getCheckBox(`${P1}rab_Horaire[0]`).check();
  } catch {
    /* idem */
  }
  // 2. Employeur : particulier employeur.
  texte(`${P1}txt_IDCC[0]`, "3239");
  texte(`${P1}txt_intitule[0]`, "Particuliers employeurs et emploi à domicile");
  texte(`${P1}txt_employeur[0]`, [E.prenom, E.nom.toUpperCase()].filter(Boolean).join(" "));
  texte(`${P1}txt_num[0]`, v.numero_declarant);
  texte(`${P1}txt_adresse[0]`, villeEmployeur);
  texte(`${P1}txt_codePostal[0]`, E.code_postal);
  // 3. Salarié.
  texte(`${P1}txt_nomFamille[0]`, (c.details.nom_naissance || S.nom).toUpperCase());
  if (c.details.nom_naissance) texte(`${P1}txt_nomUsage[0]`, S.nom.toUpperCase());
  texte(`${P1}txt_prenom[0]`, S.prenom);
  if (S.civilite) radio(`${P1}rab_sexe[0]`, S.civilite === "Monsieur" ? "1" : "2");
  texte(`${P1}dat_naissance[0]`, dateCourte(v.date_naissance));
  texte(`${P1}txt_nationnalite[0]`, v.nationalite);
  texte(`${P1}txt_codePostal[1]`, S.code_postal.replace(/\D/g, ""));
  // 4. Contrat.
  texte(`${P1}txt_emploiOccupe[0]`, v.emploi);
  texte(`${P1}txt_codeROME[0]`, v.rome);
  texte(`${P1}txt_niveau[0]`, v.niveau);
  if (g.type_contrat) radio(`${P1}rab_typeContrat[0]`, g.type_contrat === "CDI" ? "1" : "2");
  if (g.type_contrat === "CDD" && g.date_fin_prevue) {
    const mois = ancienneteMois(g.date_debut, g.date_fin_prevue);
    const debut = new Date(`${g.date_debut}T00:00:00`);
    const apres = new Date(debut.getFullYear(), debut.getMonth() + mois, debut.getDate());
    const jours = Math.max(0, Math.round((new Date(`${g.date_fin_prevue}T00:00:00`).getTime() - apres.getTime()) / 86400000));
    texte(`${P1}txt_dureeMois[0]`, String(mois));
    texte(`${P1}txt_dureeJours[0]`, String(jours));
    if (g.remplacement || c.details.motif_cdd === "remplacement") liste(`${P1}cmb_motifRecours[0]`, "remplacement de salarié ou d'employeur");
    else if (c.details.motif_cdd === "accroissement") liste(`${P1}cmb_motifRecours[0]`, "accroissement temporaire d'activité");
    else if (c.details.motif_cdd === "saisonnier") liste(`${P1}cmb_motifRecours[0]`, "emploi à caractère saisonnier");
  }
  if (g.heures) {
    // Temps complet chez un particulier employeur : 40 heures par semaine.
    const hebdo = g.unite_heures === "mois" ? (g.heures * 12) / 52 : g.heures;
    radio(`${P1}rab_typeContrat[1]`, hebdo >= 40 ? "1" : "2");
    const entier = Math.floor(g.heures);
    texte(`${P1}txt_dureeHeures[0]`, String(entier));
    texte(`${P1}txt_dureeCentiemes[0]`, String(Math.round((g.heures - entier) * 100)).padStart(2, "0"));
    radio(`${P1}rab_typeSalaire[1]`, g.unite_heures === "mois" ? "2" : "1");
  }
  const brut = Number((v.salaire_brut ?? "").replace(",", ".").replace(/\s/g, ""));
  if (Number.isFinite(brut) && brut > 0) {
    texte(`${P1}txt_salaire[0]`, brut.toFixed(2).replace(".", ","));
    radio(`${P1}rab_typeSalaire[0]`, "3");
  }
  // Signature.
  texte(`${P1}txt_signataire[0]`, [E.prenom, E.nom.toUpperCase()].filter(Boolean).join(" "));
  texte(`${P1}txt_qualite[0]`, "Particulier employeur");
  texte(`${P1}dat_signature[0]`, dateCourte(v.fait_le));
  texte(`${P1}txt_lieuSignature[0]`, v.fait_a);

  // Feuillet 2 (annexe) : coordonnées du salarié, embauche, lieu de travail.
  texte(`${P2}txt_Adresse[1]`, S.adresse);
  texte(`${P2}txt_CodePostal[1]`, S.code_postal.replace(/\D/g, ""));
  texte(`${P2}txt_Commune[0]`, S.ville);
  texte(`${P2}txt_Telephone[2]`, c.details.telephone_salarie);
  texte(`${P2}txt_Courriel[2]`, c.details.email_salarie);
  texte(`${P2}dat_Embauche[0]`, dateCourte(g.date_debut));
  texte(`${P2}txt_DescriptionEmploi[0]`, [v.emploi, (c.details.taches ?? "").split("|").filter(Boolean).join(", ")].filter(Boolean).join(" : "));
  texte(`${P2}txt_Denomination[0]`, [E.prenom, E.nom.toUpperCase(), "(particulier employeur)"].filter(Boolean).join(" "));
  texte(`${P2}txt_Adresse[2]`, c.details.lieu_travail_adresse || villeEmployeur);
  texte(`${P2}txt_CodePostal[2]`, c.details.lieu_travail_adresse ? "" : E.code_postal);
  texte(`${P2}txt_Signataire[0]`, [E.prenom, E.nom.toUpperCase()].filter(Boolean).join(" "));

  form.updateFieldAppearances(police);
  doc.setTitle("Demande d'autorisation de travail (cerfa 15186*03)");
  return doc.save();
}

// --- Point d'entrée ----------------------------------------------------------------------

export async function genererCourrier(
  cle: CleCourrier,
  contexte: ContexteCourrier,
  valeurs: Valeurs,
): Promise<{ octets: Uint8Array; fichier: string }> {
  const modele = MODELES_COURRIER[cle];
  const salarie = (contexte.salarie.nom || "salarie").toUpperCase().replace(/[^A-Z0-9]+/g, "-");
  const base = {
    attestation_emploi: "Attestation-emploi",
    convocation_entretien: "Convocation-entretien-prealable",
    notification_licenciement: "Lettre-licenciement",
    inaptitude_reclassement: "Impossibilite-reclassement",
    demission: "Lettre-demission",
    retraite: "Depart-retraite",
    autorisation_parentale: "Autorisation-parentale",
    avance_salaire: "Avance-sur-salaire",
    atthon_maladie: "Attestation-honneur-IJ",
    atthon_accident: "Attestation-honneur-IJ-accident",
    declaration_accident: "Declaration-accident-travail",
    autorisation_travail: "Demande-autorisation-travail-15186",
  }[cle];
  const fichier = `${base}_${salarie}.pdf`;

  if (cle === "atthon_maladie" || cle === "atthon_accident") {
    return { octets: await remplirAtthon(contexte, valeurs, cle === "atthon_accident"), fichier };
  }
  if (cle === "autorisation_travail") {
    return { octets: await remplirAutorisationTravail(contexte, valeurs), fichier };
  }
  if (cle === "declaration_accident") {
    return { octets: await remplirDeclarationAccident(contexte, valeurs), fichier };
  }
  const lettre = LETTRES[cle](contexte, valeurs);
  return { octets: await mettreEnPage(lettre, modele.titre), fichier };
}
