import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { enCentimes, resumerReponse, signatureIpnValide } from "@/lib/systempay";
import { FORMULES, formuleParQuota } from "@/lib/formules";

describe("Systempay", () => {
  afterEach(() => {
    delete process.env.SYSTEMPAY_BOUTIQUE;
    delete process.env.SYSTEMPAY_MOT_DE_PASSE;
    delete process.env.NEXT_PUBLIC_SYSTEMPAY_CLE_PUBLIQUE;
  });

  it("vérifie la signature d'une notification", () => {
    process.env.SYSTEMPAY_BOUTIQUE = "12345678";
    process.env.SYSTEMPAY_MOT_DE_PASSE = "testpassword_fictif";
    process.env.NEXT_PUBLIC_SYSTEMPAY_CLE_PUBLIQUE = "12345678:testpublickey_fictif";
    const reponse = JSON.stringify({ orderStatus: "PAID" });
    const signature = createHmac("sha256", "testpassword_fictif").update(reponse, "utf8").digest("hex");
    expect(signatureIpnValide(reponse, signature)).toBe(true);
    expect(signatureIpnValide(reponse.replace("PAID", "UNPAID"), signature)).toBe(false);
    expect(signatureIpnValide(reponse, "00")).toBe(false);
  });

  it("refuse toute signature sans configuration", () => {
    expect(signatureIpnValide("{}", "abc")).toBe(false);
  });

  it("retient la transaction payée et la fin du mois d'expiration de la carte", () => {
    const r = resumerReponse({
      orderStatus: "PAID",
      orderDetails: { orderId: "S-1" },
      transactions: [
        { uuid: "a", status: "UNPAID", amount: 1290 },
        {
          uuid: "b",
          status: "PAID",
          amount: 1290,
          paymentMethodToken: "alias",
          transactionDetails: { cardDetails: { pan: "497010XXXXXX0228", expiryMonth: 2, expiryYear: 2028 } },
        },
      ],
    });
    expect(r.orderId).toBe("S-1");
    expect(r.transaction?.uuid).toBe("b");
    expect(r.transaction?.montant).toBe(12.9);
    expect(r.transaction?.expiration).toBe("2028-02-29");
  });

  it("nouvelle carte sans paiement : lit la transaction de vérification", () => {
    const r = resumerReponse({
      orderStatus: "PAID",
      orderDetails: { orderId: "C-1" },
      transactions: [{ uuid: "v", status: "PAID", amount: 0, operationType: "VERIFICATION", paymentMethodToken: "nouvel-alias" }],
    });
    expect(r.transaction?.token).toBe("nouvel-alias");
  });

  it("convertit en centimes sans erreur d'arrondi", () => {
    expect(enCentimes(12.9)).toBe(1290);
    expect(enCentimes(19.2)).toBe(1920);
  });
});

describe("formules", () => {
  it("grille en vigueur", () => {
    expect(FORMULES.map((f) => f.tarif)).toEqual([12.9, 19.2, 25.8, 25.8]);
    expect(formuleParQuota(2)?.tarif).toBe(19.2);
    expect(formuleParQuota(9)).toBeUndefined();
  });
});
