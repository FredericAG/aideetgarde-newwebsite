/**
 * Simulateur de coût d'un salarié à domicile (garde d'enfants), porté de
 * l'onglet « Simulateur » (plage G2:H30) de « Gestion paie Nounou 5.xlsm »,
 * avec les constantes 2026 de « Constantes légales.xlsm ».
 *
 * Fonctions pures, testées (tests/simulateur.test.ts) contre les valeurs de
 * l'Excel. Pour mettre à jour les taux chaque année : ne modifier que
 * CONFIG_SIMULATEUR.
 *
 * Écart volontaire avec l'Excel (13/11/2026, signalé à Frédéric) : la ligne
 * « Reste à payer sur cotisations » (H17) ne retire plus l'aide CAF, qui
 * porte sur le salaire net et non sur les cotisations (l'Excel donnait des
 * montants négatifs). H17 = H24 / 12. Les totaux (H18, H29, H30) sont
 * inchangés.
 *
 * Périmètre : garde simple, hors Alsace-Moselle, Pajemploi, CDI. Simulation
 * indicative et non contractuelle.
 */

type Base = "full" | "plaf" | "t2" | "above";

interface LigneCotisation {
  id: string;
  label: string;
  /** Part salariale. */
  ps: number;
  /** Part patronale. */
  pe: number;
  base: Base;
  /** Coefficient d'assiette (0,9825 pour la CSG/CRDS). */
  d: number;
}

export const CONFIG_SIMULATEUR = {
  annee: 2026,
  plafondSS: 4005,
  cotisations: [
    { id: "ss", label: "Sécurité sociale (maladie…)", ps: 0, pe: 0.13, base: "full", d: 1 },
    { id: "prev", label: "Prévoyance IRCEM", ps: 0.0104, pe: 0.012, base: "full", d: 1 },
    { id: "atmp", label: "Accidents du travail", ps: 0, pe: 0.0206, base: "full", d: 1 },
    { id: "fived", label: "Fived + paritarisme + départ ret.", ps: 0, pe: 0.0125, base: "full", d: 1 },
    { id: "vieilP", label: "Vieillesse plafonnée", ps: 0.069, pe: 0.0855, base: "plaf", d: 1 },
    { id: "vieilD", label: "Vieillesse déplafonnée", ps: 0.004, pe: 0.0211, base: "full", d: 1 },
    { id: "ircem1", label: "IRCEM retraite compl. tranche 1", ps: 0.0315, pe: 0.0472, base: "plaf", d: 1 },
    { id: "ircem2", label: "IRCEM retraite compl. tranche 2", ps: 0.0864, pe: 0.1295, base: "t2", d: 1 },
    { id: "ceg1", label: "CEG tranche 1", ps: 0.0086, pe: 0.0129, base: "plaf", d: 1 },
    { id: "ceg2", label: "CEG tranche 2", ps: 0.0108, pe: 0.0162, base: "t2", d: 1 },
    { id: "cet", label: "CET", ps: 0.0014, pe: 0.0021, base: "above", d: 1 },
    { id: "af", label: "Allocations familiales", ps: 0, pe: 0.0525, base: "full", d: 1 },
    { id: "cho1", label: "Assurance chômage tranche 1", ps: 0, pe: 0.0405, base: "plaf", d: 1 },
    { id: "cho2", label: "Assurance chômage tranche 2", ps: 0, pe: 0.0405, base: "t2", d: 1 },
    { id: "fnal", label: "FNAL", ps: 0, pe: 0.001, base: "plaf", d: 1 },
    { id: "csa", label: "Contribution solidarité autonomie", ps: 0, pe: 0.003, base: "full", d: 1 },
    { id: "form", label: "Formation professionnelle", ps: 0, pe: 0.0085, base: "full", d: 1 },
    { id: "synd", label: "Financement organisations syndicales", ps: 0, pe: 0.00016, base: "full", d: 1 },
    { id: "csg", label: "CSG / CRDS", ps: 0.029, pe: 0, base: "full", d: 0.9825 },
    { id: "csgd", label: "CSG déductible", ps: 0.068, pe: 0, base: "full", d: 0.9825 },
  ] as LigneCotisation[],
  /** Minimums conventionnels (shb brut, shn net), cas général. */
  grille: {
    1: { shb: 12.61, shn: 9.85 },
    2: { shb: 12.74, shn: 9.96 },
    3: { shb: 12.89, shn: 10.08 },
    4: { shb: 13.08, shn: 10.23 },
    5: { shb: 13.28, shn: 10.37 },
    6: { shb: 13.8, shn: 10.78 },
  } as Record<number, { shb: number; shn: number }>,
  niveauDefaut: 3,
  dureeLegale: 40,
  bandeMaj25: 8,
  maj25: 0.25,
  maj50: 0.5,
  deductionForfaitaireHoraire: 2,
  coefPonderationForfait: 0.9,
  cmg: {
    plafondHoraire: 15,
    coutHoraireReference: 10.5,
    revenuMensuelMin: 814.02,
    revenuMensuelMax: 8500,
    tauxEffort: { 1: 0.001238, 2: 0.001032, 3: 0.000826, 4: 0.00062 } as Record<number, number>,
    ageMaxAide: 6,
    ageSeuilCotisations: 3,
    aideCotisMensuelle: { moins3: 524, de3a6: 263 },
    partAideCotisations: 0.5,
  },
  transport: { abonnementMensuel: 90.8, seuilHeures: 17.5 },
  creditImpot: { depensesBase: 12000, majoParEnfant: 1500, depensesMax: 15000, taux: 0.5 },
};

