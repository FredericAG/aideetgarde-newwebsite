/**
 * Délais de la procédure de licenciement d'un salarié de particulier
 * employeur (demande du 12/11/2026), d'après la convention collective IDCC
 * 3239, article 161.1.1.1 :
 *
 * - l'entretien préalable peut se tenir à partir du 4e jour ouvrable ;
 *   le délai part du lendemain de la remise en main propre contre décharge
 *   ou du lendemain de la première présentation de la lettre recommandée ;
 * - la lettre de licenciement peut être envoyée à partir du 4e jour ouvrable
 *   et au plus tard le 30e jour ouvrable (à minuit) après l'entretien ;
 * - un délai ne peut pas expirer un samedi, un dimanche ou un jour férié :
 *   il est reporté au jour ouvrable suivant.
 *
 * Jour ouvrable : tous les jours sauf le dimanche et les jours fériés.
 * Jours fériés : ceux de la métropole (pas ceux propres à l'Alsace-Moselle).
 * Les dates sont des chaînes « AAAA-MM-JJ », calculées sans fuseau horaire.
 */

/** Délai indicatif de La Poste pour une lettre recommandée (métropole). */
export const DELAI_POSTE_JOURS_OUVRABLES = 3;

function versDate(iso: string): Date {
  const [a, m, j] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, j));
}

function versIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function plusJours(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000);
}

/** Dimanche de Pâques (algorithme de Meeus). */
function paques(annee: number): Date {
  const a = annee % 19;
  const b = Math.floor(annee / 100);
  const c = annee % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31);
  const jour = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(annee, mois - 1, jour));
}

const cacheFeries = new Map<number, Set<string>>();

/** Jours fériés de l'année (métropole), au format AAAA-MM-JJ. */
export function joursFeries(annee: number): Set<string> {
  const deja = cacheFeries.get(annee);
  if (deja) return deja;
  const p = paques(annee);
  const fixes = ["01-01", "05-01", "05-08", "07-14", "08-15", "11-01", "11-11", "12-25"].map((md) => `${annee}-${md}`);
  const mobiles = [plusJours(p, 1), plusJours(p, 39), plusJours(p, 50)].map(versIso); // lundi de Pâques, Ascension, lundi de Pentecôte
  const s = new Set([...fixes, ...mobiles]);
  cacheFeries.set(annee, s);
  return s;
}

function estFerie(d: Date): boolean {
  return joursFeries(d.getUTCFullYear()).has(versIso(d));
}

/** Jour ouvrable : ni dimanche, ni jour férié. */
function estOuvrable(d: Date): boolean {
  return d.getUTCDay() !== 0 && !estFerie(d);
}

/** Le n-ième jour ouvrable qui suit `depart` (le jour de départ ne compte pas). */
function nIemeJourOuvrable(depart: Date, n: number): Date {
  let d = depart;
  let compte = 0;
  while (compte < n) {
    d = plusJours(d, 1);
    if (estOuvrable(d)) compte++;
  }
  return d;
}

/** Un délai ne peut pas expirer un samedi, un dimanche ou un jour férié. */
function reporter(d: Date): Date {
  let x = d;
  while (x.getUTCDay() === 6 || x.getUTCDay() === 0 || estFerie(x)) x = plusJours(x, 1);
  return x;
}

export type ModeRemise = "main_propre" | "recommande";

export interface CalendrierEntretien {
  /** Date à partir de laquelle court le délai (remise, ou présentation estimée). */
  presentation: string;
  /** Vrai si la date de présentation est une estimation (recommandé). */
  presentationEstimee: boolean;
  /** Premier jour possible pour l'entretien. */
  auPlusTot: string;
}

/** Date au plus tôt de l'entretien préalable. */
export function calendrierEntretien(mode: ModeRemise, date: string): CalendrierEntretien | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const depart = versDate(date);
  // Recommandé : La Poste distribue du lundi au samedi, hors jours fériés,
  // en 3 jours ouvrables (délai indicatif).
  const presentation = mode === "recommande" ? nIemeJourOuvrable(depart, DELAI_POSTE_JOURS_OUVRABLES) : depart;
  return {
    presentation: versIso(presentation),
    presentationEstimee: mode === "recommande",
    auPlusTot: versIso(reporter(nIemeJourOuvrable(presentation, 4))),
  };
}

/** Période d'envoi de la lettre de licenciement après l'entretien. */
export function fenetreNotification(dateEntretien: string): { debut: string; fin: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateEntretien)) return null;
  const e = versDate(dateEntretien);
  return { debut: versIso(reporter(nIemeJourOuvrable(e, 4))), fin: versIso(reporter(nIemeJourOuvrable(e, 30))) };
}

/** « 2026-11-23 » → « lundi 23 novembre 2026 ». */
export function dateEnClair(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(versDate(iso));
}
