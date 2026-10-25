/**
 * Champs complémentaires d'une gestion (formulaire « Créer une gestion »,
 * version 1 du 25/10/2026), d'après la matrice des champs du contrat de
 * l'ancien site (tableau Excel de 2014, analysé le 24/09 : document
 * « Champs d'une gestion et modèle configurable »).
 *
 * Règle de partage retenue : les champs dont le site a besoin pour raisonner
 * (emploi, contrat, dates, heures, salaire) sont des colonnes de la table
 * `gestions` ; tous les autres sont décrits ICI et enregistrés ensemble dans
 * la colonne `config` (JSON). Ajouter, retirer, renommer un champ, le rendre
 * obligatoire ou changer sa condition d'affichage se fait dans ce seul
 * fichier, sans toucher à la base.
 *
 * - `obligatoire` : exigé pour ENVOYER la gestion (le brouillon accepte tout).
 * - `si` : condition d'affichage (un champ masqué n'est ni exigé ni gardé).
 * - `emplois` : emplois concernés (tous si absent).
 * - `colonne` : le champ est rangé dans une colonne existante de la gestion
 *   (coordonnées du salarié, utilisées par les courriers).
 */
import type { TypeGestion } from "@/lib/data";

export type TypeChamp = "texte" | "textarea" | "date" | "nombre" | "choix" | "oui_non" | "telephone" | "email";

export type Valeurs = Record<string, string>;

export interface ContexteChamps {
  type_gestion: TypeGestion;
  type_contrat: string;
  remplacement: boolean;
}

export interface ChampContrat {
  cle: string;
  libelle: string;
  type: TypeChamp;
  aide?: string;
  placeholder?: string;
  options?: { valeur: string; libelle: string }[] | ((c: ContexteChamps) => { valeur: string; libelle: string }[]);
  obligatoire?: boolean | ((c: ContexteChamps, v: Valeurs) => boolean);
  si?: (v: Valeurs, c: ContexteChamps) => boolean;
  emplois?: TypeGestion[];
  colonne?: "civilite_salarie" | "adresse_salarie" | "code_postal_salarie" | "ville_salarie";
  /** Valeur proposée pour une nouvelle gestion. */
  defaut?: (c: ContexteChamps) => string;
  /** Largeur sur ordinateur : « demi » (deux par ligne) ou « entier ». */
  largeur?: "demi" | "entier";
}

export interface RubriqueContrat {
  cle: "salarie" | "emploi" | "contrat" | "horaires" | "remuneration" | "employeur";
  titre: string;
  intro?: string;
  champs: ChampContrat[];
}

const oui = (v: Valeurs, cle: string) => v[cle] === "oui";

/** Emploi-repère de la convention collective proposé selon l'emploi. */
export const EMPLOIS_REPERES: Record<TypeGestion, { emploi: string; rome: string; niveau: string }> = {
  garde_enfants: { emploi: "Assistant parental", rome: "K1303", niveau: "3" },
  employe_maison: { emploi: "Employé familial", rome: "K1304", niveau: "" },
  aide_domicile: { emploi: "Assistant de vie", rome: "K1302", niveau: "" },
};