export type ConfigSimulateur = typeof CONFIG_SIMULATEUR;

const SEMAINES_PAR_MOIS = 52 / 12;

/** ARRONDI() d'Excel : demi vers l'extérieur, 2 décimales. */
function r2(x: number): number {
  const s = x < 0 ? -1 : 1;
  return (s * Math.round(Math.abs(x) * 100 * (1 + 1e-12))) / 100;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function assiette(l: LigneCotisation, brut: number, plafond: number): number {
  const b = l.d * brut;
  switch (l.base) {
    case "plaf":
      return Math.min(plafond, b);
    case "t2":
      return brut < plafond ? 0 : l.d * (brut - plafond);
    case "above":
      return brut < plafond ? 0 : b;
    default:
      return b;
  }
}

/** Cotisations arrondies ligne par ligne, comme l'Excel. */
export function cotisations(brut: number, cfg: ConfigSimulateur = CONFIG_SIMULATEUR): { ps: number; pe: number } {
  let ps = 0;
  let pe = 0;
  for (const l of cfg.cotisations) {
    const base = assiette(l, brut, cfg.plafondSS);
    ps += r2(l.ps * base);
    pe += r2(l.pe * base);
  }
  return { ps, pe };
}

function netHoraireDepuisBrut(brutHoraire: number, niveau: number, cfg: ConfigSimulateur): number {
  return Math.max(cfg.grille[niveau].shn, brutHoraire - cotisations(brutHoraire, cfg).ps);
}

/** Plus petit brut horaire (au centime) donnant au moins le net demandé. */
export function brutDepuisNet(netCible: number, niveau: number, cfg: ConfigSimulateur = CONFIG_SIMULATEUR): number {
  const g = cfg.grille[niveau];
  if (netCible <= g.shn) return g.shb;
  const tauxPS = cfg.cotisations.reduce((a, l) => a + (l.base === "full" || l.base === "plaf" ? l.ps * l.d : 0), 0);
  const net = (b: number) => b - cotisations(b, cfg).ps;
  let b = Math.max(g.shb, r2(netCible / (1 - tauxPS)));
  let i = 0;
  while (net(b) < netCible - 0.005 && i++ < 500) b = r2(b + 0.01);
  while (b - 0.01 >= g.shb && net(r2(b - 0.01)) >= netCible - 0.005 && i++ < 1000) b = r2(b - 0.01);
  return b;
}

export interface EntreesSimulateur {
  netHoraire?: number;
  /** Prioritaire sur netHoraire s'il est fourni. */
  brutHoraire?: number;
  heuresHebdo: number;
  enfants: number;
  ageAns?: number;
  ageMois?: number;
  /** Âge en années décimales (prioritaire sur ageAns/ageMois). */
  ageAnnees?: number;
  /** Revenu fiscal de référence annuel du foyer. */
  revenu: number;
  niveau?: number;
  /** 0 à 100, 50 par défaut. */
  transportPct?: number;
  repasJour?: number;
  joursSemaine?: number;
}

/** Résultat, clés au nom des cellules Excel (H3…H30). */
export interface ResultatSimulateur {
  messages: string[];
  niveau: number;
  H3: number; H4: number; H5: number; H6: number; H7: number;
  H9: number; H10: number; H11: number; H12: number;
  H14: number; H15: number; H16: number; H17: number; H18: number;
  H20: number; H21: number;
  H23: number; H24: number; H25: number; H26: number; H27: number; H28: number; H29: number; H30: number;
}

const virgule = (x: number) => x.toFixed(2).replace(".", ",");

export function simuler(e: EntreesSimulateur, cfg: ConfigSimulateur = CONFIG_SIMULATEUR): ResultatSimulateur {
  const messages: string[] = [];
  const niveau = e.niveau && cfg.grille[e.niveau] ? Number(e.niveau) : cfg.niveauDefaut;
  const g = cfg.grille[niveau];

  const hrs = Math.max(0, Number(e.heuresHebdo) || 0);
  const enfants = clamp(Math.round(Number(e.enfants) || 1), 1, 4);
  const age = e.ageAnnees != null ? Number(e.ageAnnees) : (Number(e.ageAns) || 0) + (Number(e.ageMois) || 0) / 12;
  const revenu = Math.max(0, Number(e.revenu) || 0);
  const transportPct = clamp((e.transportPct == null ? 50 : Number(e.transportPct)) / 100, 0, 1);
  const repasJour = Math.max(0, Number(e.repasJour) || 0);
  const joursSem = clamp(Math.round(Number(e.joursSemaine) || 5), 1, 7);

  // Salaire horaire
  let brutH: number;
  if (e.brutHoraire != null && Number.isFinite(e.brutHoraire)) {
    brutH = Math.max(g.shb, Number(e.brutHoraire));
  } else {
    const netSaisi = Math.max(0, Number(e.netHoraire) || 0);
    brutH = brutDepuisNet(netSaisi, niveau, cfg);
    if (netSaisi < g.shn - 0.005) {
      messages.push(
        `Le salaire net saisi est inférieur au minimum conventionnel (${virgule(g.shn)} € net pour le niveau ${niveau}) : le minimum est appliqué.`,
      );
    }
  }
  const H4 = brutH;
  const H3 = netHoraireDepuisBrut(brutH, niveau, cfg);

  // Heures
  const hNorm = Math.min(hrs, cfg.dureeLegale);
  const hS25 = hrs > cfg.dureeLegale ? Math.min(hrs - cfg.dureeLegale, cfg.bandeMaj25) : 0;
  const hS50 = hrs > cfg.dureeLegale + cfg.bandeMaj25 ? hrs - cfg.dureeLegale - cfg.bandeMaj25 : 0;
  const H5 = hrs;
  const H6 = hrs * SEMAINES_PAR_MOIS;

  // Salaire et cotisations
  const brutMensuel = SEMAINES_PAR_MOIS * (hNorm * brutH + hS25 * brutH * (1 + cfg.maj25) + hS50 * brutH * (1 + cfg.maj50));
  const cot = cotisations(brutMensuel, cfg);
  const H9 = cot.ps;
  const H7 = brutMensuel - H9;
  const H10 = H7 + H9;
  const H11 = cot.pe;
  const H12 = H7 + H9 + H11;

  // Aides
  const c = cfg.cmg;
  const H14 = H6 * cfg.coefPonderationForfait * cfg.deductionForfaitaireHoraire;
  const revMens = clamp(revenu / 12, c.revenuMensuelMin, c.revenuMensuelMax);
  const tauxEffort = c.tauxEffort[enfants];
  const cmgBrut = Math.max(0, Math.min(H7, c.plafondHoraire * H6) * (1 - (revMens * tauxEffort) / c.coutHoraireReference));
  const H15 = age > c.ageMaxAide ? 0 : cmgBrut;
  const plafondCotis = age > c.ageMaxAide ? 0 : age <= c.ageSeuilCotisations ? c.aideCotisMensuelle.moins3 : c.aideCotisMensuelle.de3a6;
  const H16 = Math.min(plafondCotis, (H9 + H11) * c.partAideCotisations);
  // Écart volontaire avec l'Excel (voir en tête) : l'aide CAF n'est pas
  // retirée des cotisations.
  const H17 = H9 + H11 - H14 - H16;
  const H18 = H12 - (H14 + H15 + H16);

  // Indemnités (garde simple : part 1)
  const H20 = repasJour * Math.ceil((joursSem * 52) / 12);
  const t = cfg.transport;
  const H21 = hrs < t.seuilHeures ? (transportPct * t.abonnementMensuel * hrs) / t.seuilHeures : transportPct * t.abonnementMensuel;

  // Reste à charge annuel et crédit d'impôt
  const H23 = 12 * (H7 - H15);
  const H24 = (H9 + H11 - H16 - H14) * 12;
  const H25 = H23 + H24;
  const H26 = (H21 + H20) * 12;
  const H27 = H25 + H26;
  const ci = cfg.creditImpot;
  const H28 = Math.min(ci.depensesMax, ci.depensesBase + enfants * ci.majoParEnfant);
  const H29 = H27 - H28 > 0 ? H27 - H28 + H28 * (1 - ci.taux) : H27 * (1 - ci.taux);
  const H30 = H6 > 0 ? H29 / 12 / H6 : 0;

  if (age > c.ageMaxAide) {
    messages.push(
      "Le plus jeune enfant a plus de 6 ans : le complément de libre choix du mode de garde et l'aide sur les cotisations ne s'appliquent plus (seule la déduction forfaitaire est conservée). Famille monoparentale : l'aide peut continuer jusqu'aux 12 ans de l'enfant, ce que ce simulateur ne calcule pas.",
    );
  }
  if (Number(e.enfants) > 4) messages.push("Au-delà de 4 enfants, le barème « 4 enfants » est appliqué.");
  if (hrs === 0) messages.push("Indiquez un nombre d'heures supérieur à 0.");

  return {
    messages,
    niveau,
    H3, H4, H5, H6, H7, H9, H10, H11, H12, H14, H15, H16, H17, H18, H20, H21,
    H23, H24, H25, H26, H27, H28, H29, H30,
  };
}

/** Valeurs de l'Excel (cache du 16/09/2026), scénario par défaut. */
export const REFERENCE_EXCEL = {
  entrees: { brutHoraire: 12.89, heuresHebdo: 48, enfants: 2, ageAnnees: 1.5315068493150685, revenu: 200000, transportPct: 50 },
  valeurs: {
    H3: 10.08, H4: 12.89, H5: 48, H6: 208, H7: 2181.753333333333, H9: 611.08, H10: 2792.833333333333, H11: 1249.68,
    H12: 4042.5133333333333, H14: 374.40000000000003, H15: 359.0542628571429, H16: 524,
    H18: 2785.0590704761903, H20: 0, H21: 45.4, H23: 21872.388845714282, H24: 11548.32, H25: 33420.70884571428,
    H26: 544.8, H27: 33965.508845714285, H28: 15000, H29: 26465.508845714285, H30: 10.603168608058608,
  } as Partial<Record<keyof ResultatSimulateur, number>>,
};
