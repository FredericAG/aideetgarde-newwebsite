"""Génère supabase/donnees_recette_fictives.sql : ~100 comptes fictifs couvrant
tous les cas de l'administration. Déterministe (graine fixe)."""
import random, uuid, sys
from datetime import date, timedelta

random.seed(2026)
SORTIE = sys.argv[1]

PRENOMS_EMP = ["Camille","Julie","Claire","Émilie","Aurélie","Nathalie","Céline","Hélène","Sarah","Laure",
    "Pauline","Anne","Marion","Charlotte","Élodie","Delphine","Agnès","Juliette","Raphaëlle","Inès",
    "Thomas","Nicolas","Julien","Antoine","Guillaume","Olivier","Mathieu","François","Pierre","Benoît",
    "Vincent","Romain","Sébastien","Arnaud","Maxime","David","Jérôme","Philippe","Rémi","Hugo"]
NOMS_EMP = ["Lemaire","Fontaine","Rousseau","Vincent","Muller","Lefebvre","Faure","André","Mercier","Blanc",
    "Guerin","Boyer","Garnier","Chevalier","François","Legrand","Gauthier","Garcia","Perrin","Robin",
    "Clément","Morin","Nicolas","Henry","Roussel","Mathieu","Gautier","Masson","Marchand","Duval",
    "Denis","Dumont","Marie","Lemoine","Noël","Meyer","Dufour","Meunier","Brun","Blanchard",
    "Giraud","Joly","Rivière","Lucas","Brunet","Gaillard","Barbier","Arnaud","Martinez","Gérard",
    "Roche","Renard","Schmitt","Roy","Leroux","Colin","Vidal","Caron","Picard","Roger",
    "Fabre","Aubert","Lemoine","Renaud","Dumas","Lacroix","Olivier","Philippe","Bourgeois","Pierre",
    "Benoît","Rey","Leclerc","Payet","Rolland","Leclercq","Guillaume","Lecomte","Lopez","Jean",
    "Dupuy","Guillot","Hubert","Berger","Carpentier","Sanchez","Dupuis","Moulin","Louis","Deschamps"]
PRENOMS_SAL = ["Monique","Naseem","Felana","Ana Liza","Manon","Mirina","Clémence","Fatima","Natalia","Astrid",
    "Léontine","Tessa","José","Djamila","Aïda","Lucette","Saïda","Régine","Kimberley","Jenny",
    "Amina","Pélagie","Joëlle","Frances","Yadi","Mariama","Ioana","Rosa","Leïla","Bintou",
    "Svetlana","Grace","Aminata","Lucia","Chantal","Nadia","Océane","Sabrina","Esther","Yasmina"]
NOMS_SAL = ["Diatta","Akbar","Rabeharimanana","Sicat","Darmaun","Ouyed","Clety","El Asri","Butco","Garcia Ramos",
    "Guipro","Blanchard","Dungca","Zerioul","Esponela","Keever","Abou-Nit","Casilla","Locko","Tefit",
    "M'barki","Kouadjo","Davy Kablan","Somera","Pinzon","Traoré","Popescu","Fernandes","Benali","Koné",
    "Ivanova","Mensah","Diallo","Silva","Lemercier","Haddad","Moreau","Toure","Ndiaye","Belkacem"]
VILLES = [("75011","Paris"),("75015","Paris"),("75017","Paris"),("75016","Paris"),("75012","Paris"),("75020","Paris"),
    ("92100","Boulogne-Billancourt"),("92200","Neuilly-sur-Seine"),("94300","Vincennes"),("92300","Levallois-Perret"),
    ("92130","Issy-les-Moulineaux"),("78000","Versailles"),("93100","Montreuil"),("94160","Saint-Mandé"),("92190","Meudon")]
TYPES = ["garde_enfants"]*6 + ["employe_maison"]*3 + ["aide_domicile"]*2
TARIF = {1: 12.90, 2: 19.35, 3: 25.80, 4: 25.80}
MOIS = ["2607", "2608", "2609"]  # bulletins déjà établis
COURANT = "2610"

def q(s):
    return "'" + str(s).replace("'", "''") + "'"

def d(x):
    return f"'{x.isoformat()}'"

def sans_accent(t):
    import unicodedata
    return "".join(c for c in unicodedata.normalize("NFD", t) if unicodedata.category(c) != "Mn")

def email(prenom, nom, n):
    base = sans_accent(f"{prenom}.{nom}").lower().replace(" ", "-").replace("'", "")
    return f"{base}.{n}@recette.invalid"

