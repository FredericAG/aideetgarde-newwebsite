import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Tests automatiques des calculs (lancés par GitHub à chaque Push, voir
 * .github/workflows/tests.yml). Vitest n'est pas une dépendance du site :
 * le test l'installe à la volée (npm install --no-save vitest).
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Garde-fou de Next.js, sans objet dans les tests.
      "server-only": fileURLToPath(new URL("./tests/unit/vide.ts", import.meta.url)),
    },
  },
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node" },
});
