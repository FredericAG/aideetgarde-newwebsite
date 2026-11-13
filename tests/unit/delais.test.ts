import { describe, expect, it } from "vitest";
import { calendrierEntretien, dateLimiteDeclaration, fenetreNotification, joursFeries } from "@/lib/delais";

describe("jours fériés", () => {
  it("calcule Pâques et ses fêtes mobiles (2026)", () => {
    const f = joursFeries(2026);
    expect(f.has("2026-04-06")).toBe(true); // lundi de Pâques
    expect(f.has("2026-05-14")).toBe(true); // Ascension
    expect(f.has("2026-05-25")).toBe(true); // lundi de Pentecôte
    expect(f.has("2026-11-11")).toBe(true);
  });
});

describe("entretien préalable (CCN IDCC 3239, art. 161.1.1.1)", () => {
  it("remise en main propre le mardi 17/11/2026 : au plus tôt le lundi 23/11", () => {
    expect(calendrierEntretien("main_propre", "2026-11-17")?.auPlusTot).toBe("2026-11-23");
  });
  it("recommandé envoyé le lundi 16/11 : présentation estimée jeudi 19, entretien mardi 24/11", () => {
    const c = calendrierEntretien("recommande", "2026-11-16");
    expect(c?.presentation).toBe("2026-11-19");
    expect(c?.presentationEstimee).toBe(true);
    expect(c?.auPlusTot).toBe("2026-11-24");
  });
  it("tient compte du 11 novembre férié", () => {
    expect(calendrierEntretien("main_propre", "2026-11-09")?.auPlusTot).toBe("2026-11-16");
  });
  it("refuse une date mal formée", () => {
    expect(calendrierEntretien("main_propre", "17/11/2026")).toBeNull();
  });
  it("lettre de licenciement : du 4e au 30e jour ouvrable après l'entretien", () => {
    const f = fenetreNotification("2026-11-24");
    // 4e jour ouvrable : samedi 28, reporté au lundi (un délai ne finit pas un samedi).
    expect(f?.debut).toBe("2026-11-30");
    expect(f && f.fin > "2026-12-24").toBe(true);
  });
});

describe("date limite de la déclaration du mois", () => {
  it("le 4 du mois suivant", () => {
    expect(dateLimiteDeclaration("2611")).toBe("2026-12-04");
    expect(dateLimiteDeclaration("2612")).toBe("2027-01-04");
    expect(dateLimiteDeclaration("2613")).toBeNull();
  });
});
