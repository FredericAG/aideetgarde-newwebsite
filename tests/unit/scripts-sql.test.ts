import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SCRIPTS_SQL } from "@/lib/scripts-sql";

const ordre = readFileSync("supabase/ORDRE.txt", "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"));

describe("scripts SQL", () => {
  it("chaque script du dossier supabase figure dans ORDRE.txt", () => {
    const fichiers = readdirSync("supabase")
      .filter((f) => f.endsWith(".sql") && !f.startsWith("donnees_"))
      .map((f) => f.replace(/\.sql$/, ""));
    expect([...fichiers].sort()).toEqual([...ordre].sort());
  });
  it("l'administration attend la même liste, dans le même ordre", () => {
    expect(SCRIPTS_SQL).toEqual(ordre);
  });
  it("chaque script récent s'inscrit dans le registre", () => {
    const depuis = ordre.indexOf("brique11_role_conseiller");
    for (const nom of ordre.slice(depuis)) {
      expect(readFileSync(`supabase/${nom}.sql`, "utf8"), nom).toContain(`'${nom}'`);
    }
  });
});
