import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Accès à l'API REST V4 de Systempay (contrat BRED, décision 10).
 *
 * Trois valeurs à renseigner dans Vercel (voir .env.example) :
 *  - SYSTEMPAY_BOUTIQUE : identifiant de la boutique (8 chiffres) ;
 *  - SYSTEMPAY_MOT_DE_PASSE : mot de passe de l'API (Secret) ;
 *  - NEXT_PUBLIC_SYSTEMPAY_CLE_PUBLIQUE : clé publique du formulaire.
 *
 * Le mode (TEST ou PRODUCTION) se déduit du mot de passe : Systempay fait
 * commencer les mots de passe de test par « testpassword_ ». Impossible
 * donc de débiter une vraie carte avec des clés de test, ni de croire être
 * en test avec des clés de production.
 *
 * La clé HMAC-SHA-256 (4e clé) n'est pas utilisée : au retour du
 * navigateur, le site redemande le résultat à Systempay (Order/Get) au lieu
 * de croire ce que transmet le navigateur.
 */

export type ModeSystempay = "TEST" | "PRODUCTION";

const URL_API = process.env.SYSTEMPAY_URL_API || "https://api.systempay.fr";
/** Domaine du formulaire de paiement (bibliothèque JavaScript). */
export const URL_FORMULAIRE = "https://static.systempay.fr";

/**
 * Cas d'usage déclaré à Systempay : abonnement dont le montant peut varier
 * (changement de formule). Le premier paiement est initié par l'abonné
 * (CUSTOMER, avec 3-D Secure), les échéances par Aide & Garde (MERCHANT).
 */
const CAS_USAGE = "RECURRING_VARIABLE_TOTAL_AMOUNT";

export function configSystempay(): {
  boutique: string;
  motDePasse: string;
  clePublique: string;
  mode: ModeSystempay;
} | null {
  const boutique = process.env.SYSTEMPAY_BOUTIQUE;
  const motDePasse = process.env.SYSTEMPAY_MOT_DE_PASSE;
  const clePublique = process.env.NEXT_PUBLIC_SYSTEMPAY_CLE_PUBLIQUE;
  if (!boutique || !motDePasse || !clePublique) return null;
  return {
    boutique,
    motDePasse,
    clePublique,
    mode: motDePasse.startsWith("testpassword_") ? "TEST" : "PRODUCTION",
  };
}

export type ResultatApi =
  | { ok: true; answer: Record<string, unknown> }
  /**
   * incertain = pas de réponse exploitable (coupure, délai dépassé, erreur
   * 5xx) : l'opération a PEUT-ÊTRE eu lieu chez Systempay. Ne jamais
   * retenter un débit sans avoir vérifié avec Order/Get.
   */
  | { ok: false; erreur: string; incertain: boolean };

