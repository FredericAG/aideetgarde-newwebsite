"""Régénère la page de recette interactive à partir de docs/recette-briques-1-2.md.

Usage (depuis la racine du dépôt) :
  python3 outils/recette-interactive/generer.py
Produit outils/recette-interactive/recette-aide-et-garde.html, à republier sur
l'Artifact https://claude.ai/artifact/AoiGVx7CEdjRSCv7feVHLQ (même adresse).
Les coches sont dans la base de l'Artifact (collection « recette », clé
« <section>~<numéro> ») : elles survivent aux republications tant que le titre
de la section et le numéro du scénario ne changent pas.
"""
import json, pathlib, subprocess, sys
ici = pathlib.Path(__file__).parent
racine = ici.parent.parent
subprocess.run([sys.executable, str(ici / "extraire.py"), str(racine / "docs/recette-briques-1-2.md"),
                str(ici / "scenarios.json"), str(ici / "initiaux.json")], check=True)
g = (ici / "gabarit.html").read_text(encoding="utf-8")
d = (ici / "scenarios.json").read_text(encoding="utf-8").replace("</", "<\\/")
(ici / "recette-aide-et-garde.html").write_text(g.replace("__DONNEES__", d), encoding="utf-8")
