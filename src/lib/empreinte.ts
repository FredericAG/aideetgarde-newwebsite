/**
 * Empreinte SHA-256 (hexadécimal) d'un fichier, calculée dans le navigateur
 * avant l'envoi : elle permet de reconnaître un PDF déjà déposé à
 * l'identique. Renvoie undefined si le navigateur ne sait pas la calculer
 * (le dépôt continue alors normalement, sans cette vérification).
 */
export async function empreinteFichier(f: Blob): Promise<string | undefined> {
  try {
    const octets = await f.arrayBuffer();
    const h = await crypto.subtle.digest("SHA-256", octets);
    return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return undefined;
  }
}