export const RUBRIQUES: RubriqueContrat[] = [
  {
    cle: "salarie",
    titre: "Le salarié",
    champs: [
      {
        cle: "civilite_salarie",
        colonne: "civilite_salarie",
        libelle: "Civilité",
        type: "choix",
        options: [
          { valeur: "Madame", libelle: "Madame" },
          { valeur: "Monsieur", libelle: "Monsieur" },
        ],
        obligatoire: true,
      },
      { cle: "nom_naissance", libelle: "Nom de naissance (s'il est différent)", type: "texte" },
      { cle: "date_naissance", libelle: "Date de naissance", type: "date", obligatoire: true },
      { cle: "lieu_naissance", libelle: "Lieu de naissance (ville, pays)", type: "texte" },
      {
        cle: "nationalite",
        libelle: "Nationalité",
        type: "choix",
        options: [
          { valeur: "francaise", libelle: "Française" },
          { valeur: "ue", libelle: "Union européenne, Espace économique européen ou Suisse" },
          { valeur: "autre", libelle: "Autre" },
        ],
        obligatoire: true,
      },
      { cle: "nationalite_pays", libelle: "Pays de nationalité", type: "texte", si: (v) => v.nationalite === "autre" || v.nationalite === "ue", obligatoire: (_c, v) => v.nationalite === "autre" },
      {
        cle: "titre_sejour_type",
        libelle: "Titre autorisant à travailler",
        type: "choix",
        options: [
          { valeur: "carte_sejour", libelle: "Carte de séjour (mention salarié ou vie privée et familiale)" },
          { valeur: "carte_resident", libelle: "Carte de résident" },
          { valeur: "recepisse", libelle: "Récépissé de demande de titre" },
          { valeur: "autorisation_provisoire", libelle: "Autorisation provisoire de séjour" },
          { valeur: "aucun", libelle: "Aucun pour le moment" },
        ],
        si: (v) => v.nationalite === "autre",
        obligatoire: (_c, v) => v.nationalite === "autre",
        aide: "Obligation de l'employeur : vérifier le titre avant l'embauche. Sans titre, voir « Puis-je employer une personne en situation irrégulière ? » dans l'aide.",
      },
      { cle: "titre_sejour_numero", libelle: "Numéro du titre", type: "texte", si: (v) => v.nationalite === "autre" && v.titre_sejour_type !== "aucun" },
      { cle: "titre_sejour_expiration", libelle: "Valable jusqu'au", type: "date", si: (v) => v.nationalite === "autre" && v.titre_sejour_type !== "aucun" },
      { cle: "adresse_salarie", colonne: "adresse_salarie", libelle: "Adresse", type: "texte", obligatoire: true, largeur: "entier" },
      { cle: "code_postal_salarie", colonne: "code_postal_salarie", libelle: "Code postal", type: "texte", obligatoire: true },
      { cle: "ville_salarie", colonne: "ville_salarie", libelle: "Ville", type: "texte", obligatoire: true },
      { cle: "telephone_salarie", libelle: "Téléphone", type: "telephone" },
      { cle: "email_salarie", libelle: "Email", type: "email" },
      {
        cle: "numero_securite_sociale",
        libelle: "Numéro de sécurité sociale",
        type: "texte",
        placeholder: "15 chiffres",
        aide: "Facultatif : il figure sur la carte Vitale ou une attestation de droits. Il sert aux déclarations du salaire.",
      },
    ],
  },
  {
    cle: "emploi",
    titre: "L'emploi",
    champs: [
      {
        cle: "emploi_repere",
        libelle: "Intitulé de l'emploi (convention collective)",
        type: "texte",
        defaut: (c) => EMPLOIS_REPERES[c.type_gestion].emploi,
        aide: "Proposé selon l'emploi choisi : Aide & Garde le vérifie avec vous.",
      },
      { cle: "nombre_enfants", libelle: "Nombre d'enfants gardés", type: "nombre", emplois: ["garde_enfants"], obligatoire: true },
      { cle: "ages_enfants", libelle: "Âge des enfants", type: "texte", placeholder: "ex. 2 et 5 ans", emplois: ["garde_enfants"] },
      {
        cle: "garde_partagee",
        libelle: "Garde partagée avec une autre famille ?",
        type: "oui_non",
        emplois: ["garde_enfants"],
        obligatoire: true,
      },
      {
        cle: "famille_partenaire",
        libelle: "Nom et coordonnées de l'autre famille",
        type: "textarea",
        si: (v) => oui(v, "garde_partagee"),
        obligatoire: (_c, v) => oui(v, "garde_partagee"),
        largeur: "entier",
      },
      {
        cle: "personne_aidee",
        libelle: "Personne aidée (si ce n'est pas vous)",
        type: "texte",
        emplois: ["aide_domicile"],
      },
      {
        cle: "taches",
        libelle: "Principales tâches",
        type: "textarea",
        placeholder: "ex. sortie d'école, goûter, devoirs, bain",
        largeur: "entier",
      },
      {
        cle: "lieu_travail_autre",
        libelle: "Le travail se fait-il ailleurs qu'à votre domicile ?",
        type: "oui_non",
      },
      {
        cle: "lieu_travail_adresse",
        libelle: "Adresse du lieu de travail",
        type: "texte",
        si: (v) => oui(v, "lieu_travail_autre"),
        obligatoire: (_c, v) => oui(v, "lieu_travail_autre"),
        largeur: "entier",
      },
    ],
  },
  {
    cle: "contrat",
    titre: "Le contrat",
    champs: [
      {
        cle: "motif_cdd",
        libelle: "Motif du CDD",
        type: "choix",
        options: [
          { valeur: "remplacement", libelle: "Remplacement d'un salarié absent" },
          { valeur: "accroissement", libelle: "Besoin temporaire (vacances, période chargée…)" },
          { valeur: "saisonnier", libelle: "Emploi saisonnier" },
          { valeur: "autre", libelle: "Autre (à préciser)" },
        ],
        si: (_v, c) => c.type_contrat === "CDD" && !c.remplacement,
        obligatoire: (c) => c.type_contrat === "CDD" && !c.remplacement,
        aide: "Un CDD n'est possible que pour un motif précis.",
      },
      {
        cle: "periode_essai",
        libelle: "Période d'essai",
        type: "choix",
        options: [
          { valeur: "convention", libelle: "Durée prévue par la convention collective" },
          { valeur: "aucune", libelle: "Pas de période d'essai" },
        ],
        defaut: () => "convention",
      },
    ],
  },
  {
    cle: "horaires",
    titre: "Les horaires",
    champs: [
      {
        cle: "repartition",
        libelle: "Jours et horaires habituels",
        type: "textarea",
        placeholder: "ex. lundi, mardi, jeudi, vendredi de 16 h 30 à 19 h 30",
        obligatoire: true,
        largeur: "entier",
      },
      {
        cle: "jour_repos",
        libelle: "Jour de repos de la semaine",
        type: "choix",
        options: ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"].map((j) => ({ valeur: j, libelle: j.charAt(0).toUpperCase() + j.slice(1) })),
        defaut: () => "dimanche",
        obligatoire: true,
      },
      {
        cle: "presence_responsable",
        libelle: "Heures de présence responsable ?",
        type: "oui_non",
        aide: "Temps où le salarié reste disponible sans travailler effectivement (ex. pendant la sieste des enfants).",
      },
      {
        cle: "heures_presence_responsable",
        libelle: "Heures de présence responsable par semaine",
        type: "nombre",
        si: (v) => oui(v, "presence_responsable"),
        obligatoire: (_c, v) => oui(v, "presence_responsable"),
      },
      { cle: "presence_nuit", libelle: "Présence de nuit ?", type: "oui_non" },
      {
        cle: "nuits_par_semaine",
        libelle: "Nombre de nuits par semaine",
        type: "nombre",
        si: (v) => oui(v, "presence_nuit"),
        obligatoire: (_c, v) => oui(v, "presence_nuit"),
      },
    ],
  },
  {
    cle: "remuneration",
    titre: "La rémunération",
    champs: [
      {
        cle: "conges_payes",
        libelle: "Congés payés",
        type: "choix",
        options: [
          { valeur: "pendant", libelle: "Payés au moment où le salarié les prend" },
          { valeur: "dix_pour_cent", libelle: "10 % ajoutés à chaque salaire (emploi occasionnel)" },
        ],
        obligatoire: true,
      },
      {
        cle: "mode_paiement",
        libelle: "Mode de paiement du salaire",
        type: "choix",
        options: [
          { valeur: "virement", libelle: "Virement" },
          { valeur: "cheque", libelle: "Chèque" },
          { valeur: "cesu", libelle: "Chèques CESU préfinancés" },
          { valeur: "autre", libelle: "Autre" },
        ],
      },
      {
        cle: "transport",
        libelle: "Le salarié vient en transports en commun ?",
        type: "oui_non",
        aide: "Vous lui remboursez alors la moitié de son abonnement.",
      },
      { cle: "repas", libelle: "Des repas sont fournis ?", type: "oui_non" },
      {
        cle: "repas_par_semaine",
        libelle: "Nombre de repas par semaine",
        type: "nombre",
        si: (v) => oui(v, "repas"),
      },
      { cle: "logement", libelle: "Le salarié est logé ?", type: "oui_non" },
      {
        cle: "vehicule",
        libelle: "Il utilise son véhicule pour vos besoins ?",
        type: "oui_non",
        aide: "Par exemple pour conduire les enfants : des indemnités kilométriques sont dues.",
      },
    ],
  },
  {
    cle: "employeur",
    titre: "Vos déclarations",
    intro: "Vos comptes Urssaf servent à déclarer le salaire en votre nom.",
    champs: [
      {
        cle: "numero_declarant",
        libelle: "Votre numéro Pajemploi ou CESU",
        type: "texte",
        aide: "Pajemploi pour la garde d'un enfant de moins de 6 ans, CESU sinon. Pas encore de compte ? Laissez vide : nous vous indiquons comment l'ouvrir.",
      },
    ],
  },
];