AUJ = date(2026, 10, 21)
uid = lambda: str(uuid.UUID(int=random.getrandbits(128), version=4))

comptes = []   # dicts
noms_utilises = {}

def nouveau(prenom=None, nom=None, inscr=None):
    prenom = prenom or random.choice(PRENOMS_EMP)
    nom = nom or random.choice(NOMS_EMP)
    n = len(comptes) + 1
    cp, ville = random.choice(VILLES)
    c = dict(id=uid(), prenom=prenom, nom=nom, email=email(prenom, nom, n), cp=cp, ville=ville,
             tel="06" + "".join(random.choice("0123456789") for _ in range(8)),
             inscr=inscr or (AUJ - timedelta(days=random.randint(30, 2400))),
             abos=[], gestions=[], avenants=[])
    comptes.append(c)
    return c

def salarie():
    return random.choice(PRENOMS_SAL), random.choice(NOMS_SAL)

def gestion(c, statut, debut=None, fin=None, **kw):
    p, n = kw.pop("sal", None) or salarie()
    g = dict(id=uid(), statut=statut, type=random.choice(TYPES), prenom=p, nom=n,
             debut=debut or max(c["inscr"], AUJ - timedelta(days=random.randint(60, 1500))),
             fin=fin, decls=[], docs=[], contrat=kw.pop("contrat", statut in ("envoyee", "en_cours")), **kw)
    c["gestions"].append(g)
    return g

def abo(c, statut="actif", quota=None, debut=None, fin=None):
    quota = quota or random.choice([1, 1, 1, 2, 2, 3, 4])
    c["abos"].append(dict(statut=statut, quota=quota, tarif=TARIF[quota],
                          debut=debut or c["inscr"], fin=fin))
    return quota

def historique(g, courant=None):
    """Bulletins des 3 derniers mois (déclarations traitées) + état du mois courant."""
    for m in MOIS:
        g["decls"].append(dict(periode=m, statut="traitee", heures=random.choice([None, 40, 52, 86.67, 120, 151.67])))
        g["docs"].append(dict(type="bulletin", periode=m, titre="Bulletin de salaire"))
    if courant == "declaration":
        g["decls"].append(dict(periode=COURANT, statut="envoyee", heures=random.choice([48, 60, 86.67, 130])))
    elif courant == "bulletin":
        g["decls"].append(dict(periode=COURANT, statut="traitee", heures=random.choice([None, 86.67])))
        g["docs"].append(dict(type="bulletin", periode=COURANT, titre="Bulletin de salaire"))
    elif courant == "modification":
        g["decls"][-1]["statut"] = "modification"
        g["decls"][-1]["motif"] = random.choice([
            "Il manque 4 heures le 12 septembre.",
            "Une journée de congé n'apparaît pas (le 23).",
            "Le taux horaire a changé au 1er septembre."])

# --- Homonymes : mêmes prénom et nom, situations différentes -------------
homonymes = [("Marie", "Martin", 3), ("Thomas", "Petit", 2), ("Sophie", "Durand", 2), ("Nicolas", "Bernard", 2)]

# --- A. Clients actifs (62) -------------------------------------------------
etats = (["declaration"] * 9 + ["bulletin"] * 20 + [None] * 25 + ["modification"] * 3)
random.shuffle(etats)
for i in range(62):
    if i < 4:   # homonymes actifs
        pr, no, _ = homonymes[i]
        c = nouveau(pr, no)
    else:
        c = nouveau()
    quota = abo(c)
    nb = random.randint(1, quota)
    for k in range(nb):
        g = gestion(c, "en_cours")
        historique(g, etats[(i + k) % len(etats)] if k == 0 else random.choice(["bulletin", None]))
    if random.random() < 0.35:
        gestion(c, "terminee", fin=AUJ - timedelta(days=random.randint(40, 600)))
    c["profil"] = "actif"

actifs = [c for c in comptes]
# Gestions envoyées à valider (dans le quota)
for c in random.sample([c for c in actifs if c["abos"][0]["quota"] > len([g for g in c["gestions"] if g["statut"] == "en_cours"])], 8):
    gestion(c, "envoyee", debut=AUJ + timedelta(days=random.randint(5, 30)), envoyee=True)
