/** Simplification pour la recherche du centre d'aide (accents, majuscules). */
export function simplifierTexte(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/g, "oe")
    .replace(/[^a-z0-9%]+/g, " ")
    .trim();
}