/** Appel d'un service web Systempay (authentification Basic). */
export async function appelSystempay(
  service: string,
  corps: Record<string, unknown>,
  delaiMs = 20000,
): Promise<ResultatApi> {
  const config = configSystempay();
  if (!config) return { ok: false, erreur: "Systempay non configuré", incertain: false };
  const auth = Buffer.from(`${config.boutique}:${config.motDePasse}`).toString("base64");
  let reponse: Response;
  try {
    reponse = await fetch(`${URL_API}/api-payment/V4/${service}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(corps),
      cache: "no-store",
      signal: AbortSignal.timeout(delaiMs),
    });
  } catch (e) {
    return { ok: false, erreur: `Systempay injoignable : ${(e as Error).message}`, incertain: true };
  }
  if (reponse.status >= 500) {
    return { ok: false, erreur: `Systempay : erreur ${reponse.status}`, incertain: true };
  }
  const json = (await reponse.json().catch(() => null)) as {
    status?: string;
    answer?: Record<string, unknown>;
  } | null;
  if (!json?.answer) {
    return { ok: false, erreur: `Systempay : réponse illisible (HTTP ${reponse.status})`, incertain: true };
  }
  if (json.status !== "SUCCESS") {
    const a = json.answer as { errorCode?: string; errorMessage?: string; detailedErrorMessage?: string };
    return {
      ok: false,
      erreur: [a.errorCode, a.errorMessage, a.detailedErrorMessage].filter(Boolean).join(" – "),
      incertain: false,
    };
  }
  return { ok: true, answer: json.answer };
}

/**
 * Systempay refuse les adresses des domaines réservés aux essais
 * (.invalid, .test, .example, .localhost : erreur INT_015), comme celles
 * des comptes de recette fictifs (@recette.invalid). Vérifié le 21/10 sur la
 * boutique de démonstration.
 */
export function emailAccepteParSystempay(email: string | null | undefined): boolean {
  if (!email) return false;
  const domaine = email.split("@")[1]?.toLowerCase() ?? "";
  return /\.[a-z]{2,}$/.test(domaine) && !/\.(invalid|test|example|localhost)$/.test(domaine);
}

/** Euros → centimes, sans erreur d'arrondi (12.9 → 1290). */
export function enCentimes(euros: number): number {
  return Math.round(euros * 100);
}

/**
 * Jeton du formulaire de paiement : premier mois (ou échéance impayée) +
 * enregistrement de la carte (REGISTER_PAY), avec 3-D Secure.
 */
export async function creerFormulairePaiement(o: {
  orderId: string;
  montant: number;
  email: string;
  reference: string;
  prenom?: string;
  nom?: string;
  urlNotification: string;
  description: string;
}): Promise<ResultatApi> {
  return appelSystempay(
    "Charge/CreatePayment",
    {
      amount: enCentimes(o.montant),
      currency: "EUR",
      orderId: o.orderId,
      formAction: "REGISTER_PAY",
      customer: {
        email: o.email,
        reference: o.reference,
        billingDetails: { firstName: o.prenom || undefined, lastName: o.nom || undefined, language: "FR" },
      },
      ipnTargetUrl: o.urlNotification,
      transactionInitiator: "CUSTOMER",
      useCase: CAS_USAGE,
      metadata: { orderInfo: o.description },
    },
    15000,
  );
}

/** Échéance mensuelle : débit sans interaction avec l'alias de la carte. */
export async function debiterAlias(o: {
  orderId: string;
  montant: number;
  token: string;
  email: string | null;
  reference: string;
  /**
   * Adresse de notification de CE site. Indispensable : sans elle,
   * Systempay appliquerait la règle du Back Office, qui pointe vers l'ancien
   * site, et lui enverrait les notifications de nos échéances.
   */
  urlNotification: string;
}): Promise<ResultatApi> {
  return appelSystempay("Charge/CreatePayment", {
    amount: enCentimes(o.montant),
    currency: "EUR",
    orderId: o.orderId,
    formAction: "SILENT",
    paymentMethodToken: o.token,
    ipnTargetUrl: o.urlNotification,
    // Email facultatif pour un débit : omis s'il serait refusé.
    customer: { reference: o.reference, ...(emailAccepteParSystempay(o.email) ? { email: o.email } : {}) },
    transactionInitiator: "MERCHANT",
    useCase: CAS_USAGE,
    metadata: { orderInfo: "Échéance mensuelle Aide & Garde" },
  });
}

/** Transactions connues de Systempay pour une commande. */
export async function lireCommande(orderId: string): Promise<ResultatApi> {
  return appelSystempay("Order/Get", { orderId });
}

/**
 * Vérifie la signature d'une notification (IPN) : HMAC-SHA-256 du champ
 * kr-answer avec le MOT DE PASSE de l'API. Comparaison à temps constant.
 */
export function signatureIpnValide(krAnswer: string, krHash: string): boolean {
  const config = configSystempay();
  if (!config || !krAnswer || !krHash) return false;
  const attendu = createHmac("sha256", config.motDePasse).update(krAnswer, "utf8").digest("hex");
  const a = Buffer.from(attendu, "utf8");
  const b = Buffer.from(krHash.toLowerCase(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Ce que le site retient d'une transaction (jamais le numéro de carte). */
export interface Transaction {
  uuid: string | null;
  statut: string;
  statutDetaille: string | null;
  codeErreur: string | null;
  montant: number;
  token: string | null;
  carte: string | null;
  expiration: string | null;
}

type TransactionBrute = {
  uuid?: string;
  amount?: number;
  status?: string;
  detailedStatus?: string;
  errorCode?: string | null;
  detailedErrorCode?: string | null;
  paymentMethodToken?: string | null;
  operationType?: string;
  transactionDetails?: {
    cardDetails?: { pan?: string; expiryMonth?: number | string; expiryYear?: number | string };
  };
};

function lireTransaction(t: TransactionBrute): Transaction {
  const carte = t.transactionDetails?.cardDetails;
  let expiration: string | null = null;
  const mois = Number(carte?.expiryMonth);
  const an = Number(carte?.expiryYear);
  if (mois >= 1 && mois <= 12 && an > 2000) {
    // Dernier jour du mois d'expiration.
    expiration = new Date(Date.UTC(an, mois, 0)).toISOString().slice(0, 10);
  }
  return {
    uuid: t.uuid ?? null,
    statut: t.status ?? "UNPAID",
    statutDetaille: t.detailedStatus ?? null,
    codeErreur:
      [t.errorCode, t.detailedErrorCode].filter(Boolean).join("/") || null,
    montant: (t.amount ?? 0) / 100,
    token: t.paymentMethodToken ?? null,
    carte: carte?.pan ?? null,
    expiration,
  };
}

/**
 * Résume une réponse Systempay (paiement, notification ou Order/Get) :
 * référence de commande, statut global et transaction à retenir (celle qui
 * a payé s'il y en a une, sinon la plus récente).
 */
export function resumerReponse(answer: Record<string, unknown>): {
  orderId: string | null;
  statut: string;
  transaction: Transaction | null;
} {
  const brutes = ((answer.transactions as TransactionBrute[] | undefined) ?? []).filter(
    (t) => !t.operationType || t.operationType === "DEBIT",
  );
  const payee = brutes.find((t) => t.status === "PAID");
  const retenue = payee ?? brutes[brutes.length - 1];
  const orderDetails = answer.orderDetails as { orderId?: string } | undefined;
  // Order/Get ne renvoie pas de statut global : on le déduit des transactions.
  let statut = (answer.orderStatus as string | undefined) ?? "";
  if (!statut) {
    if (payee) statut = "PAID";
    else if (brutes.some((t) => t.status === "RUNNING")) statut = "RUNNING";
    else statut = brutes.length ? "UNPAID" : "";
  }
  const orderIdTransaction = (retenue as { orderDetails?: { orderId?: string } } | undefined)
    ?.orderDetails?.orderId;
  return {
    orderId: orderDetails?.orderId ?? orderIdTransaction ?? null,
    statut,
    transaction: retenue ? lireTransaction(retenue) : null,
  };
}