# Demandes d'avenant
for c in random.sample(actifs, 4):
    g = next(g for g in c["gestions"] if g["statut"] == "en_cours")
    c["avenants"].append(dict(gestion=g["id"], objets=random.choice([["garde_partagee"], ["organisation", "duree_travail"], ["taux_horaire"], ["adresse"]]),
                              effet=AUJ + timedelta(days=random.randint(10, 40)),
                              desc=random.choice(["Passage en garde partagée avec la famille voisine, 3 jours par semaine.",
                                                  "Nouveaux horaires : 8 h – 13 h du lundi au jeudi.",
                                                  "Augmentation du taux horaire à 13,50 € net.",
                                                  "Déménagement : nouvelle adresse du lieu de travail."])))
# Brouillons renvoyés à compléter / simples
for c in random.sample(actifs, 3):
    gestion(c, "brouillon", motif="Merci de préciser le type de contrat et le salaire horaire.", contrat=False)
for c in random.sample(actifs, 2):
    gestion(c, "brouillon", contrat=False)
# --- C. Quota dépassé (3) ---------------------------------------------------
for c in random.sample([c for c in actifs if c["abos"][0]["quota"] == 1], 3):
    g = gestion(c, "en_cours", depasse=True)
    historique(g, "bulletin")

# --- D. À surveiller : abonnement payé sans gestion (12) --------------------
for i in range(12):
    if i < 2:
        pr, no, _ = homonymes[[0, 2][i]]   # Marie Martin, Sophie Durand
        c = nouveau(pr, no)
    else:
        c = nouveau()
    abo(c, quota=random.choice([1, 1, 2]))
    if i % 3 == 0:
        gestion(c, "terminee", fin=AUJ - timedelta(days=random.randint(20, 200)))
    elif i % 3 == 1:
        gestion(c, "brouillon", contrat=False)
    else:
        c["inscr"] = AUJ - timedelta(days=random.randint(3, 25))
        c["abos"][0]["debut"] = c["inscr"]
    c["profil"] = "a_surveiller"

# --- E. Anciens clients, abonnement résilié (14) ----------------------------
for i in range(14):
    if i == 0:
        c = nouveau("Marie", "Martin")
    elif i == 1:
        c = nouveau("Thomas", "Petit")
    elif i == 2:
        c = nouveau("Nicolas", "Bernard")
    else:
        c = nouveau()
    debut = c["inscr"]
    fin = AUJ - timedelta(days=random.randint(30, 700))
    if fin <= debut:
        debut = fin - timedelta(days=200)
        c["inscr"] = debut
    abo(c, statut="resilie", debut=debut, fin=fin)
    for _ in range(random.randint(1, 2)):
        g = gestion(c, "terminee", debut=debut, fin=fin)
        for m in ["2401", "2402", "2403"]:
            g["docs"].append(dict(type="bulletin", periode=m, titre="Bulletin de salaire"))
        g["docs"].append(dict(type="certificat_travail", periode=None, titre="Certificat de travail"))
        g["docs"].append(dict(type="solde_tout_compte", periode=None, titre="Solde de tout compte"))
    c["profil"] = "inactif"

# --- F. Inscrits sans abonnement (prospects) (10) ---------------------------
for i in range(10):
    c = nouveau(inscr=AUJ - timedelta(days=random.randint(1, 120)))
    c["profil"] = "inactif"

# Contrats pour quelques gestions en cours
for c in comptes:
    for g in c["gestions"]:
        if g["statut"] == "en_cours" and random.random() < 0.6:
            g["contrat"] = True
        if g["statut"] == "en_cours":
            g["docs"].insert(0, dict(type="contrat", periode=g["debut"].strftime("%y%m"), titre="Contrat de travail"))

# --------------------------------------------------------------------------- SQL
L = []
w = L.append
w("""-- ============================================================================
-- DONNÉES DE RECETTE FICTIVES — environ 100 comptes inventés
--
-- À exécuter dans Supabase > SQL Editor, APRÈS tous les scripts brique*.
-- À SUPPRIMER avant la reprise réelle des clients : script
-- `donnees_recette_suppression.sql` (tous ces comptes ont une adresse en
-- @recette.invalid, domaine réservé qui ne reçoit jamais d'email).
--
-- Aucune donnée réelle : noms, adresses et salariés sont inventés.
-- Cas couverts : clients actifs (1 à 3 gestions), déclarations du mois à
-- traiter, demandes de modification de bulletin, gestions envoyées à
-- valider, demandes d'avenant, brouillons (dont renvoyés à compléter),
-- quota dépassé, abonnement payé sans gestion (à surveiller), anciens
-- clients résiliés, inscrits sans abonnement, homonymes (Marie MARTIN ×3,
-- Thomas PETIT ×2, Sophie DURAND ×2, Nicolas BERNARD ×2).
--
-- Connexion possible à n'importe quel compte de test (pour voir l'espace
-- abonné) avec son adresse @recette.invalid et le mot de passe : Recette2026!
-- Les emails de notification sont désactivés pour ces comptes.
-- Les documents sont des fiches « sans fichier » (aucun PDF réel).
-- ============================================================================

begin;

-- Garde-fou : ne pas charger deux fois.
do $$
begin
  if exists (select 1 from auth.users where email like '%@recette.invalid') then
    raise exception 'Les données de recette sont déjà chargées. Lancez d''abord donnees_recette_suppression.sql pour repartir de zéro.';
  end if;
end $$;
""")

