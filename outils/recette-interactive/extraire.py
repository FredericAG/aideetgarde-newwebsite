"""Extrait les scénarios de docs/recette-briques-1-2.md en JSON pour la page de recette."""
import json, re, sys, unicodedata

def slug(t, n=28):
    t = unicodedata.normalize("NFD", t).encode("ascii", "ignore").decode().lower()
    t = re.sub(r"[^a-z0-9]+", "-", t).strip("-")
    return t[:n].rstrip("-")

src = open(sys.argv[1], encoding="utf-8").read()
sections, cur = [], None
for line in src.split("\n"):
    if line.startswith("## "):
        cur = {"titre": line[3:].strip(), "prep": "", "entetes": None, "lignes": []}
        sections.append(cur)
        continue
    if cur is None:
        continue
    if line.startswith("|"):
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if all(re.fullmatch(r":?-+:?", c) for c in cells):
            continue
        if cur["entetes"] is None:
            cur["entetes"] = cells
        else:
            cur["lignes"].append(cells)
    elif line.startswith("**Préparation**"):
        cur["prep"] = line.replace("**Préparation** :", "").replace("**Préparation**", "").strip()

out, initiaux, cles = [], {}, set()
for sec in sections:
    h = sec["entetes"]
    if not h or h[0] != "#":
        continue
    code = slug(sec["titre"])
    ancien = len(h) == 5
    sc = []
    for l in sec["lignes"]:
        if len(l) < 4:
            continue
        cle = f"{code}~{l[0]}"
        assert cle not in cles, cle
        cles.add(cle)
        statut = l[-1]
        sc.append({"cle": cle, "num": l[0], "scenario": l[1], "ancien": l[2] if ancien else "", "attendu": l[-2]})
        if statut.upper().startswith("OK"):
            initiaux[cle] = statut
    out.append({"titre": sec["titre"], "prep": sec["prep"], "scenarios": sc})
json.dump({"sections": out}, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False)
json.dump(initiaux, open(sys.argv[3], "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(len(out), sum(len(s["scenarios"]) for s in out), len(initiaux))
