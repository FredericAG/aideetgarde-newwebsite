import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { attestationEnPdf, anneesProposees } from "@/lib/attestation-fiscale";

describe("attestation fiscale", () => {
  it("produit un PDF avec les données fournies", async () => {
    const pdf = await attestationEnPdf({
      annee: 2026,
      numero: "AF-2026-C00012",
      employeur: { nom: "Madame Jeanne Exemple", adresse: ["1 rue de l'Exemple", "75001 Paris"], reference: "C00012" },
      paiementsSite: 25.8,
      rembourse: 0,
      importe: 128.9,
      ajustement: 0,
      total: 154.7,
      carte: "497010XXXXXX0228",
      salaries: [{ nom: "Marie Exemple", periode: "du 01/01/2026 au 31/12/2026" }],
    });
    expect(Buffer.from(pdf.slice(0, 4)).toString()).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(1500);
    if (process.env.APERCU_PDF) writeFileSync(process.env.APERCU_PDF, pdf);
  });
  it("propose les trois années écoulées, pas avant 2025", () => {
    expect(anneesProposees(new Date(2027, 0, 5))).toEqual([2026, 2025]);
  });
});
