"""
Fiche « Vos droits et avantages » à remettre par l'employeur à son salarié
(niveau 2 de la passerelle ASC / SPSTN / Ircem, décision du 23/10/2026).

Génère public/fiche-avantages-salarie.pdf (une page A4).
Usage : python3 outils/fiche-salarie/generer.py
Informations vérifiées le 23/10/2026 sur asc-loisirs-emploidomicile.fr,
spstn.org et ircem.com : à revérifier une fois par an (date en bas de page).
"""
from pathlib import Path
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, Frame, Table, TableStyle, Spacer
from reportlab.pdfgen import canvas

TEAL, VIOLET, JAUNE, GRIS, NOIR = (HexColor(c) for c in ("#376873", "#685c9b", "#f6ed78", "#7783a6", "#1c2e3e"))
VERIFIE = "23/10/2026"
SORTIE = Path(__file__).resolve().parents[2] / "public" / "fiche-avantages-salarie.pdf"

st_titre = ParagraphStyle("t", fontName="Helvetica-Bold", fontSize=19, leading=23, textColor=TEAL)
st_sous = ParagraphStyle("s", fontName="Helvetica", fontSize=10.5, leading=14, textColor=NOIR)
st_h = ParagraphStyle("h", fontName="Helvetica-Bold", fontSize=12.5, leading=16, textColor=VIOLET)
st_p = ParagraphStyle("p", fontName="Helvetica", fontSize=9.6, leading=13, textColor=NOIR)
st_c = ParagraphStyle("c", fontName="Helvetica-Bold", fontSize=9.6, leading=13, textColor=TEAL)
st_pied = ParagraphStyle("f", fontName="Helvetica", fontSize=7.5, leading=10, textColor=GRIS)

BLOCS = [
    (
        "Loisirs et vacances à prix réduits",
        "Les partenaires sociaux de votre métier ont créé pour vous une offre d'activités sociales et culturelles : "
        "réductions sur les vacances, les parcs de loisirs, les musées, le cinéma, les spectacles et le sport.",
        "Créez gratuitement votre compte avec votre adresse email et votre numéro de salarié Cesu ou Pajemploi "
        "(14 caractères, indiqué sur vos bulletins de salaire).",
        "asc-loisirs-emploidomicile.fr",
    ),
    (
        "Votre santé au travail",
        "Vous avez droit à un suivi par un professionnel de santé au travail, assuré depuis 2025 par le SPSTN, le "
        "service national des salariés des particuliers employeurs : une visite d'information et de prévention à "
        "l'embauche, une seule par type d'emploi même si vous avez plusieurs employeurs, souvent en téléconsultation. "
        "Le temps passé en visite vous est indemnisé.",
        "Vous ou votre employeur contactez le SPSTN pour lui donner vos coordonnées ; il vous convoque par email.",
        "spstn.org · 0 986 865 865 (prix d'un appel local)",
    ),
    (
        "Votre protection sociale : l'Ircem",
        "Retraite complémentaire (vos cotisations vous donnent des points Agirc-Arrco). Prévoyance : un complément "
        "aux indemnités de la Sécurité sociale en cas d'arrêt de travail (après 7 jours), des garanties en cas "
        "d'invalidité et de décès. Action sociale : des aides gratuites, sous conditions de ressources (imprévu, "
        "logement, santé, prévention, familles monoparentales).",
        "Créez votre espace client sur ircem.com (rubriques « Aides » et « Diagnostic d'aide sociale »).",
        "ircem.com · 0 980 980 990 (appel non surtaxé)",
    ),
]


def dessiner():
    SORTIE.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(SORTIE), pagesize=A4)
    c.setTitle("Vos droits et avantages de salarié du particulier employeur")
    c.setAuthor("Aide & Garde")
    largeur, hauteur = A4
    # Bandeau jaune de la charte
    c.setFillColor(JAUNE)
    c.rect(0, hauteur - 9 * mm, largeur, 9 * mm, stroke=0, fill=1)
    # Logo texte Aide&Garde
    c.setFont("Helvetica-Bold", 16)
    x, y = 18 * mm, hauteur - 24 * mm
    for txt, col in (("Aide", TEAL), ("&", HexColor("#d9c937")), ("Garde", VIOLET)):
        c.setFillColor(col)
        c.drawString(x, y, txt)
        x += c.stringWidth(txt, "Helvetica-Bold", 16)

    histoire = [
        Paragraph("Vos droits et avantages", st_titre),
        Spacer(1, 2 * mm),
        Paragraph(
            "Vous êtes salarié(e) d'un particulier employeur : garde d'enfants, aide à domicile, employé(e) de maison… "
            "Voici trois services auxquels vous avez droit et que l'on connaît trop peu.",
            st_sous,
        ),
        Spacer(1, 6 * mm),
    ]
    for i, (titre, texte, comment, contact) in enumerate(BLOCS, 1):
        contenu = [
            Paragraph(f"{i}. {titre}", st_h),
            Spacer(1, 1.5 * mm),
            Paragraph(texte, st_p),
            Spacer(1, 1.5 * mm),
            Paragraph(f"<b>Comment faire :</b> {comment}", st_p),
            Spacer(1, 1.5 * mm),
            Paragraph(contact, st_c),
        ]
        t = Table([[contenu]], colWidths=[largeur - 36 * mm])
        t.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), HexColor("#f1f1f1")),
                    ("LINEBEFORE", (0, 0), (0, -1), 3, TEAL),
                    ("LEFTPADDING", (0, 0), (-1, -1), 9),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
                ]
            )
        )
        histoire += [t, Spacer(1, 5 * mm)]

    histoire += [
        Spacer(1, 2 * mm),
        Paragraph(
            "Document d'information remis par votre employeur, préparé par Aide &amp; Garde, mandataire qui gère pour "
            "lui les formalités de votre emploi. Informations vérifiées le "
            f"{VERIFIE} sur les sites de ces organismes, seuls compétents pour vous renseigner sur vos droits. "
            "Aide &amp; Garde n'est pas partenaire commercial de ces organismes et n'a pas accès à vos comptes.",
            st_pied,
        ),
    ]
    Frame(18 * mm, 14 * mm, largeur - 36 * mm, hauteur - 44 * mm, showBoundary=0, leftPadding=0, rightPadding=0).addFromList(
        histoire, c
    )
    if histoire:
        raise SystemExit(f"Contenu trop long pour une page : {len(histoire)} éléments restants")
    c.showPage()
    c.save()
    print(f"Écrit : {SORTIE}")


if __name__ == "__main__":
    dessiner()