w("-- 1. Comptes (auth + identités ; le profil est créé automatiquement)")
for c in comptes:
    meta = '{"prenom": %s, "nom": %s}' % (('"' + c["prenom"] + '"'), ('"' + c["nom"] + '"'))
    w(f"""insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', {q(c['id'])}, 'authenticated', 'authenticated', {q(c['email'])},
  extensions.crypt('Recette2026!', extensions.gen_salt('bf')), {d(c['inscr'])},
  '{{"provider": "email", "providers": ["email"]}}', {q(meta)}, {d(c['inscr'])}, {d(c['inscr'])}, '', '', '', '');""")
    w(f"""insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
values (gen_random_uuid(), {q(c['id'])}, {q(c['id'])}, jsonb_build_object('sub', {q(c['id'])}, 'email', {q(c['email'])}, 'email_verified', true), 'email', {d(c['inscr'])}, {d(c['inscr'])});""")
w("")
w("-- 2. Profils : coordonnées, date d'inscription, emails de notification coupés")
for c in comptes:
    w(f"update public.profiles set telephone = {q(c['tel'])}, adresse = {q(str(random.randint(1, 120)) + ' rue ' + random.choice(['de la Paix','Victor Hugo','du Temple','de la République','Pasteur','des Lilas']))}, code_postal = {q(c['cp'])}, ville = {q(c['ville'])}, created_at = {d(c['inscr'])}, notifications_email = false where id = {q(c['id'])};")
w("")
w("-- 3. Abonnements")
for c in comptes:
    for a in c["abos"]:
        w(f"insert into public.abonnements (employeur_id, statut, quota_gestions, tarif_mensuel, date_debut, date_fin, motif_fin) values ({q(c['id'])}, {q(a['statut'])}, {a['quota']}, {a['tarif']:.2f}, {d(a['debut'])}, {d(a['fin']) if a['fin'] else 'null'}, {q('Fin de la garde') if a['statut']=='resilie' else 'null'});")
w("")
w("-- 4. Gestions (le cas « quota dépassé » est inséré sans le contrôle de quota)")
for c in comptes:
    if not c["abos"]:
        continue
    for g in c["gestions"]:
        contrat = ""
        cols = ""
        if g["contrat"]:
            tc = random.choice(["CDI", "CDI", "CDD"])
            h, u = random.choice([(20, "semaine"), (30, "semaine"), (40, "semaine"), (86.67, "mois"), (151.67, "mois")])
            cols = ", type_contrat, date_fin_prevue, heures, unite_heures, salaire_horaire_net, precisions"
            contrat = f", {q(tc)}, {d(g['debut'] + timedelta(days=180)) if tc=='CDD' else 'null'}, {h}, {q(u)}, {random.choice([11.88, 12.50, 13.00, 13.50, 14.20])}, {q(random.choice(['', 'Lundi au vendredi, sortie d école.', 'Garde partagée possible.', 'Mercredis et vacances scolaires.']))}"
        extra_cols = ""
        extra_vals = ""
        if g["statut"] == "envoyee":
            extra_cols += ", envoyee_le"; extra_vals += ", now() - interval '%d hours'" % random.randint(2, 72)
        if g.get("motif"):
            extra_cols += ", motif_retour"; extra_vals += ", " + q(g["motif"])
        if g["statut"] == "en_cours":
            extra_cols += ", validee_le"; extra_vals += ", " + d(g["debut"])
        insert = (f"insert into public.gestions (id, employeur_id, abonnement_id, type_gestion, prenom_salarie, nom_salarie, statut, date_debut, date_fin{cols}{extra_cols}) "
                  f"select {q(g['id'])}, {q(c['id'])}, a.id, {q(g['type'])}, {q(g['prenom'])}, {q(g['nom'])}, {q(g['statut'])}, {d(g['debut'])}, {d(g['fin']) if g['fin'] else 'null'}{contrat}{extra_vals} "
                  f"from public.abonnements a where a.employeur_id = {q(c['id'])} order by (a.statut = 'actif') desc limit 1;")
        if g.get("depasse"):
            w("alter table public.gestions disable trigger gestions_check_quota;")
            w(insert)
            w("alter table public.gestions enable trigger gestions_check_quota;")
        else:
            w(insert)
