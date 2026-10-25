"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfileAction, type UpdateProfileState } from "./actions";
import type { ComplementProfil, UserProfile } from "@/lib/user-profile";
import { SaisieAdresse, type ValeurAdresse } from "@/components/SaisieAdresse";

const inputClass =
  "w-full rounded-md border border-brand-gray/40 bg-background px-3 py-2 text-base outline-none focus:border-brand-teal sm:text-sm";

const initialState: UpdateProfileState = { status: "idle" };

/**
 * Profil de l'abonné. Sert dans « Mon compte » et, avant la première
 * gestion, pour compléter une seule fois ce qui manque (`exiger`) : la
 * civilité, la date de naissance et l'adresse préremplissent ensuite les
 * contrats, courriers et déclarations.
 */
export function ProfileForm({
  profile,
  complement,
  exiger = false,
  libelleBouton = "Enregistrer",
}: {
  profile: UserProfile;
  complement: ComplementProfil;
  exiger?: boolean;
  libelleBouton?: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);
  const [adresse, setAdresse] = useState<ValeurAdresse>({
    adresse: profile.adresse,
    code_postal: profile.code_postal,
    ville: profile.ville,
  });
  const majAdresse = useCallback((v: ValeurAdresse) => setAdresse(v), []);

  // Profil complété avant une gestion : la page affiche alors le formulaire.
  useEffect(() => {
    if (exiger && state.status === "success") router.refresh();
  }, [exiger, state, router]);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      {complement.disponible && (
        <fieldset className="flex flex-col gap-1 text-sm font-medium">
          <legend className="mb-1">Civilité</legend>
          <div className="flex gap-2">
            {(["Madame", "Monsieur"] as const).map((c) => (
              <label
                key={c}
                className="flex cursor-pointer items-center gap-2 rounded-full border border-brand-gray/40 px-4 py-2 font-normal has-[:checked]:border-brand-teal has-[:checked]:bg-brand-teal has-[:checked]:text-white"
              >
                <input
                  type="radio"
                  name="civilite"
                  value={c}
                  defaultChecked={complement.civilite === c}
                  required={exiger}
                  className="sr-only"
                />
                {c}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Prénom">
          <input type="text" name="prenom" required autoComplete="given-name" defaultValue={profile.prenom} className={inputClass} />
        </Field>
        <Field label="Nom">
          <input type="text" name="nom" required autoComplete="family-name" defaultValue={profile.nom} className={inputClass} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {complement.disponible && (
          <Field label="Date de naissance">
            <input
              type="date"
              name="date_naissance"
              required={exiger}
              autoComplete="bday"
              defaultValue={complement.date_naissance}
              className={inputClass}
            />
          </Field>
        )}
        <Field label="Téléphone">
          <input type="tel" name="telephone" required={exiger} autoComplete="tel" defaultValue={profile.telephone} className={inputClass} />
        </Field>
      </div>

      <SaisieAdresse
        valeur={adresse}
        onChange={majAdresse}
        noms={{ adresse: "adresse", code_postal: "code_postal", ville: "ville" }}
        classeChamp={inputClass}
        classeGrille="grid grid-cols-[1fr_1.6fr] gap-4 [&>*:first-child]:col-span-2"
      />

      {complement.disponible && !exiger && (
        <p className="text-xs text-foreground/60">
          Votre civilité, votre date de naissance et votre adresse servent uniquement à préparer vos contrats, courriers et
          déclarations : vous n&apos;aurez plus à les saisir.
        </p>
      )}

      {state.message && (
        <p aria-live="polite" className={`text-sm ${state.status === "error" ? "text-red-600" : "text-brand-teal"}`}>
          {state.message}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primaire mt-2 self-start">
        {pending ? "Enregistrement…" : libelleBouton}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}
