import { describe, expect, it } from "vitest";
import { exportGestion, versCsv } from "@/lib/contrat/export";
import type { Gestion } from "@/lib/data";

const gestion = {
  id: "g",
  reference: "G00001",
  statut: "envoyee",
  type_gestion: "garde_enfants",
  prenom_salarie: "Lina",
  nom_salarie: "=SOMME(A1)",
  config: {},
} as unknown as Gestion;

describe("export CSV d'une gestion", () => {
  it("garde un nombre de colonnes figé, sans doublon", () => {
    const { titres, valeurs } = exportGestion(gestion, {});
    expect(titres.length).toBe(137);
    expect(valeurs.length).toBe(titres.length);
    expect(new Set(titres).size).toBe(titres.length);
  });
  it("neutralise les formules et produit un CSV pour Excel", () => {
    const csv = versCsv([["a", "=SOMME(A1)", "+33 6 00", "texte ; avec point-virgule"]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("'=SOMME(A1)");
    expect(csv).toContain('"+33 6 00"');
    expect(csv).toContain('"texte ; avec point-virgule"');
    expect(csv.endsWith("\r\n")).toBe(true);
  });
});
