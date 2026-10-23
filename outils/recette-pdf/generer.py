"""
PDF de test pour la recette de la brique 4 (dépôt en masse), sur les
gestions fictives de donnees_recette_fictives.sql.

1. Dans Supabase > SQL Editor, exécuter outils/recette-pdf/gestions_de_test.sql
   et copier la ligne obtenue (4 références séparées par des virgules).
2. python3 outils/recette-pdf/generer.py AG00012,AG00013,AG00020,AG00015
   → dossier recette/brique4/ (non publié : ignoré par git).

Documents entièrement fictifs. Chaque fichier indique le scénario de recette
qu'il sert (M.x) ; voir recette/brique4/LISEZMOI.txt.
"""
import shutil
import sys
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

RACINE = Path(__file__).resolve().parents[2] / "recette" / "brique4"
GESTIONS = [  # ordre de gestions_de_test.sql
    ("PETIT", "FERNANDES", "Mariama FERNANDES, en cours"),
    ("PETIT", "SILVA", "Bintou SILVA, en cours"),
    ("DURAND", "MOREAU", "Sabrina MOREAU, en cours"),
    ("PETIT", "BENALI", "Astrid BENALI, gestion terminée"),
]


def pdf(chemin: Path, titre: str, lignes: list[str]):
    chemin.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(chemin), pagesize=A4)
    c.setTitle(titre)
    l, h = A4
    c.setFillColor(HexColor("#f6ed78"))
    c.rect(0, h - 12 * mm, l, 12 * mm, stroke=0, fill=1)
    c.setFillColor(HexColor("#b00020"))
    c.setFont("Helvetica-Bold", 13)
    c.drawString(18 * mm, h - 8 * mm, "DOCUMENT DE TEST — FICTIF — AUCUNE VALEUR")
    c.setFillColor(HexColor("#376873"))
    c.setFont("Helvetica-Bold", 20)
    c.drawString(18 * mm, h - 35 * mm, titre)
    c.setFillColor(HexColor("#1c2e3e"))
    c.setFont("Helvetica", 11)
    y = h - 50 * mm
    for ligne in lignes:
        c.drawString(18 * mm, y, ligne)
        y -= 7 * mm
    c.showPage()
    c.save()


def main():
    if len(sys.argv) != 2 or len(sys.argv[1].split(",")) != 4:
        sys.exit(__doc__)
    refs = [r.strip().upper() for r in sys.argv[1].split(",")]
    if RACINE.exists():
        shutil.rmtree(RACINE)
    lot = RACINE / "1-lot-principal"
    (A, B, C, T) = [(refs[i], *GESTIONS[i]) for i in range(4)]
    nom = lambda g, code, per, prec="": f"{g[0]}_{g[1]}_{g[2]}_{code}_{per}{'_' + prec if prec else ''}.pdf"
    fichiers = [
        # (dossier, nom, titre, scénario)
        (lot, nom(A, "BP", "2610"), "Bulletin de paie octobre 2026", "M.2 / M.6 / M.7 : prêt (2 documents pour PETIT)"),
        (lot, nom(B, "BP", "2610"), "Bulletin de paie octobre 2026", "M.2 / M.7 : prêt, même employeur que le précédent"),
        (lot, nom(C, "BP", "2610"), "Bulletin de paie octobre 2026", "M.2 : prêt, autre employeur"),
        (lot, nom(A, "LIC", "2610", "CONVOCATION"), "Procédure de licenciement : convocation", "Précision facultative lue : « CONVOCATION »"),
        (lot, nom(A, "AV", "2610"), "Avenant", "Autre type de document : avenant"),
        (lot, f"{A[0]}_{A[1]}_DUPUIS_BP_2610.pdf", "Bulletin de paie octobre 2026", "M.4 : « Noms à vérifier » (salarié DUPUIS au lieu de FERNANDES)"),
        (lot, nom(T, "BP", "2610"), "Bulletin de paie octobre 2026", "Gestion terminée : signalée, non déposée d'office"),
        (lot, f"AG99999_{A[1]}_{A[2]}_BP_2610.pdf", "Bulletin de paie octobre 2026", "M.3 : « Référence inconnue »"),
        (lot, "bulletin octobre Mariama.pdf", "Bulletin de paie octobre 2026", "M.3 : « Nom non reconnu »"),
        (lot, f"{A[0]}_{A[1]}_{A[2]}_BP_2613.pdf", "Bulletin de paie", "M.3 : période invalide (mois 13)"),
        (lot / "sous-dossier", nom(A, "BP", "2610"), "Bulletin de paie octobre 2026 (copie)", "M.5 : « En double dans le lot » (glisser le dossier entier)"),
        (RACINE / "2-version-corrigee", nom(A, "BP", "2610"), "Bulletin de paie octobre 2026 — VERSION CORRIGÉE", "M.9 : existe déjà → « Remplacer »"),
    ]
    for dossier, n, titre, scenario in fichiers:
        pdf(dossier / n, titre, [f"Fichier : {n}", f"Scénario : {scenario}", "Gestions fictives : donnees_recette_fictives.sql"])
    (lot / "notes de test.txt").write_text("Fichier texte : doit être ignoré (« 1 fichier non PDF ignoré »).\n", encoding="utf-8")
    # M.8 : redéposer à l'identique le premier fichier
    (RACINE / "3-identique").mkdir(parents=True, exist_ok=True)
    shutil.copy(lot / nom(A, "BP", "2610"), RACINE / "3-identique" / nom(A, "BP", "2610"))

    lisezmoi = [
        "PDF DE TEST — BRIQUE 4 (DÉPÔT EN MASSE) — documents fictifs",
        "",
        "Gestions utilisées (données de recette fictives) :",
        *[f"  {refs[i]} = {GESTIONS[i][0]} / {GESTIONS[i][2]}" for i in range(4)],
        "",
        "Étape 1 : Administration > Dépôt, glisser le dossier « 1-lot-principal » entier.",
        "  Attendu : 5 prêts (dont 4 pour PETIT : un seul email et une seule notification, M.7), 1 « Noms à vérifier », 1 gestion terminée,",
        "  1 référence inconnue, 2 noms non reconnus (nom libre, mois 13), 1 « En double dans le lot »,",
        "  1 fichier non PDF ignoré. Cocher « Prévenir les abonnés », déposer.",
        "Étape 2 : glisser « 3-identique » : « Déjà en ligne à l'identique », ignoré (M.8).",
        "Étape 3 : glisser « 2-version-corrigee » : « Existe déjà » ; « Remplacer » puis déposer (M.9).",
        "",
        "Détail par fichier :",
        *[f"  {d.relative_to(RACINE)}/{n} : {s}" for d, n, _, s in fichiers],
        "  1-lot-principal/notes de test.txt : M.3 fichier non PDF",
    ]
    (RACINE / "LISEZMOI.txt").write_text("\n".join(lisezmoi) + "\n", encoding="utf-8")
    print(f"Écrit : {RACINE}")


if __name__ == "__main__":
    main()