w("")
w("-- 5. Déclarations du mois et documents (fiches sans fichier PDF)")
w("-- Ordre : déclaration, puis bulletin du même mois (qui la marque « traitée »).")
for c in comptes:
    for g in c["gestions"]:
        if g["statut"] not in ("en_cours", "terminee"):
            for doc in g["docs"]:
                if doc["type"] == "contrat":
                    w(f"insert into public.documents (gestion_id, type_document, periode, titre, created_at, consulte_le) values ({q(g['id'])}, 'contrat', {q(doc['periode'])}, 'Contrat de travail', now(), null);")
            continue
        bull = {doc["periode"]: doc for doc in g["docs"] if doc["type"] == "bulletin"}
        for doc in g["docs"]:
            if doc["type"] != "bulletin":
                cons = "null" if random.random() < 0.3 else "now() - interval '%d days'" % random.randint(1, 300)
                per = q(doc["periode"]) if doc["periode"] else "null"
                w(f"insert into public.documents (gestion_id, type_document, periode, titre, created_at, consulte_le) values ({q(g['id'])}, {q(doc['type'])}, {per}, {q(doc['titre'])}, now() - interval '%d days', {cons});" % random.randint(1, 400))
        decl_par_mois = {x["periode"]: x for x in g["decls"]}
        mois = sorted(set(list(bull) + list(decl_par_mois)))
        for m in mois:
            x = decl_par_mois.get(m)
            if x and g["statut"] == "en_cours" and x["statut"] != "modification":
                w(f"insert into public.declarations_mensuelles (gestion_id, periode, heures, commentaire) values ({q(g['id'])}, {q(m)}, {x['heures'] if x['heures'] is not None else 'null'}, {q(random.choice(['', '', 'RAS', 'Une journée d absence le 14.', 'Heures supplémentaires le samedi 18.']))});")
            if m in bull:
                cons = "null" if (m == COURANT or random.random() < 0.15) else f"'20{m[:2]}-{m[2:]}-28'::date + interval '2 days'"
                cree = "now() - interval '2 hours'" if m == COURANT else f"'20{m[:2]}-{m[2:]}-28'"
                w(f"insert into public.documents (gestion_id, type_document, periode, titre, created_at, consulte_le) values ({q(g['id'])}, 'bulletin', {q(m)}, 'Bulletin de salaire', {cree}, {cons});")
            if x and x["statut"] == "modification":
                w("select set_config('app.demande_modification', 'oui', false);")
                w(f"insert into public.declarations_mensuelles (gestion_id, periode, statut, motif_modification, modification_demandee_le) values ({q(g['id'])}, {q(m)}, 'modification', {q(x['motif'])}, now() - interval '1 day');")
                w("select set_config('app.demande_modification', '', false);")
w("")
w("-- 6. Demandes d'avenant en attente")
for c in comptes:
    for a in c["avenants"]:
        objets = "array[" + ", ".join(q(o) for o in a["objets"]) + "]"
        w(f"insert into public.demandes_avenant (gestion_id, employeur_id, objets, date_effet, description, created_at) values ({q(a['gestion'])}, {q(c['id'])}, {objets}, {d(a['effet'])}, {q(a['desc'])}, now() - interval '%d hours');" % random.randint(3, 96))
w("")
w("""-- 7. Contrôle : nombre de comptes par catégorie (à comparer avec la page Administration)
select categorie, count(*) as comptes, sum(nb_actions) as actions
  from public.admin_comptes
 where email like '%@recette.invalid'
 group by categorie
 order by categorie;

commit;
""")
open(SORTIE, "w").write("\n".join(L))

# Résumé pour le rapport
from collections import Counter
print("comptes", len(comptes), Counter(c["profil"] for c in comptes))
print("gestions", Counter(g["statut"] for c in comptes for g in c["gestions"]))
print("avenants", sum(len(c["avenants"]) for c in comptes))
