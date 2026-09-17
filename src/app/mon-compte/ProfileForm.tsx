"use client";

import { useActionState } from "react";
import { updateProfileAction, type UpdateProfileState } from "./actions";
import type { UserProfile } from "@/lib/user-profile";

const inputClass =
  "w-full rounded-md border border-brand-gray/40 bg-background px-3 py-2 text-sm outline-none focus:border-brand-teal";

const initialState: UpdateProfileState = { status: "idle" };

export function ProfileForm({ profile }: { profile: UserProfile }) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Prénom">
          <input
            type="text"
            name="prenom"
            required
            autoComplete="given-name"
            defaultValue={profile.prenom}
            className={inputClass}
          />
        </Field>
        <Field label="Nom">
          <input
            type="text"
            name="nom"
            required
            autoComplete="family-name"
            defaultValue={profile.nom}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Téléphone">
        <input
          type="tel"
          name="telephone"
          autoComplete="tel"
          defaultValue={profile.telephone}
          className={inputClass}
        />
      </Field>

      <Field label="Adresse">
        <input
          type="text"
          name="adresse"
          autoComplete="street-address"
          defaultValue={profile.adresse}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Code postal">
          <input
            type="text"
            name="code_postal"
            autoComplete="postal-code"
            defaultValue={profile.code_postal}
            className={inputClass}
          />
        </Field>
        <Field label="Ville">
          <input
            type="text"
            name="ville"
            autoComplete="address-level2"
            defaultValue={profile.ville}
            className={inputClass}
          />
        </Field>
      </div>

      {state.message && (
        <p
          aria-live="polite"
          className={`text-sm ${
            state.status === "error" ? "text-red-600" : "text-brand-teal"
          }`}
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 self-start rounded-md bg-brand-violet px-4 py-2 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}
