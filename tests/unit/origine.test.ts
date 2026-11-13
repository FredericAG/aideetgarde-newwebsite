import { describe, expect, it } from "vitest";
import { classerOrigine, normaliserPage } from "@/lib/origine";

const site = "www.aideetgarde.fr";

describe("origine d'une visite", () => {
  it.each([
    ["?gclid=abc", "", "annonce"],
    ["?utm_source=google&utm_medium=cpc", "", "annonce"],
    ["?source=recommandation", "", "recommandation"],
    ["?utm_source=newsletter&utm_medium=email", "", "email"],
    ["?utm_source=ircem&utm_medium=partenaire", "", "partenaire"],
    ["?fbclid=x", "", "reseaux"],
    ["", "https://www.google.fr/", "moteur"],
    ["", "https://www.qwant.com/?q=nounou", "moteur"],
    ["", "https://l.facebook.com/", "reseaux"],
    ["", "https://www.aideetgarde.fr/tarifs", "interne"],
    ["", "https://exemple.org/article", "autre_site"],
    ["", "", "direct"],
  ])("%s / %s → %s", (recherche, referrer, attendu) => {
    expect(classerOrigine(recherche, referrer, site)).toBe(attendu);
  });
});

describe("page ramenée à son modèle", () => {
  it("remplace les identifiants", () => {
    expect(normaliserPage("/tableau-de-bord/gestions/2f1e2a3b-1234-4abc-9def-0123456789ab?x=1")).toBe("/tableau-de-bord/gestions/[id]");
    expect(normaliserPage("")).toBe("/");
  });
});
