import { describe, expect, it } from "vitest";
import { contenuRelance } from "@/lib/relances";

describe("relance « déclaration du mois »", () => {
  it("début de mois : porte sur le mois écoulé, date limite le 4", () => {
    const c = contenuRelance("declaration_mois", new Date(2026, 11, 2));
    expect(c.sujet).toContain("novembre 2026");
    expect(c.paragraphes[0]).toContain("4 décembre 2026");
  });
  it("fin de mois : porte sur le mois en cours", () => {
    const c = contenuRelance("declaration_mois", new Date(2026, 10, 28));
    expect(c.sujet).toContain("novembre 2026");
  });
  it("décembre : date limite en janvier de l'année suivante", () => {
    const c = contenuRelance("declaration_mois", new Date(2026, 11, 28));
    expect(c.paragraphes[0]).toContain("4 janvier 2027");
  });
});