export function optionsDe(champ: ChampContrat, c: ContexteChamps) {
  return typeof champ.options === "function" ? champ.options(c) : (champ.options ?? []);
}

/** Le champ concerne-t-il cette gestion (emploi) et est-il affiché ? */
export function champVisible(champ: ChampContrat, v: Valeurs, c: ContexteChamps): boolean {
  if (champ.emplois && !champ.emplois.includes(c.type_gestion)) return false;
  return champ.si ? champ.si(v, c) : true;
}

export function champObligatoire(champ: ChampContrat, v: Valeurs, c: ContexteChamps): boolean {
  if (!champVisible(champ, v, c)) return false;
  return typeof champ.obligatoire === "function" ? champ.obligatoire(c, v) : Boolean(champ.obligatoire);
}

export const TOUS_LES_CHAMPS: ChampContrat[] = RUBRIQUES.flatMap((r) => r.champs);

/** Libellés des champs obligatoires restant à remplir. */
export function champsManquants(v: Valeurs, c: ContexteChamps): string[] {
  return TOUS_LES_CHAMPS.filter((ch) => champObligatoire(ch, v, c) && !(v[ch.cle] ?? "").trim()).map((ch) =>
    ch.libelle.replace(/ \?$/, "").toLowerCase(),
  );
}

/**
 * Valeurs à enregistrer : seulement les champs connus et affichés, nettoyés.
 * Les champs rangés dans une colonne sont renvoyés à part.
 */
export function nettoyerValeurs(
  brut: Valeurs,
  c: ContexteChamps,
): { config: Valeurs; colonnes: Partial<Record<NonNullable<ChampContrat["colonne"]>, string>> } {
  const config: Valeurs = {};
  const colonnes: Partial<Record<NonNullable<ChampContrat["colonne"]>, string>> = {};
  for (const ch of TOUS_LES_CHAMPS) {
    const val = String(brut[ch.cle] ?? "").trim().slice(0, ch.type === "textarea" ? 2000 : 200);
    if (!champVisible(ch, brut, c)) continue;
    if (ch.type === "choix" && val && !optionsDe(ch, c).some((o) => o.valeur === val)) continue;
    if (ch.type === "oui_non" && val && val !== "oui" && val !== "non") continue;
    if (ch.type === "date" && val && !/^\d{4}-\d{2}-\d{2}$/.test(val)) continue;
    if (ch.colonne) colonnes[ch.colonne] = val;
    else if (val) config[ch.cle] = val;
  }
  return { config, colonnes };
}
