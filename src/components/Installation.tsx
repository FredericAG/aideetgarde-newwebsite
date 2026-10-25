"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  GUIDES,
  detecterAppareil,
  estInstallee,
  type Appareil,
  type EtapeInstallation,
  type InviteInstallation,
} from "@/lib/installation";

// --- Invite d'installation d'Android (Chrome, Edge) ------------------------------
let invite: InviteInstallation | null = null;
const abonnes = new Set<() => void>();
const prevenir = () => abonnes.forEach((f) => f());
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    invite = e as InviteInstallation;
    prevenir();
  });
  window.addEventListener("appinstalled", () => {
    invite = null;
    prevenir();
  });
}
function useInvite(): InviteInstallation | null {
  return useSyncExternalStore(
    (f) => {
      abonnes.add(f);
      return () => abonnes.delete(f);
    },
    () => invite,
    () => null,
  );
}

/** Appareil détecté après affichage (null côté serveur). */
function useAppareil(): { appareil: Appareil; installee: boolean } | null {
  const [v, setV] = useState<{ appareil: Appareil; installee: boolean } | null>(null);
  useEffect(() => {
    // Lecture du navigateur, impossible côté serveur : faite une fois après
    // l'affichage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setV({ appareil: detecterAppareil(), installee: estInstallee() });
  }, []);
  return v;
}

const trait = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function Pictogramme({ icone }: { icone: EtapeInstallation["icone"] }) {
  const commun = "h-9 w-9 shrink-0 rounded-lg border-2 border-brand-teal/30 bg-white p-1.5 text-brand-teal";
  switch (icone) {
    case "partage":
      return (
        <svg viewBox="0 0 24 24" {...trait} className={commun} aria-hidden="true">
          <path d="M12 3v12M8 7l4-4 4 4" />
          <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
        </svg>
      );
    case "trois-points":
      return (
        <svg viewBox="0 0 24 24" className={commun} aria-hidden="true">
          <circle cx="12" cy="5" r="2" fill="currentColor" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
          <circle cx="12" cy="19" r="2" fill="currentColor" />
        </svg>
      );
    case "menu-samsung":
      return (
        <svg viewBox="0 0 24 24" {...trait} className={commun} aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );
    case "plus":
      return (
        <svg viewBox="0 0 24 24" {...trait} className={commun} aria-hidden="true">
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
    default:
      return <span className="h-9 w-9 shrink-0" aria-hidden="true" />;
  }
}

/** Étapes d'installation pour un appareil, en grand. */
function Etapes({ appareil }: { appareil: Appareil }) {
  const g = GUIDES[appareil];
  return (
    <div>
      <h2 className="font-bold text-brand-teal">{g.titre}</h2>
      <ol className="mt-3 flex flex-col gap-3">
        {g.etapes.map((e, i) => (
          <li key={i} className="flex items-start gap-3 rounded-xl bg-white p-3 text-base leading-snug shadow-sm">
            <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-violet text-base font-bold text-white">
              {i + 1}
            </span>
            <span className="flex-1">{e.texte}</span>
            <Pictogramme icone={e.icone} />
          </li>
        ))}
      </ol>
      {g.sinon && <p className="mt-3 text-sm text-foreground/70">{g.sinon}</p>}
    </div>
  );
}

/**
 * Page « Installer l'application » : les étapes du téléphone utilisé, en
 * grand ; sur Android avec Chrome ou Edge, un seul bouton suffit (invite
 * d'installation du téléphone). Les autres téléphones restent consultables
 * (« Vous aidez quelqu'un ? »).
 */
export function GuideInstallationComplet() {
  const detecte = useAppareil();
  const inv = useInvite();
  const [autre, setAutre] = useState<Appareil | null>(null);
  const [installee, setInstallee] = useState(false);

  if (!detecte) return <p className="mt-6 text-foreground/60">Chargement…</p>;
  const appareil = autre ?? detecte.appareil;

  return (
    <div className="mt-6 flex flex-col gap-6">
      {(detecte.installee || installee) && (
        <p role="status" className="rounded-xl border-2 border-brand-teal bg-brand-teal/10 p-4 text-base font-bold text-brand-teal">
          ✓ C&apos;est fait : Aide &amp; Garde est installée sur ce téléphone.
        </p>
      )}

      {inv && !autre && !installee && (
        <div className="rounded-xl border-2 border-brand-violet bg-brand-violet/5 p-4">
          <p className="text-base">Votre téléphone sait installer Aide &amp; Garde en un geste :</p>
          <button
            type="button"
            onClick={async () => {
              await inv.prompt();
              const choix = await inv.userChoice;
              if (choix.outcome === "accepted") setInstallee(true);
            }}
            className="btn btn-primaire btn-lg mt-3 w-full text-lg"
          >
            Installer Aide &amp; Garde
          </button>
          <p className="mt-2 text-sm text-foreground/70">Puis touchez « Installer » dans la fenêtre qui s&apos;ouvre.</p>
        </div>
      )}

      <div className="rounded-xl bg-brand-sky-tint/30 p-4">
        <Etapes appareil={appareil} />
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer font-medium text-brand-teal">
          Vous aidez quelqu&apos;un, ou ce n&apos;est pas le bon téléphone ?
        </summary>
        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(GUIDES) as Appareil[]).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAutre(a)}
              className={`btn btn-sm ${appareil === a ? "btn-primaire" : "btn-secondaire"}`}
            >
              {GUIDES[a].titre.replace(/^Sur /, "").replace(/^t/, "T")}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}

const CLE_PLUS_TARD = "ag-installation-plus-tard";

/**
 * Carte « Installez Aide & Garde sur votre téléphone » du tableau de bord :
 * téléphone uniquement, tant que l'espace n'est pas installé. « Plus tard »
 * la masque 30 jours sur cet appareil.
 */
export function CarteInstallation() {
  const detecte = useAppareil();
  const inv = useInvite();
  const [masquee, setMasquee] = useState(true);

  useEffect(() => {
    let plusTard = 0;
    try {
      plusTard = Number(localStorage.getItem(CLE_PLUS_TARD) ?? 0);
    } catch {
      /* stockage indisponible : la carte s'affiche */
    }
    // Préférence lue dans le navigateur après l'affichage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMasquee(Date.now() - plusTard < 30 * 86400000);
  }, []);

  if (!detecte || detecte.installee || detecte.appareil === "ordinateur" || masquee) return null;

  return (
    <section
      aria-label="Installer l'application"
      className="mt-6 flex flex-col gap-3 rounded-xl border-2 border-brand-violet/40 bg-brand-violet/5 p-4"
    >
      <p className="text-base">
        <strong className="text-brand-violet">Installez Aide &amp; Garde sur votre téléphone</strong> : une icône sur
        l&apos;écran d&apos;accueil, comme une application, pour retrouver vos bulletins en un geste.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {inv ? (
          <button
            type="button"
            onClick={async () => {
              await inv.prompt();
              await inv.userChoice;
            }}
            className="btn btn-primaire"
          >
            Installer
          </button>
        ) : (
          <Link href="/installer" className="btn btn-primaire">
            Comment faire ?
          </Link>
        )}
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem(CLE_PLUS_TARD, String(Date.now()));
            } catch {
              /* rien */
            }
            setMasquee(true);
          }}
          className="text-sm font-medium text-brand-teal underline"
        >
          Plus tard
        </button>
      </div>
    </section>
  );
}
