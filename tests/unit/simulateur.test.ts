import { describe, expect, it } from "vitest";
import { REFERENCE_EXCEL, brutDepuisNet, cotisations, simuler } from "@/lib/simulateur";

describe("simulateur de coût", () => {
  it("retrouve les valeurs de l'Excel (scénario de référence)", () => {
    const r = simuler(REFERENCE_EXCEL.entrees) as unknown as Record<string, number>;
    for (const [cellule, valeur] of Object.entries(REFERENCE_EXCEL.valeurs)) {
      expect(Math.abs(r[cellule] - (valeur as number)), cellule).toBeLessThan(0.005);
    }
  });
  it("reste sur cotisations = cotisations moins aides sur un an, divisé par 12 (écart voulu avec l'Excel)", () => {
    const r = simuler(REFERENCE_EXCEL.entrees);
    expect(r.H17).toBeCloseTo(r.H24 / 12, 6);
    expect(r.H17).toBeGreaterThan(0);
  });
  it("inverse le net en brut au centime (au-dessus du minimum)", () => {
    for (const net of [10.5, 11, 12.34, 15, 20]) {
      const brut = brutDepuisNet(net, 3);
      expect(brut - cotisations(brut).ps).toBeGreaterThanOrEqual(net - 0.005);
    }
  });
  it("applique le minimum conventionnel et prévient", () => {
    const r = simuler({ netHoraire: 5, heuresHebdo: 40, enfants: 1, revenu: 30000 });
    expect(r.H3).toBeCloseTo(10.08, 2);
    expect(r.messages.join(" ")).toMatch(/minimum conventionnel/);
  });
  it("plus d'aide CAF après 6 ans", () => {
    const r = simuler({ netHoraire: 11, heuresHebdo: 20, enfants: 1, ageAns: 7, revenu: 40000 });
    expect(r.H15).toBe(0);
    expect(r.H16).toBe(0);
  });
});
